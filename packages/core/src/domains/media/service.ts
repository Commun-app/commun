import { nanoid } from 'nanoid';
import { consola } from 'consola';
import { CommunError, ERR } from '../../common/errors/index.ts';
import type { StorageDriver } from '../../infrastructure/storage/index.ts';
import type { MediaRepository } from './repository.ts';
import type { Media } from './schema.ts';
import type { MediaFinalizeDto, MediaUpdateDto } from './dtos/index.ts';

/**
 * Closed allowlist — iso legacy (`png/jpg/webp/pdf`) plus office documents.
 * SVG deliberately excluded (XSS surface — review decision), never executables.
 */
export const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
]);

/** The 7 webp variants the legacy resize worker produced. */
const LEGACY_VARIANTS = [
  'webp-1800',
  'webp-1320',
  'webp-840',
  'webp-480',
  'webp-1320-thumb',
  'webp-840-thumb',
  'webp-480-thumb',
] as const;

const sanitizeFilename = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'file';

type MediaObjects = { original: string; variants: Record<string, string> };

/**
 * The media shape legacy clients consume: `objects` values are SIGNED URLs
 * (every legacy variant name points at the original until real resize lands).
 */
export interface LegacyMedia {
  _id: string;
  originalName: string;
  mime: string;
  metaData: Record<string, unknown> | null;
  objects: Record<string, string>;
}

/**
 * Media library — iso legacy flow: the API hands out a pre-signed S3 PUT URL
 * (`requestUpload`), the client uploads DIRECTLY to object storage, then
 * `finalize` verifies the object and records the row. Reads return SIGNED
 * URLs (iso legacy — clients display straight from the payload). Resize is
 * stubbed (legacy SQS had no worker left) — end of phase.
 */
export class MediaService {
  constructor(
    private readonly repository: MediaRepository,
    private readonly storage: StorageDriver,
  ) {}

  /** Step 1 (iso legacy `PUT /media/:org`): validate mime, hand out a pre-signed PUT URL (metaData attached to the object). */
  async requestUpload(
    filename: string,
    mime: string,
    metaData?: Record<string, string>,
  ): Promise<{ key: string; url: string }> {
    if (!ALLOWED_MIME.has(mime)) {
      throw new CommunError(ERR.INVALID_STATE, `type de fichier non autorisé: ${mime}`);
    }
    const key = `${nanoid(10)}/${sanitizeFilename(filename)}`;
    return { key, url: await this.storage.presignedPutUrl(key, mime, metaData) };
  }

  /** Step 2 (iso legacy `POST /media/:org`): confirm the S3 object, record the media row. */
  async finalize(input: MediaFinalizeDto, actorId?: string): Promise<Media> {
    const head = await this.storage.head(input.key);
    if (!head) {
      throw new CommunError(ERR.INVALID_STATE, `objet non trouvé sur le stockage: ${input.key}`);
    }
    const row = await this.repository.insert({
      filename: sanitizeFilename(input.filename),
      mime: input.mime,
      size: head.size,
      alt: input.alt ?? null,
      metaData: input.metaData ?? null,
      createdBy: actorId ?? null,
      updatedBy: actorId ?? null,
      objects: { original: input.key, variants: {} },
    });
    // TODO(fin de phase): produire réellement les variantes. Le legacy publiait
    // ces jobs sur SQS mais plus aucun worker n'écoute — stub assumé (review).
    consola.info(`[media] resize à implémenter pour ${row.id} (${LEGACY_VARIANTS.join(', ')})`);
    return row;
  }

  async list(): Promise<Media[]> {
    return this.repository.list();
  }

  /** List with `objects` resolved to signed URLs (iso legacy read shape). */
  async listResolved(): Promise<Array<Media & { objects: Record<string, string> }>> {
    const rows = await this.repository.list();
    return Promise.all(
      rows.map(async (row) => ({ ...row, objects: await this.signedObjects(row) })),
    );
  }

  /** One media with signed `objects` (iso legacy `GET /media/:org/:id`). */
  async get(id: string): Promise<Media & { objects: Record<string, string> }> {
    const row = await this.repository.findById(id);
    if (!row) throw new CommunError(ERR.NOT_FOUND, `média introuvable: ${id}`);
    return { ...row, objects: await this.signedObjects(row) };
  }

  async updateEditorial(id: string, input: MediaUpdateDto, actorId?: string): Promise<Media> {
    const updated = await this.repository.update(id, { ...input, updatedBy: actorId ?? null });
    if (!updated) throw new CommunError(ERR.NOT_FOUND, `média introuvable: ${id}`);
    return updated;
  }

  /** Delete the row AND every stored object (original + variants). */
  async remove(id: string): Promise<void> {
    const row = await this.repository.findById(id);
    if (!row) throw new CommunError(ERR.NOT_FOUND, `média introuvable: ${id}`);
    const objects = row.objects as MediaObjects;
    await this.storage.remove([objects.original, ...Object.values(objects.variants ?? {})]);
    await this.repository.delete(id);
  }

  /** Signed GET URL of a media's original object (null if the media is unknown). */
  async url(id: string): Promise<string | null> {
    const row = await this.repository.findById(id);
    if (!row) return null;
    return this.storage.url((row.objects as MediaObjects).original);
  }

  /**
   * Legacy media record for the public payloads (`fetchMediaRecords` /
   * `populateWysiwygMedia` parity): every legacy variant key points at the
   * signed original until real resize lands.
   */
  async toLegacyMedia(id: string): Promise<LegacyMedia | null> {
    const row = await this.repository.findById(id);
    if (!row) return null;
    const url = await this.storage.url((row.objects as MediaObjects).original);
    const objects: Record<string, string> = { original: url };
    for (const variant of LEGACY_VARIANTS) objects[variant] = url;
    return {
      _id: row.id,
      originalName: row.filename,
      mime: row.mime,
      metaData: row.metaData ?? null,
      objects,
    };
  }

  /**
   * Iso legacy `_parseRecursively` (content/deployment): walk any JSON value
   * and replace `_media:<id>` strings with the signed legacy media record.
   */
  async resolveMediaPlaceholders(node: unknown): Promise<unknown> {
    if (typeof node === 'string' && node.startsWith('_media:')) {
      return (await this.toLegacyMedia(node.slice('_media:'.length))) ?? node;
    }
    if (Array.isArray(node)) {
      return Promise.all(node.map((child) => this.resolveMediaPlaceholders(child)));
    }
    if (node !== null && typeof node === 'object') {
      const copy: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(node)) {
        copy[key] = await this.resolveMediaPlaceholders(value);
      }
      return copy;
    }
    return node;
  }

  private async signedObjects(row: Media): Promise<Record<string, string>> {
    const objects = row.objects as MediaObjects;
    const url = await this.storage.url(objects.original);
    const signed: Record<string, string> = { original: url };
    for (const [name, key] of Object.entries(objects.variants ?? {})) {
      signed[name] = await this.storage.url(key);
    }
    return signed;
  }
}

import { nanoid } from 'nanoid';
import { consola } from 'consola';
import { MediaNotFoundError, UnsupportedMimeError, UploadIncompleteError } from './errors.ts';
import type { StorageDriver } from '../../infrastructure/storage/index.ts';
import type { MediaRepository } from './repository.ts';
import type { Media } from './schema.ts';
import type { MediaFinalizeDto, MediaUpdateDto } from './dtos/index.ts';

/** Closed allowlist. SVG is excluded on purpose: it is an XSS surface. */
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

/**
 * Prefix of every media object. It separates them from the bucket's other uses,
 * chiefly the volume backups the host drops under `_backups/`.
 */
const MEDIA_PREFIX = 'medias/';

type MediaObjects = { original: string; variants: Record<string, string> };

/** The media shape existing clients consume: `objects` values are public URLs. */
export interface LegacyMedia {
  _id: string;
  id: string;
  originalName: string;
  mime: string;
  metaData?: Record<string, unknown>;
  objects: Record<string, string>;
}

/**
 * Media library. The API hands out a pre-signed PUT URL, the client uploads
 * DIRECTLY to storage, then `finalize` verifies the object and records the row.
 *
 * Writes stay signed; reads do not — objects under `medias/` are public.
 * Resizing is not implemented yet.
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
      throw new UnsupportedMimeError(`unsupported mime type: ${mime}`);
    }
    const key = `${MEDIA_PREFIX}${nanoid(10)}/${sanitizeFilename(filename)}`;
    return { key, url: await this.storage.presignedPutUrl(key, mime, metaData) };
  }

  /** Step 2 (iso legacy `POST /media/:org`): confirm the S3 object, record the media row. */
  async finalize(input: MediaFinalizeDto, actorId?: string): Promise<Media> {
    const head = await this.storage.head(input.key);
    if (!head) {
      throw new UploadIncompleteError(`object not found in storage: ${input.key}`);
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
    // TODO: actually produce the variants.
    consola.info(`[media] resize à implémenter pour ${row.id} (${LEGACY_VARIANTS.join(', ')})`);
    return row;
  }

  /**
   * In-process upload, for sync tasks: same flow, but the object is written
   * through the driver instead of a pre-signed URL.
   */
  async uploadDirect(
    filename: string,
    mime: string,
    body: Uint8Array,
    metaData?: Record<string, unknown>,
    actorId?: string,
  ): Promise<Media> {
    if (!ALLOWED_MIME.has(mime)) {
      throw new UnsupportedMimeError(`unsupported mime type: ${mime}`);
    }
    const key = `${MEDIA_PREFIX}${nanoid(10)}/${sanitizeFilename(filename)}`;
    await this.storage.put(key, body, mime);
    return this.finalize({ key, filename, mime, metaData }, actorId);
  }

  async list(): Promise<Media[]> {
    return this.repository.list();
  }

  /** List with `objects` resolved to their URLs (iso legacy read shape). */
  async listResolved(): Promise<Array<Media & { objects: Record<string, string> }>> {
    const rows = await this.repository.list();
    return Promise.all(rows.map(async (row) => ({ ...row, objects: await this.objectUrls(row) })));
  }

  /** One media with resolved `objects` (iso legacy `GET /media/:org/:id`). */
  async get(id: string): Promise<Media & { objects: Record<string, string> }> {
    const row = await this.repository.findById(id);
    if (!row) throw new MediaNotFoundError(`media not found: ${id}`);
    return { ...row, objects: await this.objectUrls(row) };
  }

  async updateEditorial(id: string, input: MediaUpdateDto, actorId?: string): Promise<Media> {
    const updated = await this.repository.update(id, { ...input, updatedBy: actorId ?? null });
    if (!updated) throw new MediaNotFoundError(`media not found: ${id}`);
    return updated;
  }

  /** Delete the row AND every stored object (original + variants). */
  async remove(id: string): Promise<void> {
    const row = await this.repository.findById(id);
    if (!row) throw new MediaNotFoundError(`media not found: ${id}`);
    const objects = row.objects as MediaObjects;
    await this.storage.remove([objects.original, ...Object.values(objects.variants ?? {})]);
    await this.repository.delete(id);
  }

  /** Public GET URL of a media's original object (null if the media is unknown). */
  async url(id: string): Promise<string | null> {
    const row = await this.repository.findById(id);
    if (!row) return null;
    return this.storage.url((row.objects as MediaObjects).original);
  }

  /** The media record public payloads carry, with its URLs resolved. */
  async toLegacyMedia(id: string): Promise<LegacyMedia | null> {
    const row = await this.repository.findById(id);
    if (!row) return null;
    const originalKey = (row.objects as MediaObjects).original;
    const originalUrl = await this.storage.url(originalKey);
    const objects: Record<string, string> = { original: originalUrl };
    // The 7 variant keys are OPTIMISTIC: they follow the naming a resize worker
    // would produce, but almost none of those objects exist — 506 out of 23 713
    // migrated objects, none at all for two clients. Any consumer putting them
    // in a `srcset` gets broken images, since a browser never falls back to
    // `src`. To revisit when resizing is actually implemented.
    const base = originalKey.match(/^(.*)-original\.[^.]+$/)?.[1];
    for (const variant of LEGACY_VARIANTS) {
      objects[variant] = base ? await this.storage.url(`${base}-${variant}.webp`) : originalUrl;
    }
    return {
      _id: row.id,
      id: row.id, // both spellings: existing clients read one or the other
      originalName: row.filename,
      mime: row.mime,
      // Omitted when absent, as the clients expect.
      ...(row.metaData ? { metaData: row.metaData } : {}),
      objects,
    };
  }

  /** Walks any JSON value, replacing `_media:<id>` strings with media records. */
  async resolveMediaPlaceholders(node: unknown): Promise<unknown> {
    const isPlaceholder = (v: unknown): v is string =>
      typeof v === 'string' && v.startsWith('_media:');
    // A `_media:` value — or an array of them — resolves to a FLAT array of records.
    const resolveList = async (ids: string[]): Promise<unknown[]> => {
      const records = await Promise.all(
        ids.map((v) => this.toLegacyMedia(v.slice('_media:'.length))),
      );
      return records.filter((record) => record !== null);
    };
    if (isPlaceholder(node)) return resolveList([node]);
    if (Array.isArray(node)) {
      if (node.length > 0 && node.every(isPlaceholder)) return resolveList(node as string[]);
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

  private async objectUrls(row: Media): Promise<Record<string, string>> {
    const objects = row.objects as MediaObjects;
    const url = await this.storage.url(objects.original);
    const urls: Record<string, string> = { original: url };
    for (const [name, key] of Object.entries(objects.variants ?? {})) {
      urls[name] = await this.storage.url(key);
    }
    return urls;
  }
}

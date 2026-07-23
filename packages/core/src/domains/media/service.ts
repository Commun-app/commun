import { nanoid } from 'nanoid';
import { consola } from 'consola';
import { CommunError, ERR } from '../../common/errors/index.ts';
import type { StorageDriver } from '../../infrastructure/storage/index.ts';
import type { MediaRepository } from './repository.ts';
import type { Media } from './schema.ts';
import type { MediaFinalizeDto, MediaUpdateDto } from './dtos/index.ts';

/** Closed allowlist: images, PDF and common office documents. Never executables. */
export const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
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
 * Media library — iso legacy flow: the API hands out a pre-signed S3 PUT URL
 * (`requestUpload`), the client uploads DIRECTLY to object storage, then
 * `finalize` verifies the object and records the row. Resize is stubbed for
 * now (the legacy published 7 webp variant jobs to SQS, but no worker listens
 * anymore) — to be implemented at the end of the phase.
 */
export class MediaService {
  constructor(
    private readonly repository: MediaRepository,
    private readonly storage: StorageDriver,
  ) {}

  /** Step 1 (iso legacy `PUT /media/:org`): validate the mime, hand out a pre-signed PUT URL. */
  async requestUpload(filename: string, mime: string): Promise<{ key: string; url: string }> {
    if (!ALLOWED_MIME.has(mime)) {
      throw new CommunError(ERR.INVALID_STATE, `type de fichier non autorisé: ${mime}`);
    }
    const key = `${nanoid(10)}/${sanitizeFilename(filename)}`;
    return { key, url: await this.storage.presignedPutUrl(key, mime) };
  }

  /** Step 2 (iso legacy `POST /media/:org`): confirm the S3 object, record the media row. */
  async finalize(input: MediaFinalizeDto): Promise<Media> {
    const head = await this.storage.head(input.key);
    if (!head) {
      throw new CommunError(ERR.INVALID_STATE, `objet non trouvé sur le stockage: ${input.key}`);
    }
    const row = await this.repository.insert({
      filename: sanitizeFilename(input.filename),
      mime: input.mime,
      size: head.size,
      alt: input.alt ?? null,
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

  async updateEditorial(id: string, input: MediaUpdateDto): Promise<Media> {
    const updated = await this.repository.update(id, input);
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
}

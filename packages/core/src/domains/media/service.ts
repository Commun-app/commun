import { nanoid } from 'nanoid';
import { consola } from 'consola';
import { CommunError, ERR } from '../../common/errors/index.ts';
import type { StorageDriver } from '../../infrastructure/storage/index.ts';
import type { MediaRepository } from './repository.ts';
import type { Media } from './schema.ts';

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB

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

/** Raster formats that get webp variants (svg and gif are kept as-is). */
const VARIANT_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const VARIANT_WIDTHS = [320, 768, 1280] as const;

const sanitizeFilename = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'file';

// sharp ships native binaries (@img/*) that break when inlined by the nitro
// bundler — the non-literal specifier forces a real runtime import resolved
// from node_modules (dev, e2e bundle and Docker image alike).
const SHARP_SPECIFIER = 'sharp';
const loadSharp = async () => (await import(SHARP_SPECIFIER)).default as typeof import('sharp').default;

export interface UploadInput {
  filename: string;
  mime: string;
  bytes: Uint8Array;
  alt?: string;
}

type MediaObjects = { original: string; variants: Record<string, string> };

/**
 * Media library: validated uploads, webp variants (internal async task — no
 * external queue), full cleanup on removal. Storage goes through the driver
 * abstraction (local disk or S3-compatible).
 */
export class MediaService {
  constructor(
    private readonly repository: MediaRepository,
    private readonly storage: StorageDriver,
  ) {}

  /** Validate and store an upload: original object first, media row second. */
  async upload(input: UploadInput): Promise<Media> {
    if (!ALLOWED_MIME.has(input.mime)) {
      throw new CommunError(ERR.INVALID_STATE, `type de fichier non autorisé: ${input.mime}`);
    }
    if (input.bytes.byteLength === 0 || input.bytes.byteLength > MAX_UPLOAD_BYTES) {
      throw new CommunError(
        ERR.INVALID_STATE,
        `taille de fichier invalide (max ${MAX_UPLOAD_BYTES / 1024 / 1024} Mo)`,
      );
    }

    const filename = sanitizeFilename(input.filename);
    const originalKey = `${nanoid(10)}/${filename}`;
    await this.storage.put(originalKey, input.bytes, input.mime);

    return this.repository.insert({
      filename,
      mime: input.mime,
      size: input.bytes.byteLength,
      alt: input.alt ?? null,
      driver: this.storage.kind,
      objects: { original: originalKey, variants: {} },
    });
  }

  /** Internal async task: derive webp variants and attach them to the media row. */
  async generateImageVariants(mediaId: string, bytes: Uint8Array): Promise<void> {
    const row = this.repository.findById(mediaId);
    if (!row || !VARIANT_MIME.has(row.mime)) return;

    const objects = row.objects as MediaObjects;
    const dir = objects.original.split('/')[0];
    try {
      const sharp = await loadSharp();
      for (const width of VARIANT_WIDTHS) {
        const variant = await sharp(bytes)
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        const key = `${dir}/variants/w${width}.webp`;
        await this.storage.put(key, new Uint8Array(variant), 'image/webp');
        objects.variants[`w${width}`] = key;
      }
      this.repository.update(mediaId, { objects });
    } catch (error) {
      // The original stays perfectly usable without variants — log, don't fail.
      consola.warn(`génération des variantes échouée pour ${mediaId}:`, error);
    }
  }

  list(): Media[] {
    return this.repository.list();
  }

  updateEditorial(id: string, input: { alt?: string | null; caption?: string | null; filename?: string }): Media {
    const updated = this.repository.update(id, input);
    if (!updated) throw new CommunError(ERR.NOT_FOUND, `média introuvable: ${id}`);
    return updated;
  }

  /** Delete the row AND every stored object (original + variants) — spec media-storage. */
  async remove(id: string): Promise<void> {
    const row = this.repository.findById(id);
    if (!row) throw new CommunError(ERR.NOT_FOUND, `média introuvable: ${id}`);
    const objects = row.objects as MediaObjects;
    await this.storage.remove([objects.original, ...Object.values(objects.variants ?? {})]);
    this.repository.delete(id);
  }

  /** Browser-loadable URL of a media's original object (signed for S3, API path for local). */
  async url(id: string): Promise<string | null> {
    const row = this.repository.findById(id);
    if (!row) return null;
    return this.storage.url((row.objects as MediaObjects).original);
  }

  readObject(key: string): Promise<Uint8Array | null> {
    return this.storage.get(key);
  }
}

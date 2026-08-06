import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { CoreEnv } from '../../common/env/index.ts';

/**
 * S3-compatible object storage is the only media backend (Scaleway, MinIO,
 * Garage…). The interface exists for test doubles, not for alternative
 * backends.
 */
export interface StorageDriver {
  /** Pre-signed URL for a direct client PUT. */
  presignedPutUrl(
    key: string,
    contentType: string,
    metadata?: Record<string, string>,
  ): Promise<string>;
  /** In-process upload, same destination as a pre-signed PUT. */
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  /** Object metadata if it exists (confirms an upload), null otherwise. */
  head(key: string): Promise<{ size: number } | null>;
  remove(keys: string[]): Promise<void>;
  /** URL a browser can load the object from: public under `medias/`, signed elsewhere. */
  url(key: string): Promise<string>;
}

export interface S3Config {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
}

/** Signed URLs now only cover WRITES and private objects. */
const SIGNED_URL_TTL_S = 7 * 24 * 3600;

/**
 * Prefix served publicly by the object storage (bucket policy). Everything else
 * stays private.
 *
 * These URLs are frozen into static builds, so they must never expire — and
 * serving them straight from storage keeps the instance out of the traffic path,
 * letting public sites survive a CMS outage.
 */
const PUBLIC_PREFIX = 'medias/';

/** Works with any S3-compatible endpoint: Scaleway Object Storage, MinIO, Garage… */
export class S3Storage implements StorageDriver {
  private readonly client: S3Client;

  constructor(private readonly config: S3Config) {
    this.client = new S3Client({
      region: config.region,
      ...(config.endpoint ? { endpoint: config.endpoint, forcePathStyle: true } : {}),
      credentials: { accessKeyId: config.accessKey, secretAccessKey: config.secretKey },
      // Depuis @aws-sdk/client-s3 3.729, le SDK ajoute par DÉFAUT un checksum
      // aux commandes — y compris aux URL PRÉSIGNÉES, où il cuit dans la
      // signature le crc32 d'un corps VIDE (`x-amz-checksum-crc32=AAAAAA==`).
      // Un PUT navigateur avec un vrai fichier est alors rejeté (403) par les
      // fournisseurs qui valident (Scaleway) — MinIO tolère, ce qui rendait
      // les E2E aveugles. Panne réelle : upload impossible dans l'admin
      // (Grigny, 06/08/2026). WHEN_REQUIRED = checksum seulement quand
      // l'opération l'exige, jamais implicite.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  presignedPutUrl(
    key: string,
    contentType: string,
    metadata?: Record<string, string>,
  ): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        ContentType: contentType,
        Metadata: metadata,
      }),
      { expiresIn: SIGNED_URL_TTL_S },
    );
  }

  async put(key: string, body: Uint8Array, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async head(key: string): Promise<{ size: number } | null> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.config.bucket, Key: key }),
      );
      return { size: result.ContentLength ?? 0 };
    } catch {
      return null;
    }
  }

  async remove(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.client.send(
      new DeleteObjectsCommand({
        Bucket: this.config.bucket,
        Delete: { Objects: keys.map((key) => ({ Key: key })) },
      }),
    );
  }

  url(key: string): Promise<string> {
    if (key.startsWith(PUBLIC_PREFIX)) return Promise.resolve(this.publicUrl(key));
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.config.bucket, Key: key }),
      {
        expiresIn: SIGNED_URL_TTL_S,
      },
    );
  }

  /** Direct URL, unsigned and non-expiring — see `PUBLIC_PREFIX`. */
  private publicUrl(key: string): string {
    const base = (this.config.endpoint ?? `https://s3.${this.config.region}.scw.cloud`).replace(
      /\/+$/,
      '',
    );
    // Encode each segment separately: `/` in the key is a path separator.
    const path = key.split('/').map(encodeURIComponent).join('/');
    return `${base}/${this.config.bucket}/${path}`;
  }
}

/** Build the storage driver from the parsed environment. */
export function createStorage(env: CoreEnv): StorageDriver {
  return new S3Storage({
    endpoint: env.COMMUN_S3_ENDPOINT || undefined,
    region: env.COMMUN_S3_REGION,
    bucket: env.COMMUN_S3_BUCKET,
    accessKey: env.COMMUN_S3_ACCESS_KEY,
    secretKey: env.COMMUN_S3_SECRET_KEY,
  });
}

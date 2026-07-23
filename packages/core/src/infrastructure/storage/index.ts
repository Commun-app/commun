import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CommunError, ERR } from '../../common/errors/index.ts';
import type { CoreEnv } from '../../common/env/index.ts';

/**
 * Media storage — iso legacy: S3-compatible object storage is the ONLY
 * backend (Scaleway, MinIO, Garage…). The interface exists for the
 * `unconfigured` explicit-failure driver and for test doubles, not for
 * alternative backends.
 */
export interface StorageDriver {
  readonly kind: 's3' | 'unconfigured';
  /** Pre-signed URL for a direct client PUT of the object. */
  presignedPutUrl(key: string, contentType: string): Promise<string>;
  /** Object metadata if it exists (used to confirm an upload), null otherwise. */
  head(key: string): Promise<{ size: number } | null>;
  remove(keys: string[]): Promise<void>;
  /** Time-limited signed GET URL a browser can load the object from. */
  url(key: string): Promise<string>;
}

export interface S3Config {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
}

const SIGNED_URL_TTL_S = 3600;

/** Works with any S3-compatible endpoint: Scaleway Object Storage, MinIO, Garage… */
export function createS3Storage(config: S3Config): StorageDriver {
  const client = new S3Client({
    region: config.region,
    ...(config.endpoint ? { endpoint: config.endpoint, forcePathStyle: true } : {}),
    credentials: { accessKeyId: config.accessKey, secretAccessKey: config.secretKey },
  });

  return {
    kind: 's3',
    presignedPutUrl: (key, contentType) =>
      getSignedUrl(
        client,
        new PutObjectCommand({ Bucket: config.bucket, Key: key, ContentType: contentType }),
        { expiresIn: SIGNED_URL_TTL_S },
      ),
    async head(key) {
      try {
        const result = await client.send(
          new HeadObjectCommand({ Bucket: config.bucket, Key: key }),
        );
        return { size: result.ContentLength ?? 0 };
      } catch {
        return null;
      }
    },
    async remove(keys) {
      if (keys.length === 0) return;
      await client.send(
        new DeleteObjectsCommand({
          Bucket: config.bucket,
          Delete: { Objects: keys.map((key) => ({ Key: key })) },
        }),
      );
    },
    url: (key) =>
      getSignedUrl(client, new GetObjectCommand({ Bucket: config.bucket, Key: key }), {
        expiresIn: SIGNED_URL_TTL_S,
      }),
  };
}

const unconfigured = (): never => {
  throw new CommunError(
    ERR.INVALID_STATE,
    'stockage S3 non configuré — renseignez COMMUN_S3_BUCKET / COMMUN_S3_ACCESS_KEY / COMMUN_S3_SECRET_KEY',
  );
};

/** S3 when fully configured; otherwise every media operation fails explicitly. */
export function createStorage(env: CoreEnv): StorageDriver {
  if (env.COMMUN_S3_BUCKET && env.COMMUN_S3_ACCESS_KEY && env.COMMUN_S3_SECRET_KEY) {
    return createS3Storage({
      endpoint: env.COMMUN_S3_ENDPOINT || undefined,
      region: env.COMMUN_S3_REGION,
      bucket: env.COMMUN_S3_BUCKET,
      accessKey: env.COMMUN_S3_ACCESS_KEY,
      secretKey: env.COMMUN_S3_SECRET_KEY,
    });
  }
  return {
    kind: 'unconfigured',
    presignedPutUrl: unconfigured,
    head: unconfigured,
    remove: unconfigured,
    url: unconfigured,
  };
}

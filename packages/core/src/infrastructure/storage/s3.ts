import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageDriver } from './types.ts';

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
        const result = await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }));
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

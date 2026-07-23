import type { CoreEnv } from '../../common/env/index.ts';
import { createLocalStorage } from './local.ts';
import { createS3Storage } from './s3.ts';
import type { StorageDriver } from './types.ts';

export type { StorageDriver } from './types.ts';
export { createLocalStorage } from './local.ts';
export { createS3Storage, type S3Config } from './s3.ts';

/** Driver selection: S3 when fully configured, local disk otherwise. */
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
  return createLocalStorage(env.COMMUN_DATA_DIR);
}

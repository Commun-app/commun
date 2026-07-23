import { CommunError, ERR } from '../../common/errors/index.ts';
import type { CoreEnv } from '../../common/env/index.ts';
import { createS3Storage } from './s3.ts';
import type { StorageDriver } from './types.ts';

export type { StorageDriver } from './types.ts';
export { createS3Storage, type S3Config } from './s3.ts';

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

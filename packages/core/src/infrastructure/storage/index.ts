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
 * Media storage — iso legacy: S3-compatible object storage is the ONLY
 * backend (Scaleway, MinIO, Garage…). L'interface subsiste pour les doubles
 * de test, pas pour des backends alternatifs.
 *
 * FAIL-FAST (revue PR #1, 28/07) : sans configuration S3 complète, le boot
 * échoue — plus de driver « unconfigured » qui échoue à l'usage.
 */
export interface StorageDriver {
  /** Pre-signed URL for a direct client PUT (metadata attached, iso legacy). */
  presignedPutUrl(
    key: string,
    contentType: string,
    metadata?: Record<string, string>,
  ): Promise<string>;
  /** Direct in-process upload (tâches de sync) — même destination que les PUT pré-signés. */
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  /** Object metadata if it exists (used to confirm an upload), null otherwise. */
  head(key: string): Promise<{ size: number } | null>;
  remove(keys: string[]): Promise<void>;
  /** URL a browser can load the object from (public under `medias/`, signed elsewhere). */
  url(key: string): Promise<string>;
}

export interface S3Config {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
}

// Durée de vie des URLs signées, qui ne servent plus qu'à l'ÉCRITURE (upload
// direct depuis l'admin) et aux objets privés.
const SIGNED_URL_TTL_S = 7 * 24 * 3600;

/**
 * Préfixe servi en lecture publique par le stockage objet (bucket policy posée
 * par `infra/set-bucket-policy.py`). Tout le reste du bucket — `_seed/`,
 * `_backup/` — demeure privé.
 *
 * Pourquoi les médias ne sont plus signés (31/07) : le legacy signait ses URLs
 * de lecture pour 7 jours, or elles sont FIGÉES dans un site statique. Un site
 * non reconstruit pendant une semaine perdait toutes ses images — le cron de
 * déploiement quotidien masquait la panne en permanence. Ces médias sont de
 * toute façon publics (ils sont sur le site public d'une commune) : les servir
 * directement supprime la péremption, raccourcit les URLs de ~470 à ~100
 * caractères, et garde le stockage objet — et non l'instance — dans le chemin
 * du trafic, pour que les sites survivent à une panne du CMS.
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

  /** URL directe, sans signature ni expiration — voir `PUBLIC_PREFIX`. */
  private publicUrl(key: string): string {
    const base = (this.config.endpoint ?? `https://s3.${this.config.region}.scw.cloud`).replace(
      /\/+$/,
      '',
    );
    // Chaque segment est encodé séparément : les `/` de la clé sont des
    // séparateurs de chemin, pas des caractères à échapper.
    const path = key.split('/').map(encodeURIComponent).join('/');
    return `${base}/${this.config.bucket}/${path}`;
  }
}

/** Construit le storage depuis l'env — jette au BOOT si incomplet (fail-fast). */
export function createStorage(env: CoreEnv): StorageDriver {
  if (!env.COMMUN_S3_BUCKET || !env.COMMUN_S3_ACCESS_KEY || !env.COMMUN_S3_SECRET_KEY) {
    throw new Error(
      'stockage S3 non configuré — renseignez COMMUN_S3_BUCKET / COMMUN_S3_ACCESS_KEY / COMMUN_S3_SECRET_KEY (le serveur refuse de démarrer sans)',
    );
  }
  return new S3Storage({
    endpoint: env.COMMUN_S3_ENDPOINT || undefined,
    region: env.COMMUN_S3_REGION,
    bucket: env.COMMUN_S3_BUCKET,
    accessKey: env.COMMUN_S3_ACCESS_KEY,
    secretKey: env.COMMUN_S3_SECRET_KEY,
  });
}

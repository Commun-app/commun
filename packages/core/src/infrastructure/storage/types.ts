/**
 * Media storage abstraction — iso legacy: S3-compatible object storage is the
 * ONLY backend (Scaleway, MinIO, Garage…). The upload flow is the legacy one:
 * the API hands out a pre-signed PUT URL, the client uploads DIRECTLY to S3,
 * then finalizes. `unconfigured` is the explicit-failure driver used when the
 * COMMUN_S3_* variables are absent.
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

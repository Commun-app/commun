/**
 * Storage abstraction of the media library (spec media-storage): one
 * interface, two drivers — `local` (instance disk, zero dependency, the
 * self-hosting default) and `s3` (any S3-compatible endpoint: Scaleway,
 * MinIO, Garage…). The driver is chosen from env at composition time.
 */
export interface StorageDriver {
  readonly kind: 'local' | 's3';
  put(key: string, data: Uint8Array, contentType: string): Promise<void>;
  /** Byte payload, or null when the object is missing. Used by the local serving route. */
  get(key: string): Promise<Uint8Array | null>;
  remove(keys: string[]): Promise<void>;
  /** URL a browser can load the object from (time-limited signed URL for s3, API path for local). */
  url(key: string): Promise<string>;
}

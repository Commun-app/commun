import type { CommunEditorMedia } from '@commun/editor'

/**
 * Media domain composable: tRPC calls plus the direct-to-S3 upload step.
 *
 * Resolution is shared app-wide (module cache) and bounded: a rich document
 * resolves every media on mount, and hundreds of concurrent requests freeze
 * the page. Failures are not cached — they retry on next mount.
 */

const FETCH_CONCURRENCY = 6

const mediaCache = new Map<string, Promise<{ src?: string; title?: string }>>()
let inFlight = 0
const waiters: Array<() => void> = []

async function withSlot<T>(task: () => Promise<T>): Promise<T> {
  while (inFlight >= FETCH_CONCURRENCY) {
    await new Promise<void>((resolve) => waiters.push(resolve))
  }
  inFlight += 1
  try {
    return await task()
  } finally {
    inFlight -= 1
    waiters.shift()?.()
  }
}

export default function useMedia() {
  const trpc = useTrpc()

  /** Presigned browser PUT. The Content-Type must match the presign. */
  const uploadToS3 = async (url: string, file: File) => {
    await $fetch.raw(url, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    })
  }

  /**
   * Full upload flow. The node id is the FINAL media id returned by
   * finalize — the presign key is only a transient identifier.
   */
  const upload = async (file: File) => {
    const filename = file.name || 'fichier'
    const { key, url } = await trpc.media.requestUpload.mutate({
      filename,
      mime: file.type,
    })
    await uploadToS3(url, file)
    const media = await trpc.media.finalize.mutate({ key, filename, mime: file.type })
    const resolved = await trpc.media.get.query({ id: media.id })
    return {
      id: resolved.id,
      src: resolved.objects?.original,
      title: resolved.filename ?? filename,
    }
  }

  const resolve = async ({ id }: { id: string }) => {
    if (!mediaCache.has(id)) {
      mediaCache.set(
        id,
        withSlot(async () => {
          const media = await trpc.media.get.query({ id })
          return { src: media?.objects?.original, title: media?.filename }
        }).catch((error) => {
          mediaCache.delete(id)
          throw error
        }),
      )
    }
    return mediaCache.get(id)!
  }

  /** The upload/resolve pair in the shape the editor extensions expect. */
  const forEditor = (): CommunEditorMedia => ({ upload, fetch: resolve })

  return { upload, resolve, forEditor }
}

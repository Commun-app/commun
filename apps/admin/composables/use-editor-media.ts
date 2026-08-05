import type { CommunEditorMedia } from '~/editor/schema'

/**
 * Contrat de médias de l'éditeur (refonte-admin-ui, 2.9) — première brique de
 * la nouvelle couche données : tRPC direct + $fetch natif, ni axios ni
 * pinia-orm. Reprend à l'identique la mécanique éprouvée d'input-wysiwyg :
 *
 * - upload : URL S3 pré-signée (`media.requestUpload`) → PUT du fichier →
 *   `media.finalize` — l'id DÉFINITIF du nœud est celui du média créé, la
 *   clé de presign n'est qu'un identifiant transitoire ;
 * - résolution : chaque nœud file/image résout son média au montage. Cache
 *   PARTAGÉ entre tous les éditeurs (dédoublonnage) et concurrence plafonnée
 *   à 6 — un document riche (arrêtés municipaux : ~700 PDF) déclencherait
 *   autant d'appels simultanés et gèlerait la page. Un échec n'est PAS mis
 *   en cache : nouvelle tentative au montage suivant.
 */

const FETCH_CONCURRENCY = 6

// État module : partagé entre tous les éditeurs montés, survit aux remounts.
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

export default function useEditorMedia(): CommunEditorMedia {
  const trpc = useTrpc()

  const upload: NonNullable<CommunEditorMedia['upload']> = async (file) => {
    const { name, type: mime } = file
    const { key, url } = await trpc.media.requestUpload.mutate({
      filename: name || 'fichier',
      mime,
    })
    // PUT direct vers S3 — $fetch natif, le Content-Type doit être celui
    // annoncé au presign.
    await $fetch.raw(url, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': mime },
    })
    const media = await trpc.media.finalize.mutate({
      key,
      filename: name || 'fichier',
      mime,
    })
    // Relecture résolue : objects.original est une URL publique, pas une clé.
    const resolved = await trpc.media.get.query({ id: media.id })
    return {
      id: resolved.id,
      src: resolved.objects?.original,
      title: resolved.filename ?? name,
    }
  }

  const fetchMedia: NonNullable<CommunEditorMedia['fetch']> = async ({ id }) => {
    if (!mediaCache.has(id)) {
      mediaCache.set(
        id,
        withSlot(async () => {
          const media = await trpc.media.get.query({ id })
          return { src: media?.objects?.original, title: media?.filename }
        }).catch((error) => {
          // Un échec ne doit pas empoisonner le cache.
          mediaCache.delete(id)
          throw error
        }),
      )
    }
    return mediaCache.get(id)!
  }

  return { upload, fetch: fetchMedia }
}

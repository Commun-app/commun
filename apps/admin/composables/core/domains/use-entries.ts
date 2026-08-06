import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, unref, type MaybeRef } from 'vue'

/**
 * Entries domain composable. Keys: ['entries', collectionId] for lists,
 * ['entries', 'byId', id] for one entry; a write invalidates its
 * collection's prefix so every list refreshes without hand-kept keys.
 * Rich content travels as ProseMirror OBJECTS end to end.
 */
export default function useEntries() {
  const trpc = useTrpc()
  const queryClient = useQueryClient()

  const invalidateCollection = (collectionId: string) => {
    queryClient.invalidateQueries({ queryKey: ['entries', collectionId] })
    queryClient.invalidateQueries({ queryKey: ['entries', 'byId'] })
  }

  const list = (
    collectionId: MaybeRef<string>,
    options: MaybeRef<{ skip?: number; limit?: number }> = {},
  ) =>
    useQuery({
      queryKey: computed(() => ['entries', unref(collectionId), unref(options)]),
      queryFn: () =>
        trpc.collections.entries.list.query({
          collectionId: unref(collectionId),
          ...unref(options),
        }),
      enabled: computed(() => Boolean(unref(collectionId))),
    })

  const get = (id: MaybeRef<string>) =>
    useQuery({
      queryKey: computed(() => ['entries', 'byId', unref(id)]),
      queryFn: () => trpc.collections.entries.get.query({ id: unref(id) }),
      enabled: computed(() => Boolean(unref(id))),
    })

  const create = () =>
    useMutation({
      mutationFn: (input: { collectionId: string; data: Record<string, unknown> }) =>
        trpc.collections.entries.create.mutate(input),
      onSuccess: (_result, { collectionId }) => invalidateCollection(collectionId),
    })

  const update = () =>
    useMutation({
      mutationFn: (input: { id: string; collectionId: string; data: Record<string, unknown> }) =>
        trpc.collections.entries.update.mutate({ id: input.id, data: input.data }),
      onSuccess: (_result, { collectionId }) => invalidateCollection(collectionId),
    })

  const remove = () =>
    useMutation({
      mutationFn: (input: { id: string; collectionId: string }) =>
        trpc.collections.entries.remove.mutate({ id: input.id }),
      onSuccess: (_result, { collectionId }) => invalidateCollection(collectionId),
    })

  return { list, get, create, update, remove, invalidateCollection }
}

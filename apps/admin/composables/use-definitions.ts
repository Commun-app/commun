import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { buildDataSchema, type FieldDefinition } from '@commun/core/collections/utils'
import { computed, unref, type MaybeRef } from 'vue'

/**
 * Collection-definition domain composable — the only data surface pages use.
 * Server state lives in the query cache; writes invalidate the
 * ['definitions'] prefix.
 */
export default function useDefinitions() {
  const trpc = useTrpc()
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['definitions'] })

  const list = () =>
    useQuery({
      queryKey: ['definitions'],
      queryFn: () => trpc.collections.list.query(),
    })

  const get = (idOrSlug: MaybeRef<string>) =>
    useQuery({
      queryKey: computed(() => ['definitions', unref(idOrSlug)]),
      queryFn: () => trpc.collections.get.query({ idOrSlug: unref(idOrSlug) }),
    })

  const create = () =>
    useMutation({
      mutationFn: (input: Record<string, unknown>) => trpc.collections.create.mutate(input),
      onSuccess: invalidate,
    })

  const update = () =>
    useMutation({
      mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
        trpc.collections.update.mutate({ id, data }),
      onSuccess: invalidate,
    })

  const remove = () =>
    useMutation({
      mutationFn: (id: string) => trpc.collections.remove.mutate({ id }),
      onSuccess: invalidate,
    })

  /**
   * Zod schema of an entry's data, generated from the definition — exactly
   * the rule the server applies. Pass as-is to a UForm `:schema`.
   */
  const dataSchema = (fields: MaybeRef<FieldDefinition[] | undefined>) =>
    computed(() => {
      const resolved = unref(fields)
      return resolved?.length ? buildDataSchema(resolved) : undefined
    })

  return { list, get, create, update, remove, dataSchema, invalidate }
}

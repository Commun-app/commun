import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { buildDataSchema, type FieldDefinition } from '@commun/core/fields'
import { computed, unref, type MaybeRef } from 'vue'

/**
 * Définitions de collections — composable de domaine (refonte-admin-ui, D5) :
 * la SEULE surface d'accès aux données des pages. État serveur dans le cache
 * de query, invalidation par préfixe ['definitions'].
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
   * Le schéma Zod des données d'une entrée, généré depuis la définition —
   * EXACTEMENT la règle que le serveur applique (D6) : à passer tel quel au
   * `:schema` d'un UForm, aucune règle réécrite côté admin.
   */
  const dataSchema = (fields: MaybeRef<FieldDefinition[] | undefined>) =>
    computed(() => {
      const resolved = unref(fields)
      return resolved?.length ? buildDataSchema(resolved) : undefined
    })

  return { list, get, create, update, remove, dataSchema, invalidate }
}

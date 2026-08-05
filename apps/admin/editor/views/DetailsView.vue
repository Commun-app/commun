<template>
  <NodeViewWrapper
    as="div"
    class="my-2 rounded-md border border-neutral-300 dark:border-neutral-700"
    :data-open="open || undefined"
  >
    <div class="flex items-start gap-1 p-2">
      <button
        type="button"
        contenteditable="false"
        class="mt-0.5 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
        :aria-expanded="open"
        aria-label="Déplier ou replier"
        @click="open = !open"
      >
        <UIcon
          name="iconoir:nav-arrow-right"
          class="size-4 transition-transform"
          :class="{ 'rotate-90': open }"
        />
      </button>
      <NodeViewContent class="details-body min-w-0 flex-1" :class="{ closed: !open }" />
    </div>
  </NodeViewWrapper>
</template>

<script setup>
// Accordéon (ex-TipTap Pro Details). L'état ouvert/replié est un état
// d'ÉDITION locale (ref), jamais écrit dans le document : l'attr `toggle`
// du contrat reste intact, et l'ouverture d'un accordéon ne mute rien (D9).
// Ouvert par défaut dans l'admin : un auteur doit voir ce qu'il édite.
import { ref } from 'vue'
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3'

defineProps(nodeViewProps)
const open = ref(true)
</script>

<style scoped>
/* Replié : seul le résumé (premier enfant) reste visible. */
.details-body.closed :deep(> div > [data-type='detailsContent']) {
  display: none;
}
</style>

<template>
  <NodeViewWrapper
    as="div"
    class="relative my-2 rounded-md border border-neutral-200 dark:border-neutral-800"
    :data-open="open || undefined"
  >
    <button
      type="button"
      contenteditable="false"
      class="absolute top-3 right-3 z-10 flex size-8 cursor-pointer items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black"
      :aria-expanded="open"
      aria-label="Déplier ou replier"
      @click="open = !open"
    >
      <UIcon :name="open ? 'iconoir:minus' : 'iconoir:plus'" class="size-4" />
    </button>
    <NodeViewContent
      class="details-body min-w-0 pr-14"
      :class="{ closed: !open }"
    />
  </NodeViewWrapper>
</template>

<script setup>
// Accordéon (ex-TipTap Pro Details) — affichage iso legacy : rangée bordée,
// bouton rond +/− à droite, FERMÉ par défaut. L'état ouvert/replié est un
// état d'ÉDITION local (ref), jamais écrit dans le document : l'attr
// `toggle` du contrat reste intact et l'ouverture ne mute rien (D9).
// Exception : un accordéon fraîchement inséré (vide) s'ouvre pour que
// l'auteur puisse écrire dedans.
import { ref } from 'vue'
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)
const open = ref(!props.node.textContent?.length)
</script>

<style scoped>
/* Replié : seul le résumé reste visible, où que soit le detailsContent
   dans le DOM rendu par NodeViewContent. */
.details-body.closed :deep([data-type='detailsContent']) {
  display: none;
}
</style>

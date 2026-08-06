<template>
  <NodeViewWrapper as="div" data-type="detailsContent">
    <NodeViewContent class="border-t border-neutral-100 px-4 py-3 dark:border-neutral-900" />
  </NodeViewWrapper>
</template>

<script setup>
// Corps de l'accordéon — blocs libres, accordéons imbriqués compris.
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3'

defineProps(nodeViewProps)
</script>

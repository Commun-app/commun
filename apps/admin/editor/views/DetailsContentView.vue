<template>
  <NodeViewWrapper as="div" data-type="detailsContent">
    <NodeViewContent class="mt-1 border-l border-neutral-200 pl-3 dark:border-neutral-800" />
  </NodeViewWrapper>
</template>

<script setup>
// Corps de l'accordéon — blocs libres, accordéons imbriqués compris.
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3'

defineProps(nodeViewProps)
</script>

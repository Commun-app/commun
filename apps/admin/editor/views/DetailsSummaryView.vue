<template>
  <NodeViewWrapper as="div">
    <NodeViewContent class="text-sm font-semibold" />
  </NodeViewWrapper>
</template>

<script setup>
// Titre de l'accordéon — contenu text* directement éditable.
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3'

defineProps(nodeViewProps)
</script>

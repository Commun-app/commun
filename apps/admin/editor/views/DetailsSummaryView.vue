<template>
  <NodeViewWrapper as="div">
    <NodeViewContent class="min-h-6 px-4 py-3 text-base" />
  </NodeViewWrapper>
</template>

<script setup>
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3'

defineProps(nodeViewProps)
</script>

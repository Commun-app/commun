<template>
  <NodeViewWrapper
    as="aside"
    class="my-2 flex items-start gap-3 rounded-md border border-neutral-300 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-900"
  >
    <UIcon
      :name="icon"
      class="mt-0.5 size-5 shrink-0 text-neutral-500"
    />
    <NodeViewContent class="min-w-0 flex-1" />
  </NodeViewWrapper>
</template>

<script setup>
// Encart d'information : icône + texte directement éditable (contenu text*).
import { computed } from 'vue'
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)

// En base : des noms Iconify complets (`iconoir:megaphone`, `lucide:bus`…,
// 30+ collections) — UIcon les accepte tels quels.
const icon = computed(() => props.node.attrs.icon || 'iconoir:megaphone')
</script>

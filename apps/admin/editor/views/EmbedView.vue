<template>
  <NodeViewWrapper
    as="div"
    class="my-2"
    :class="{ 'ring-2 ring-neutral-400': selected }"
  >
    <iframe
      v-if="node.attrs.src"
      :src="node.attrs.src"
      :title="node.attrs.title || node.attrs.service || 'embed'"
      :height="node.attrs.height || 315"
      :frameborder="node.attrs.frameborder"
      :allow="node.attrs.allow"
      :allowfullscreen="node.attrs.allowfullscreen"
      class="w-full rounded-md"
      sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-forms"
    />
    <div
      v-else
      class="flex items-center gap-3 rounded-md border border-dashed border-neutral-300 p-6 text-neutral-400"
    >
      <UIcon :name="node.attrs.icon || 'iconoir:code'" class="size-6" />
      <span class="text-sm">{{ node.attrs.placeholder || 'Intégration sans source' }}</span>
    </div>
  </NodeViewWrapper>
</template>

<script setup>
// Iframe de service externe. Le sandbox borne ce qu'un embed peut faire
// dans l'admin (l'éditeur affiche du contenu tiers) sans gêner YouTube,
// Maps ou Typeform.
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

defineProps(nodeViewProps)
</script>

<template>
  <NodeViewWrapper
    as="figure"
    class="my-2"
    :class="{ 'ring-2 ring-neutral-400': selected }"
  >
    <img
      v-if="src"
      :src="src"
      :alt="node.attrs.alt || ''"
      :title="title || undefined"
      class="max-w-full rounded-md"
      draggable="false"
    >
    <div
      v-else
      class="flex items-center gap-3 rounded-md border border-dashed border-neutral-300 p-6 text-neutral-400"
    >
      <UIcon name="iconoir:media-image" class="size-6" />
      <span class="text-sm">{{ resolving ? 'résolution…' : 'Image indisponible' }}</span>
    </div>
  </NodeViewWrapper>
</template>

<script setup>
// Same resolution contract as FileView: fetch on mount, attrs rewritten
// only when values actually differ.
import { computed, onMounted, ref } from 'vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)
const resolving = ref(false)
const resolved = ref(null)

const title = computed(() => resolved.value?.title ?? props.node.attrs.title)
const src = computed(() => resolved.value?.src ?? props.node.attrs.src)

onMounted(async () => {
  const { id } = props.node.attrs
  const fetch = props.extension.options.fetch
  if (!id || !fetch) return
  resolving.value = true
  try {
    const media = await fetch({ id })
    resolved.value = media
    const next = {}
    if (media?.src && media.src !== props.node.attrs.src) next.src = media.src
    if (media?.title && media.title !== props.node.attrs.title) next.title = media.title
    if (Object.keys(next).length) props.updateAttributes(next)
  } catch {
    // Stored attrs remain displayed; resolution retries on next mount.
  } finally {
    resolving.value = false
  }
})
</script>

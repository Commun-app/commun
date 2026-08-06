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
    <form
      v-else
      contenteditable="false"
      class="flex items-center gap-3 rounded-md border border-dashed border-neutral-300 p-4 text-neutral-400"
      @submit.prevent="applyUrl"
    >
      <UIcon :name="node.attrs.icon || 'iconoir:youtube'" class="size-6 shrink-0" />
      <UInput
        v-model="url"
        :placeholder="node.attrs.placeholder || 'Collez l’url de la vidéo…'"
        class="flex-1"
        size="sm"
      />
      <UButton type="submit" size="sm" color="neutral" variant="soft" :disabled="!url">
        Ajouter
      </UButton>
    </form>
  </NodeViewWrapper>
</template>

<script setup>
// The sandbox bounds third-party content. Without a source the node shows
// an URL form the author completes in place.
import { computed, ref } from 'vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { EMBED_SERVICES } from '@commun/editor'

const props = defineProps(nodeViewProps)
const url = ref('')
const service = computed(() => EMBED_SERVICES[props.node.attrs.service] ?? EMBED_SERVICES.video)

function applyUrl() {
  if (!url.value) return
  props.updateAttributes({ src: service.value.toSrc(url.value.trim()) })
}
</script>

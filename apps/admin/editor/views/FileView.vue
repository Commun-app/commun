<template>
  <NodeViewWrapper
    as="div"
    class="my-2 rounded-md border border-neutral-300 dark:border-neutral-700"
    :class="{ 'ring-2 ring-neutral-400': selected }"
  >
    <div class="flex items-center gap-3 p-3">
      <UIcon name="iconoir:page" class="size-6 shrink-0 text-neutral-500" />
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium">{{ title || 'Fichier' }}</p>
        <p v-if="resolving" class="text-2xs text-neutral-400">résolution…</p>
      </div>
      <UButton
        v-if="isPdf && src"
        :icon="preview ? 'iconoir:eye-closed' : 'iconoir:eye'"
        variant="ghost"
        color="neutral"
        size="xs"
        :aria-label="preview ? 'Masquer l’aperçu' : 'Aperçu du PDF'"
        @click="preview = !preview"
      />
      <UButton
        v-if="src"
        :to="src"
        target="_blank"
        icon="iconoir:open-new-window"
        variant="ghost"
        color="neutral"
        size="xs"
        aria-label="Ouvrir le fichier"
      />
    </div>
    <!-- Aperçu PDF par la visionneuse NATIVE du navigateur (D12) : zéro
         dépendance — pdfjs-dist (~1 Mo) n'est pas embarqué. -->
    <embed
      v-if="preview && isPdf && src"
      :src="src"
      type="application/pdf"
      class="h-96 w-full rounded-b-md"
    >
  </NodeViewWrapper>
</template>

<script setup>
// Fichier joint. Résolution du média au montage via l'option `fetch` de
// l'extension (cache partagé + concurrence bornée, branchés par l'écran).
// Parité prose : le src résolu est réécrit dans les attrs — mais SEULEMENT
// s'il diffère, pour qu'un simple affichage ne mute jamais le document (D9).
import { computed, onMounted, ref } from 'vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)
const resolving = ref(false)
const resolved = ref(null)
const preview = ref(false)

const title = computed(() => resolved.value?.title ?? props.node.attrs.title)
const src = computed(() => resolved.value?.src ?? props.node.attrs.src)
const isPdf = computed(() =>
  /\.pdf($|\?)/i.test(src.value ?? '') || /\.pdf$/i.test(title.value ?? ''),
)

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
    // Échec de résolution : on affiche les attrs stockés, sans casser l'édition.
  } finally {
    resolving.value = false
  }
})
</script>

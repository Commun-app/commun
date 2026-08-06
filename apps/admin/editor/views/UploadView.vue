<template>
  <NodeViewWrapper as="div" class="my-2">
    <UFileUpload
      v-model="file"
      label="Téléversez un fichier ou une image"
      description="Ou glissez-le directement dans l'éditeur"
      :preview="false"
      class="min-h-32"
    >
      <template #leading>
        <UAvatar
          :icon="loading ? 'iconoir:refresh' : 'iconoir:page'"
          size="xl"
          :ui="{ icon: [loading && 'animate-spin'] }"
        />
      </template>
    </UFileUpload>
  </NodeViewWrapper>
</template>

<script setup>
// Uploads the picked file then swaps this placeholder for the real node.
import { ref, watch } from 'vue'
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)
const toast = useToast()
const file = ref(null)
const loading = ref(false)

watch(file, async (picked) => {
  if (!picked || loading.value) return
  loading.value = true
  const pos = props.getPos()
  try {
    const upload = props.extension.options.upload
    if (!upload) throw new Error('no upload handler')
    const { id, src, title } = await upload(picked)
    if (typeof pos !== 'number') return
    props.editor
      .chain()
      .focus()
      .deleteRange({ from: pos, to: pos + props.node.nodeSize })
      .insertContentAt(pos, {
        type: picked.type.startsWith('image/') ? 'image' : 'file',
        attrs: { id, src, title },
      })
      .run()
  } catch {
    toast.add({ title: `Téléversement échoué : ${picked.name}`, color: 'error' })
    if (typeof pos === 'number') {
      props.editor.chain().deleteRange({ from: pos, to: pos + props.node.nodeSize }).run()
    }
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <label v-if="label" :for="name" class="block text-2xs font-light tracking-wider text-gray-500 uppercase">
      {{ label }}
    </label>
    <UEditor
      v-slot="{ editor }"
      v-model="doc"
      :image="false"
      :mention="false"
      :starter-kit="communStarterKit"
      :extensions="extensions"
      :enable-content-check="true"
      :on-content-error="onContentError"
      :placeholder="placeHolder || 'Ecrivez le contenu ici'"
      :class="{ 'mt-1': !!label }"
      class="min-h-40 rounded-md border border-neutral-200 p-3 dark:border-neutral-800"
    >
      <div class="mb-2 flex flex-wrap items-center gap-1 border-b border-neutral-100 pb-2 dark:border-neutral-900">
        <UDropdownMenu :items="blockItems(editor)">
          <UButton
            label="Ajouter un bloc"
            icon="iconoir:plus-square"
            color="neutral"
            variant="soft"
            size="sm"
          />
        </UDropdownMenu>
        <USeparator orientation="vertical" class="mx-1 h-5" />
        <UEditorToolbar :editor="editor" />
      </div>
      <input
        ref="filePicker"
        type="file"
        multiple
        class="hidden"
        @change="onFilesPicked(editor, $event)"
      >
    </UEditor>
  </div>
</template>

<script setup>
// L'éditeur de contenu riche NOUVELLE GÉNÉRATION (refonte-admin-ui) :
// UEditor de Nuxt UI + le jeu d'extensions de parité + le contrat de médias
// (cache partagé, concurrence bornée). Remplace prose-editor dans
// input-wysiwyg une fois le harnais de conservation (groupe 3) vert.
//
// Contrat de valeur TOLÉRANT pour la transition : accepte l'objet ProseMirror
// (cible, D13) OU la chaîne JSON du contrat legacy — et émet DANS LE MÊME
// FORMAT que ce qu'il a reçu. L'adaptateur chaîne meurt avec models/_commun
// (groupe 5).
import { computed, ref, watch } from 'vue'
import {
  communExtensions,
  communStarterKit,
  sanitizeDoc,
  EMBED_VIDEO,
} from '~/editor'

const $emitters = defineEmits(['change'])
const $props = defineProps({
  label: { type: String, default: '' },
  name: { type: String, default: 'input' },
  placeHolder: { type: String, default: '' },
  value: { type: [String, Object], default: '' },
})

const media = useEditorMedia()
const extensions = communExtensions(media)
const toast = useToast()

// ── Contrat de valeur ───────────────────────────────────────────────────────
const receivedAsString = typeof $props.value === 'string'
const parse = (value) => {
  if (!value) return { type: 'doc', content: [] }
  const raw = typeof value === 'string' ? JSON.parse(value) : value
  return sanitizeDoc(raw)
}

const doc = ref(parse($props.value))

watch(doc, (next) => {
  $emitters('change', receivedAsString ? JSON.stringify(next) : next)
}, { deep: true })

// La valeur peut arriver après le montage (chargement de l'écran).
watch(() => $props.value, (next) => {
  const parsed = parse(next)
  if (JSON.stringify(parsed) !== JSON.stringify(doc.value)) doc.value = parsed
})

function onContentError({ error }) {
  // Jamais de perte silencieuse : l'auteur est prévenu qu'un contenu n'a pas
  // pu être chargé tel quel (spec admin-editor).
  toast.add({
    title: 'Contenu partiellement illisible',
    description: error?.message ?? String(error),
    color: 'error',
  })
}

// ── « Ajouter un bloc » — parité avec le menu de prose ──────────────────────
const filePicker = ref(null)

async function onFilesPicked(editor, event) {
  const files = [...(event.target.files ?? [])]
  event.target.value = ''
  for (const file of files) {
    try {
      const { id, src, title } = await media.upload(file)
      editor
        .chain()
        .focus()
        .insertContent({
          type: file.type.startsWith('image/') ? 'image' : 'file',
          attrs: { id, src, title },
        })
        .run()
    } catch {
      toast.add({ title: `Téléversement échoué : ${file.name}`, color: 'error' })
    }
  }
}

const blockItems = (editor) => [
  [
    { label: 'Texte', icon: 'iconoir:text', onSelect: () => editor.chain().focus().setParagraph().run() },
    ...[1, 2, 3].map((level) => ({
      label: `Titre ${level}`,
      icon: `iconoir:text-size`,
      onSelect: () => editor.chain().focus().toggleHeading({ level }).run(),
    })),
    { label: 'Liste à puces', icon: 'iconoir:list', onSelect: () => editor.chain().focus().toggleBulletList().run() },
    { label: 'Liste numérotée', icon: 'iconoir:numbered-list-left', onSelect: () => editor.chain().focus().toggleOrderedList().run() },
    { label: 'Citation', icon: 'iconoir:quote-message', onSelect: () => editor.chain().focus().toggleBlockquote().run() },
    { label: 'Séparateur', icon: 'iconoir:minus', onSelect: () => editor.chain().focus().setHorizontalRule().run() },
  ],
  [
    { label: 'Encart', icon: 'iconoir:megaphone', onSelect: () => editor.chain().focus().setCallout({ icon: 'iconoir:megaphone' }).run() },
    { label: 'Accordéon', icon: 'lucide:list-collapse', onSelect: () => editor.chain().focus().setDetails().run() },
    {
      label: 'Vidéo',
      icon: EMBED_VIDEO.icon,
      onSelect: () =>
        editor
          .chain()
          .focus()
          .setEmbed({
            service: EMBED_VIDEO.service,
            icon: EMBED_VIDEO.icon,
            placeholder: EMBED_VIDEO.placeholder,
            title: EMBED_VIDEO.title,
            height: EMBED_VIDEO.height,
          })
          .run(),
    },
    { label: 'Fichier ou image', icon: 'iconoir:page', onSelect: () => filePicker.value?.click() },
  ],
]
</script>

<template>
  <div>
    <label v-if="label" :for="name" class="block text-2xs font-light tracking-wider text-gray-500 uppercase">
      {{ label }}
    </label>
    <UEditor
      v-slot="{ editor, handlers }"
      v-model="doc"
      :image="false"
      :mention="false"
      :starter-kit="communStarterKit"
      :extensions="extensions"
      :handlers="customHandlers"
      :enable-content-check="true"
      :on-content-error="onContentError"
      :placeholder="placeHolder || 'Écrivez, tapez « / » pour les commandes…'"
      :class="{ 'mt-1': !!label }"
      class="min-h-40 rounded-md border border-neutral-200 px-10 py-3 dark:border-neutral-800"
    >
      <!-- Selection bubble: marks, alignment, link. -->
      <UEditorToolbar
        :editor="editor"
        :items="bubbleItems"
        layout="bubble"
        :should-show="({ editor: e, view, state }) => {
          if (e.isActive('image') || e.isActive('file') || e.isActive('embed')) return false
          return view.hasFocus() && !state.selection.empty
        }"
      >
        <template #link>
          <UPopover v-model:open="linkOpen">
            <UButton
              icon="iconoir:link"
              color="neutral"
              variant="ghost"
              size="sm"
              :active="editor.isActive('link')"
              aria-label="Lien"
              @click="linkUrl = editor.getAttributes('link').href ?? ''"
            />
            <template #content>
              <form class="flex items-center gap-2 p-2" @submit.prevent="applyLink(editor)">
                <UInput v-model="linkUrl" placeholder="https://…" size="sm" class="w-64" autofocus />
                <UButton type="submit" size="sm" color="neutral" label="OK" />
                <UButton
                  v-if="editor.isActive('link')"
                  size="sm"
                  color="neutral"
                  variant="ghost"
                  icon="iconoir:trash"
                  aria-label="Retirer le lien"
                  @click="removeLink(editor)"
                />
              </form>
            </template>
          </UPopover>
        </template>
      </UEditorToolbar>

      <!-- Slash commands: standard blocks plus ours. -->
      <UEditorSuggestionMenu :editor="editor" :items="slashItems" />

      <!-- Block handle: plus opens the slash menu, grip moves blocks. -->
      <UEditorDragHandle
        v-slot="{ ui, onClick }"
        :editor="editor"
        @node-change="selectedNode = $event"
      >
        <UButton
          icon="iconoir:plus"
          color="neutral"
          variant="ghost"
          size="sm"
          :class="ui.handle()"
          aria-label="Ajouter un bloc"
          @click="(e) => {
            e.stopPropagation()
            const selected = onClick()
            handlers.suggestion?.execute(editor, { pos: selected?.pos }).run()
          }"
        />
        <UDropdownMenu
          :modal="false"
          :items="blockMenuItems(editor)"
          :content="{ side: 'left' }"
          :ui="{ content: 'w-44' }"
          @update:open="editor.chain().setMeta('lockDragHandle', $event).run()"
        >
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            icon="iconoir:drag"
            :class="ui.handle()"
            aria-label="Déplacer le bloc"
          />
        </UDropdownMenu>
      </UEditorDragHandle>

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
// Rich-text input on UEditor with the parity extension set and the media
// contract (shared cache, bounded resolution). Editing surface is
// Notion-like: selection bubble, slash commands, per-block drag handle.
//
// TRANSITIONAL value contract: accepts the ProseMirror object (target) or
// the legacy stringified JSON, and emits IN THE SAME SHAPE it received —
// the string adapter dies with models/_commun.
import { ref, watch } from 'vue'
import { mapEditorItems } from '@nuxt/ui/utils/editor'
import { communExtensions, communStarterKit, sanitizeDoc, EMBED_VIDEO } from '~/editor'

const $emitters = defineEmits(['change'])
const $props = defineProps({
  label: { type: String, default: '' },
  name: { type: String, default: 'input' },
  placeHolder: { type: String, default: '' },
  value: { type: [String, Object], default: '' },
})

const media = useMedia()
const extensions = communExtensions(media.forEditor())
const toast = useToast()

// ── Value contract ──────────────────────────────────────────────────────────
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

watch(() => $props.value, (next) => {
  const parsed = parse(next)
  if (JSON.stringify(parsed) !== JSON.stringify(doc.value)) doc.value = parsed
})

function onContentError({ error }) {
  // Never a silent drop: the author is told when content cannot load as-is.
  toast.add({
    title: 'Contenu partiellement illisible',
    description: error?.message ?? String(error),
    color: 'error',
  })
}

// ── Custom handlers: our blocks, addressable from every menu ────────────────
const filePicker = ref(null)

const customHandlers = {
  callout: {
    canExecute: (editor) => editor.can().setCallout(),
    execute: (editor) => editor.chain().focus().setCallout({ icon: 'iconoir:megaphone' }),
    isActive: (editor) => editor.isActive('callout'),
  },
  details: {
    canExecute: (editor) => editor.can().setDetails(),
    execute: (editor) => editor.chain().focus().setDetails(),
    isActive: (editor) => editor.isActive('details'),
  },
  video: {
    canExecute: () => true,
    execute: (editor) =>
      editor.chain().focus().setEmbed({
        service: EMBED_VIDEO.service,
        icon: EMBED_VIDEO.icon,
        placeholder: EMBED_VIDEO.placeholder,
        title: EMBED_VIDEO.title,
        height: EMBED_VIDEO.height,
      }),
    isActive: (editor) => editor.isActive('embed'),
  },
  filePick: {
    canExecute: () => true,
    execute: (editor) => {
      filePicker.value?.click()
      return editor.chain()
    },
    isActive: () => false,
  },
}

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

// ── Menus ───────────────────────────────────────────────────────────────────
const bubbleItems = [
  [
    { kind: 'mark', mark: 'bold', icon: 'iconoir:bold-square-outline', tooltip: { text: 'Gras' } },
    { kind: 'mark', mark: 'italic', icon: 'iconoir:italic-square-outline', tooltip: { text: 'Italique' } },
  ],
  [{ slot: 'link', icon: 'iconoir:link' }],
  [
    { kind: 'textAlign', align: 'justify', icon: 'iconoir:align-justify', tooltip: { text: 'Justifié' } },
    { kind: 'textAlign', align: 'left', icon: 'iconoir:align-left', tooltip: { text: 'Aligné à gauche' } },
    { kind: 'textAlign', align: 'center', icon: 'iconoir:align-center', tooltip: { text: 'Centré' } },
    { kind: 'textAlign', align: 'right', icon: 'iconoir:align-right', tooltip: { text: 'Aligné à droite' } },
  ],
]

const slashItems = [
  [
    { type: 'label', label: 'Blocs de base' },
    { kind: 'paragraph', label: 'Texte', icon: 'iconoir:text', description: 'Écrivez du texte. Tout simplement' },
    { kind: 'heading', level: 1, label: 'Titre 1', icon: 'iconoir:text-size', description: 'Titre de grande taille' },
    { kind: 'heading', level: 2, label: 'Titre 2', icon: 'iconoir:text-size', description: 'Titre de taille moyenne' },
    { kind: 'heading', level: 3, label: 'Titre 3', icon: 'iconoir:text-size', description: 'Titre de petite taille' },
    { kind: 'bulletList', label: 'Liste à puces', icon: 'iconoir:list', description: 'Créez une liste à puces' },
    { kind: 'orderedList', label: 'Liste numérotée', icon: 'iconoir:numbered-list-left', description: 'Créez une liste numérotée' },
    { kind: 'blockquote', label: 'Citation', icon: 'iconoir:quote-message', description: 'Affichez une citation' },
    { kind: 'horizontalRule', label: 'Séparateur', icon: 'iconoir:minus', description: 'Séparez deux blocs' },
  ],
  [
    { type: 'label', label: 'Blocs riches' },
    { kind: 'callout', label: 'Encart', icon: 'iconoir:megaphone', description: 'Mettez une information en avant' },
    { kind: 'details', label: 'Accordéon', icon: 'lucide:list-collapse', description: 'Contenu repliable' },
    { kind: 'video', label: 'Vidéo', icon: EMBED_VIDEO.icon, description: 'Intégrez une vidéo YouTube' },
    { kind: 'filePick', label: 'Fichier ou image', icon: 'iconoir:page', description: 'Téléversez depuis votre poste' },
  ],
]

const selectedNode = ref()

const blockMenuItems = (editor) =>
  mapEditorItems(
    editor,
    [
      [
        { kind: 'moveUp', pos: selectedNode.value?.pos, label: 'Monter', icon: 'iconoir:arrow-up' },
        { kind: 'moveDown', pos: selectedNode.value?.pos, label: 'Descendre', icon: 'iconoir:arrow-down' },
        { kind: 'duplicate', pos: selectedNode.value?.pos, label: 'Dupliquer', icon: 'iconoir:copy' },
      ],
      [{ kind: 'delete', pos: selectedNode.value?.pos, label: 'Supprimer', icon: 'iconoir:trash' }],
    ],
    customHandlers,
  )

// ── Link popover ────────────────────────────────────────────────────────────
const linkOpen = ref(false)
const linkUrl = ref('')

function applyLink(editor) {
  const href = linkUrl.value.trim()
  if (href) {
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
  }
  linkOpen.value = false
}

function removeLink(editor) {
  editor.chain().focus().extendMarkRange('link').unsetLink().run()
  linkOpen.value = false
}
</script>

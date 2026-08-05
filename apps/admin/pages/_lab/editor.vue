<template>
  <div class="mx-auto max-w-4xl space-y-6 p-8">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold">
        Laboratoire UEditor — parité @poulpus/prose
      </h1>
      <UBadge :color="roundTripOk ? 'success' : 'error'" variant="subtle">
        {{ roundTripOk ? 'structure conservée' : 'STRUCTURE ALTÉRÉE' }}
      </UBadge>
    </div>

    <UAlert
      v-if="contentErrors.length"
      color="error"
      variant="subtle"
      title="Nœuds refusés par le schéma"
      :description="contentErrors.join(' · ')"
    />

    <UEditor
      v-slot="{ editor }"
      v-model="doc"
      :image="false"
      :mention="false"
      :extensions="extensions"
      :enable-content-check="true"
      :on-content-error="onContentError"
      placeholder="Le corps de l'éditeur…"
      class="min-h-64 rounded-md border border-neutral-300 p-4"
    >
      <UEditorToolbar :editor="editor" />
    </UEditor>

    <details class="text-xs">
      <summary class="cursor-pointer font-medium">JSON courant (sortie de l'éditeur)</summary>
      <pre class="mt-2 overflow-x-auto rounded bg-neutral-100 p-3 dark:bg-neutral-900">{{ JSON.stringify(doc, null, 2) }}</pre>
    </details>
    <details class="text-xs">
      <summary class="cursor-pointer font-medium">JSON d'origine (échantillon des bases clients)</summary>
      <pre class="mt-2 overflow-x-auto rounded bg-neutral-100 p-3 dark:bg-neutral-900">{{ JSON.stringify(SAMPLE, null, 2) }}</pre>
    </details>
  </div>
</template>

<script setup>
// Page LABORATOIRE (refonte-admin-ui, tâche 1.2) : l'UEditor de Nuxt UI face
// aux structures réelles des bases clients. C'est l'établi du groupe 2 — les
// extensions s'y branchent une à une jusqu'à ce que le badge reste vert.
// Dev seul : jamais atteignable en production.
definePageMeta({ auth: false })

if (!import.meta.dev) {
  await navigateTo('/', { replace: true })
}

// Échantillon calqué sur l'inventaire du 05/08 (types, attrs et marques
// relevés dans les 4 bases). Tout nœud non porté doit déclencher
// onContentError — jamais une perte silencieuse.
const SAMPLE = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 2, textAlign: 'left', uid: 'c3d13996-0170-4b13-9a17-2b5eb84400c4' },
      content: [{ type: 'text', text: 'Titre de section' }]
    },
    {
      type: 'paragraph',
      attrs: { textAlign: 'left', uid: '0d5b74a5-c4a5-4485-9d38-2c69e2d1c264' },
      content: [
        { type: 'text', text: 'Du texte ' },
        { type: 'text', marks: [{ type: 'bold' }], text: 'gras' },
        { type: 'text', text: ', de l’' },
        { type: 'text', marks: [{ type: 'italic' }], text: 'italique' },
        { type: 'text', text: ', un ' },
        {
          type: 'text',
          marks: [{ type: 'link', attrs: { href: 'https://exemple.fr', target: '_blank' } }],
          text: 'lien'
        },
        { type: 'text', text: ' et une ' },
        {
          type: 'text',
          marks: [{ type: 'textStyle', attrs: { color: '#e11d48' } }],
          text: 'couleur'
        },
        { type: 'text', text: '.' }
      ]
    },
    { type: 'paragraph', attrs: { textAlign: 'left', uid: '7c9e8b1a-2f3d-4e5a-8b6c-1d2e3f4a5b6c' }, content: [{ type: 'hardBreak' }] },
    {
      type: 'bulletList',
      attrs: { uid: '58e3399e-92e5-4a6a-b25a-039a4694e9e6' },
      content: [
        {
          type: 'listItem',
          attrs: { uid: 'f9dc0f8f-64f2-40bd-8827-d64ba9214d29' },
          content: [{ type: 'paragraph', attrs: { textAlign: 'left', uid: 'a1b2c3d4-0000-4000-8000-000000000001' }, content: [{ type: 'text', text: 'Premier item' }] }]
        }
      ]
    },
    {
      type: 'callout',
      attrs: { icon: 'info-circle', uid: 'a1b2c3d4-0000-4000-8000-000000000002' },
      content: [{ type: 'paragraph', attrs: { textAlign: 'left', uid: 'a1b2c3d4-0000-4000-8000-000000000003' }, content: [{ type: 'text', text: 'Un encart d’information.' }] }]
    },
    {
      type: 'file',
      attrs: {
        id: '64a1f2e3b4c5d6e7f8a9b0c1',
        src: 'https://bucket.exemple.fr/medias/document.pdf',
        title: 'document.pdf',
        alt: null,
        data: null,
        uid: 'a1b2c3d4-0000-4000-8000-000000000004'
      }
    },
    {
      type: 'image',
      attrs: {
        id: '64a1f2e3b4c5d6e7f8a9b0c2',
        src: 'https://bucket.exemple.fr/medias/photo.jpg',
        title: 'photo.jpg',
        alt: 'Une photo',
        data: null,
        uid: 'a1b2c3d4-0000-4000-8000-000000000005'
      }
    },
    {
      type: 'embed',
      attrs: {
        service: 'youtube',
        src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        title: null,
        icon: null,
        placeholder: null,
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
        allowfullscreen: true,
        frameborder: 0,
        height: 315
      }
    },
    {
      type: 'details',
      attrs: { toggle: true },
      content: [
        { type: 'detailsSummary', content: [{ type: 'text', text: 'Titre de l’accordéon' }] },
        {
          type: 'detailsContent',
          content: [{ type: 'paragraph', attrs: { textAlign: 'left', uid: 'a1b2c3d4-0000-4000-8000-000000000006' }, content: [{ type: 'text', text: 'Contenu replié.' }] }]
        }
      ]
    },
    { type: 'horizontalRule' },
    {
      type: 'blockquote',
      attrs: { uid: 'a1b2c3d4-0000-4000-8000-000000000007' },
      content: [{ type: 'paragraph', attrs: { textAlign: 'left', uid: 'a1b2c3d4-0000-4000-8000-000000000008' }, content: [{ type: 'text', text: 'Une citation.' }] }]
    }
  ]
}

const doc = ref(structuredClone(SAMPLE))
const contentErrors = ref([])

// Le futur jeu d'extensions de parité (groupe 2) se branche ici.
const extensions = []

function onContentError({ error }) {
  contentErrors.value.push(error?.message ?? String(error))
}

// Vert = l'aller-retour chargement → sortie n'a rien altéré (préfiguration
// du harnais D9). Rouge attendu tant que les nœuds custom ne sont pas portés.
const roundTripOk = computed(
  () => JSON.stringify(doc.value) === JSON.stringify(SAMPLE)
)
</script>

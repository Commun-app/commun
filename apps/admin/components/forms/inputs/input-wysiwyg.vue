<template>
  <div>
    <label :for="name" class="block text-2xs font-light tracking-wider text-gray-500 uppercase">
      {{ label }}
    </label>
    <prose-editor
      :value="value"
      :label="label"
      :place-holder="placeHolder"
      :class="{ 'mt-1': !!label }"
      :on-image-upload="_upload"
      :on-image-fetch="_fetch"
      :on-file-upload="_upload"
      :on-file-fetch="_fetch"
      @change="data = $event"
    />
  </div>
</template>

<script setup>
import axios from 'axios'
import { useWorkspaceStore } from '~/store/layout/workspace'

const workspaceStore = useWorkspaceStore()
const { Media } = useModels()

// Prepare $emitters
const $emitters = defineEmits(['change'])

// Prepare $props
const $props = defineProps({
  label: {
    type: String,
    default: ''
  },
  name: {
    type: String,
    default: 'input'
  },
  placeHolder: {
    type: String,
    default: ''
  },
  value: {
    type: String,
    default: ''
  }
})

// Prepare reactive data
const data = ref('')

const _upload = async (file) => {
  const { name, type: mime } = file

  // Request for S3 pre-signed url (le nom alimente la clé S3 côté Commun)
  const { _id, url } = await Media.getS3PreSignedUrl({ mime, name })

  // Put media on amazon S3
  await axios({
    method: 'PUT',
    url,
    data: file,
    headers: { 'Content-Type': mime }
  })

  // Inform object has been pushed — l'id DÉFINITIF est celui du média créé
  // (la clé S3 de presign n'est qu'un identifiant transitoire côté Commun).
  const data = await Media.create({ _id, mime, name })
  return { id: data._id, src: data.objects.original, title: name }
}
// Résolution des médias des nœuds fichier/image, BORNÉE (upgrade-admin-nuxt4) :
// chaque nœud prose résout son média au montage — un document riche (arrêtés
// municipaux : ~700 PDF) déclenchait autant d'appels simultanés et gelait la
// page. Cache partagé (dédoublonnage + réutilisation entre éditeurs) et
// concurrence plafonnée, sans changer le comportement unitaire.
const FETCH_CONCURRENCY = 6
const mediaCache = new Map()
let inFlight = 0
const waiters = []

const _withSlot = async (task) => {
  while (inFlight >= FETCH_CONCURRENCY) {
    await new Promise((resolve) => waiters.push(resolve))
  }
  inFlight += 1
  try {
    return await task()
  } finally {
    inFlight -= 1
    waiters.shift()?.()
  }
}

const _fetch = async (file) => {
  if (!mediaCache.has(file.id)) {
    mediaCache.set(file.id, _withSlot(async () => {
      const data = await Media.read(file.id, null, workspaceStore.workspaceId)
      return { src: data?.objects?.original, title: data?.name }
    }).catch((error) => {
      // Un échec ne doit pas empoisonner le cache (retente au prochain montage).
      mediaCache.delete(file.id)
      throw error
    }))
  }
  const resolved = await mediaCache.get(file.id)
  return { ...file, ...resolved }
}

// Prepare watchers
watch(
  () => $props.value,
  (newValue) => {
    data.value = newValue
  },
  { immediate: true }
)
watch(
  data,
  (newValue) => $emitters('change', newValue)
)
</script>


<style lang="css">
/* Placeholder (on every new line) */
/* .ProseMirror p.is-empty::before {
  content: attr(data-placeholder);
  float: left;
  color: #ced4da;
  pointer-events: none;
  height: 0;
} */
.ProseMirror-focused {
  outline: none;
}

.has-focus {
  border: none;
}

.ProseMirror p {
  color: #111827;
}

.ProseMirror mark {
  color: inherit;
}

.ProseMirror>*+* {
  margin-top: 0.5em;
}

.ProseMirror .is-empty::before {
  content: attr(data-placeholder);
  float: left;
  color: #adb5bd;
  pointer-events: none;
  height: 0;
}

.ProseMirror p.is-empty::before {
  content: attr(data-placeholder);
  float: left;
  color: #adb5bd;
  pointer-events: none;
  height: 0;
}

.prose :where(blockquote p:first-of-type):not(:where([class~="not-prose"] *))::before {
  content: none;
}

.ProseMirror .blockquote>p::after {
  content: none;
}

.ProseMirror .details {
  list-style: none;
  display: flex;
  color: #111827;
  margin: 0.5rem 0;
  margin-bottom: 1.25em;
  padding: 0.5rem;
}

.ProseMirror .callout {
  list-style: none;
  margin: 0.5rem 0;
  margin-bottom: 1.25em;
}

.ProseMirror .details>button {
  display: flex;
  cursor: pointer;
  background: transparent;
  border: none;
  padding: 0;
}

.ProseMirror .details>button::before {
  content: '\25B6';
  display: flex;
  justify-content: center;
  width: 1.5em;
  height: 1.5em;
}

.ProseMirror .details.is-open>button::before {
  content: '\25BC';
}

.ProseMirror .details>div {
  flex: 1 1 auto;
}

.ProseMirror .details :last-child {
  margin-bottom: 0;
}</style>



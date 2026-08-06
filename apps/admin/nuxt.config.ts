import { globSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// L'ESM de @vue/devtools-api vit uniquement dans le store isolé de Bun
// (node_modules/.bun/@vue+devtools-api@<version>) — introuvable par une
// résolution node classique depuis apps/admin.
const [devtoolsApiEsm] = globSync(
  fileURLToPath(new URL(
    '../../node_modules/.bun/@vue+devtools-api@*/node_modules/@vue/devtools-api/lib/esm/index.js',
    import.meta.url
  ))
)

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  app: {
    head: {
      link: [{
        href: 'https://api.tiles.mapbox.com/mapbox-gl-js/v2.9.2/mapbox-gl.css',
        rel: 'stylesheet'
      }],
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1'
    }
  },
  runtimeConfig: {
    public: {
      // Vide par défaut (image d'instance : admin et API MÊME origine, appels
      // relatifs `/api/trpc`) ; NUXT_ENV_API_URL reste prioritaire (dev, harness).
      apiURL: process.env.NUXT_ENV_API_URL ?? '',
      baseURL: process.env.NUXT_ENV_BASE_URL || 'http://localhost:3000',
      mapBoxToken: process.env.NUXT_ENV_MAPBOX_TOKEN,
    }
  },
  css: ['~/assets/css/main.css'],
  // Auth : plus de module — composable de session maison (use-session) +
  // middleware 00.auth.global, branchés sur les procédures tRPC auth.* (D7).
  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    '@pinia-orm/nuxt',
    '@vueuse/nuxt'
  ],
  vite: {
    resolve: {
      // Sous le layout node_modules de Bun, Vite retombe sur l'entrée CJS
      // (« does not provide an export named setupDevtoolsPlugin ») — on
      // force l'entrée ESM via un chemin ABSOLU (un remplacement contenant
      // la clé de l'alias boucle à l'infini → OOM).
      alias: {
        ...(devtoolsApiEsm ? { '@vue/devtools-api': devtoolsApiEsm } : {})
      },
      // TipTap ne supporte pas deux copies de ProseMirror dans le même
      // éditeur (« Adding different instances of a keyed plugin ») : le
      // store isolé de bun donne à @nuxt/ui SA copie de @tiptap/* (hash de
      // peers différent de la nôtre). On force une résolution unique.
      dedupe: [
        '@tiptap/core',
        '@tiptap/pm',
        '@tiptap/vue-3',
        'prosemirror-state',
        'prosemirror-model',
        'prosemirror-view',
        'prosemirror-transform'
      ]
    },
    // Le dedupe ci-dessus ne suffit pas seul : l'optimiseur (esbuild) IGNORE
    // resolve.dedupe et inline sa propre copie de @tiptap/core dans les
    // chunks pré-bundlés (@tiptap/starter-kit, etc.). On exclut tout @tiptap
    // du pré-bundle pour que la résolution dédupliquée s'applique.
    optimizeDeps: {
      exclude: [
        '@tiptap/core',
        '@tiptap/pm',
        '@tiptap/vue-3',
        '@tiptap/starter-kit',
        '@tiptap/markdown',
        '@tiptap/suggestion',
        '@tiptap/extension-bubble-menu',
        '@tiptap/extension-code',
        '@tiptap/extension-collaboration',
        '@tiptap/extension-details',
        '@tiptap/extension-drag-handle',
        '@tiptap/extension-drag-handle-vue-3',
        '@tiptap/extension-file-handler',
        '@tiptap/extension-floating-menu',
        '@tiptap/extension-highlight',
        '@tiptap/extension-horizontal-rule',
        '@tiptap/extension-image',
        '@tiptap/extension-link',
        '@tiptap/extension-list',
        '@tiptap/extension-mention',
        '@tiptap/extension-node-range',
        '@tiptap/extension-placeholder',
        '@tiptap/extension-text-align',
        '@tiptap/extension-text-style',
        '@tiptap/extension-typography',
        '@tiptap/extension-unique-id'
      ]
    },
    // optimizeDeps.esbuildOptions supprimé : Vite 8 optimise via Rolldown
    // (option dépréciée, cible moderne par défaut).
    build: {
      target: 'esnext'
    }
  }
})

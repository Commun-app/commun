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
      apiURL: process.env.NUXT_ENV_API_URL,
      baseURL: process.env.NUXT_ENV_BASE_URL || 'http://localhost:3000',
      mapBoxToken: process.env.NUXT_ENV_MAPBOX_TOKEN,
    }
  },
  modules: [
    '@nuxtjs/tailwindcss',
    '@sidebase/nuxt-auth',
    '@pinia/nuxt',
    '@pinia-orm/nuxt',
    '@vueuse/nuxt',
    '@poulpus/prose'
  ],
  // https://sidebase.io/nuxt-auth/v0.6/getting-started/quick-start
  // Auth branchée sur le plan tRPC du monolithe Commun : les procédures
  // auth.login / auth.me répondent dans l'enveloppe tRPC { result: { data } }.
  auth: {
    baseURL: `${process.env.NUXT_ENV_API_URL}/api/trpc`,
    provider: {
      type: 'local',
      endpoints: {
        signIn: { path: '/auth.login', method: 'post' },
        // signOut volontairement absent (iso legacy : déconnexion locale seule).
        getSession: { path: '/auth.me', method: 'get' }
      },
      pages: {
        login: '/'
      },
      token: {
        signInResponseTokenPointer: '/result/data/token',
        type: 'Bearer',
        headerName: 'Authorization'
      },
      sessionDataType: {
        data: 'json'
      }
    },
    globalAppMiddleware: {
      isEnabled: true,
      allow404WithoutAuth: true,
      addDefaultCallbackUrl: true
    }
  },
  vite: {
    resolve: {
      // Sous le layout node_modules de Bun, Vite retombe sur l'entrée CJS
      // (« does not provide an export named setupDevtoolsPlugin ») — on
      // force l'entrée ESM via un chemin ABSOLU (un remplacement contenant
      // la clé de l'alias boucle à l'infini → OOM).
      alias: {
        ...(devtoolsApiEsm ? { '@vue/devtools-api': devtoolsApiEsm } : {})
      }
    },
    optimizeDeps: {
      esbuildOptions: {
        target: 'esnext'
      }
    },
    build: {
      target: 'esnext'
    }
  }
})

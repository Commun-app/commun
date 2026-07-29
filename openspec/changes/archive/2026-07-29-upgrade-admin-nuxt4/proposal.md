## Why

La migration silencieuse des 4 clients (phase 3) exige un admin qui tourne sur une stack maintenue : Nuxt 3.10 et ses dépendances datées sont le dernier étage legacy du monorepo. La PR #3 de Dependabot a prouvé que l'admin actuel builde et tourne sous Nuxt 4.5 avec son layout v3 — mais elle a aussi révélé un bloquant (nuxt-auth 1.x force `credentials: 'include'`, notre CORS wildcard casse le login) et laissé un lock dégradé. Décision du 29/07 : **minimum absolu** — le strict nécessaire à la migration, la refonte de la couche données attend la phase 4.

## What Changes

- **Nuxt 3.10 → 4.5** + dépendances majeures (reprise des upgrades de la PR #3 Dependabot sur notre branche) : @sidebase/nuxt-auth 0.7→1.3, @vueuse 10→14, @casl/ability 6→7, pinia-orm 1→2, @pinia/nuxt 0.5→1.0, @iconify/vue 4→5, playwright 1.62 ; lock régénéré proprement (tokens registres privés requis — arbre prose préservé).
- **Fix CORS côté API** : reflet de l'origine + `Access-Control-Allow-Credentials` dans `apps/api/server/middleware/1.cors.ts` (les navigateurs refusent le wildcard en mode credentialed ; auth Bearer pure, aucun cookie serveur — politique identique « toute origine »).
- **Fix chemins d'assets** : `~/public/logo-*.svg` → `/logo-*.svg` (Vite 8/Rolldown ne résout plus l'ancien chemin).
- **Retrait de la machinerie multi-tenant** : segment de route `[workspace]`, middlewares `01.workspaces` / `02.workspace`, stores workspace — l'admin single-tenant vit à la racine des routes.
- **CONSERVÉS tels quels jusqu'à la phase 4** : `models/_factory` + pinia-orm 2, axios, CASL, luxon, @poulpus/prose (garde `hasProse`), écrans et parcours identiques.
- La PR #3 Dependabot sera fermée, remplacée par ce change.

## Capabilities

### New Capabilities

- `admin-app` : l'app d'administration — socle Nuxt 4, authentification par session Bearer via nuxt-auth (login/logout/récupération de session sur le plan tRPC), routage single-tenant sans segment d'organisation, parcours iso legacy.

### Modified Capabilities

- `api-server` : nouvelle exigence CORS — les réponses reflètent l'origine appelante avec credentials autorisés (requis par les fetches credentialed de nuxt-auth 1.x), en remplacement du wildcard.

## Impact

- `apps/admin` : package.json (versions majeures), nuxt.config, pages/layouts (retrait `[workspace]`), `pages/index.vue` (assets), stores/middlewares supprimés.
- `apps/api` : `server/middleware/1.cors.ts` (reflet d'origine + credentials).
- `bun.lock` : régénéré avec les tokens (étape Quentin) — vérification que l'arbre prose survit.
- E2E : la suite existante doit rester verte (elle couvre l'API) ; validation admin par parcours manuel écran par écran contre l'admin ISO gelé + smoke de login Playwright.
- Aucun changement dans `packages/core` hors CORS ; aucun changement de schéma DB.

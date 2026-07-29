# admin-app Specification

## Purpose
TBD - created by archiving change upgrade-admin-nuxt4. Update Purpose after archive.
## Requirements
### Requirement: Socle Nuxt 4

L'app d'administration SHALL builder et s'exécuter sur Nuxt 4.x avec ses dépendances majeures à jour (nuxt-auth 1.x, vueuse 14, CASL 7, pinia-orm 2, iconify 5), en conservant le layout Nuxt v3 (`srcDir` racine) et la garde `hasProse` (module optionnel absent sans tokens). Le lock SHALL préserver l'arbre `@poulpus/prose`.

#### Scenario: Build de production
- **WHEN** `nuxt build` s'exécute sur apps/admin
- **THEN** le build aboutit sans erreur sous Nuxt 4.x (avec ou sans prose installée)

#### Scenario: Lock sain
- **WHEN** le lockfile est régénéré avec les tokens des registres privés
- **THEN** l'arbre `@poulpus/prose`/tiptap-pro y figure toujours (aucun élagage façon Dependabot)

### Requirement: Authentification par session Bearer

L'admin SHALL s'authentifier via nuxt-auth (provider local) sur le plan tRPC : login `auth.login` (POST), session `auth.me` (GET), token Bearer porté par l'en-tête Authorization — aucun cookie de session. Le login SHALL fonctionner dans un navigateur (fetches credentialed de nuxt-auth 1.x compris).

#### Scenario: Connexion réussie
- **WHEN** un utilisateur saisit des identifiants valides sur l'écran de login
- **THEN** il est redirigé vers le tableau de bord et sa session est récupérable au rechargement de la page

#### Scenario: Identifiants invalides
- **WHEN** un utilisateur saisit des identifiants invalides
- **THEN** l'écran affiche l'échec et aucune session n'est créée

### Requirement: Routage single-tenant

Les écrans de l'admin SHALL vivre à la racine des routes, sans segment d'organisation : le segment `[workspace]`, les middlewares de résolution de workspace et les stores associés sont supprimés (l'instance EST l'organisation).

#### Scenario: Navigation sans segment d'organisation
- **WHEN** un utilisateur connecté navigue vers un écran (collections, médias, réglages…)
- **THEN** l'URL ne contient aucun slug d'organisation et l'écran fonctionne par accès direct (rechargement compris)

### Requirement: Parcours iso legacy

Les écrans et parcours SHALL rester fonctionnellement identiques à l'admin ISO gelé (référence) : mêmes écrans, mêmes actions, même couche données (`models/_factory`, pinia-orm, axios conservés jusqu'à la phase 4). Toute divergence fonctionnelle constatée lors de la passe de non-régression SHALL être traitée comme un défaut du change.

#### Scenario: Passe de non-régression
- **WHEN** la passe manuelle écran par écran est déroulée contre l'admin ISO gelé
- **THEN** aucune différence fonctionnelle n'est constatée (l'éditeur prose inclus, testé avec les tokens locaux)


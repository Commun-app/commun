## Context

L'admin (`apps/admin`) est le dernier étage sur stack datée : Nuxt 3.10, nuxt-auth 0.7, vueuse 10, CASL 6, pinia-orm 1. La PR #3 de Dependabot (mise de côté, à fermer) a servi de banc d'essai : l'admin **builde et tourne sous Nuxt 4.5.1 avec son layout v3** (pas de migration `app/` nécessaire), au prix de deux fixes (assets `~/public/`, CORS) — et son lock était dégradé (Dependabot sans tokens élague l'arbre `@poulpus/prose`). Le login est cassé par nuxt-auth 1.3 qui force `credentials: 'include'` (codé en dur dans son runtime, aucune option) face à notre `Access-Control-Allow-Origin: *`, interdit en mode credentialed par les navigateurs.

Décision de périmètre (29/07) : **minimum absolu** pour la migration silencieuse — la couche données (`models/_factory` → TanStack Query), Nuxt UI et tout le visible partent en phase 4.

## Goals / Non-Goals

**Goals:**
- Admin sur Nuxt 4.5 + dépendances majeures à jour, lock sain (arbre prose préservé).
- Login fonctionnel sous nuxt-auth 1.x (fix CORS credentialed côté API — vaut aussi pour la prod).
- Machinerie multi-tenant retirée (routes à la racine, middlewares/stores workspace supprimés).
- Parcours strictement iso legacy — l'admin ISO gelé est la référence écran par écran.

**Non-Goals:**
- Couche données : `models/_factory`, pinia-orm 2, axios RESTENT (phase 4).
- Nuxt UI, refonte visuelle, écrans générés, TipTap OSS (phase 4).
- Toute feature nouvelle ; tout changement d'API hors CORS.

## Decisions

**D1 — Upgrades rejoués sur notre branche, PR #3 fermée.** Dependabot a validé la faisabilité mais son lock est inutilisable (prose élaguée) et sa branche ne portera jamais les fixes. On rejoue les bumps dans le change, lock régénéré en local AVEC les tokens des registres privés (étape Quentin), diff du lock vérifié (l'arbre prose doit survivre).

**D2 — CORS : reflet d'origine + credentials, politique inchangée sur le fond.** `handleCors(event, { origin: () => true, credentials: true, … })` : toute origine reste acceptée (auth Bearer pure, aucun cookie de session côté serveur — le mode credentialed n'ouvre rien de plus), mais l'origine est REFLÉTÉE au lieu du wildcard, seule forme que les navigateurs acceptent avec `credentials: 'include'`. *Alternative écartée : liste blanche d'origines — de la config en plus pour un plan admin auto-hébergé dont l'origine varie par instance, sans bénéfice sécurité tant qu'aucun cookie n'existe.*

**D3 — Multi-tenant : suppression, pas d'aliasing.** Les pages remontent de `pages/[workspace]/…` à `pages/…`, les middlewares `01.workspaces`/`02.workspace` et les stores workspace disparaissent, les liens internes sont réécrits. Pas de redirection de compatibilité : l'admin n'est pas encore en prod chez les clients (la bascule d'URL se fera avec la migration), et les bookmarks legacy pointent sur l'ancien domaine de toute façon.

**D4 — Layout Nuxt v3 conservé (`srcDir` racine).** Nuxt 4 le supporte via son fallback ; la migration vers `app/` n'apporte rien de fonctionnel et grossirait le diff. Elle se fera en phase 4 avec la vraie refonte.

**D5 — Validation à trois étages.** (1) La suite E2E existante reste verte — elle couvre l'API, y compris un nouveau scénario CORS credentialed (spec `api-server`). (2) Smoke de login Playwright contre l'admin dev (le script de la PR #3 est intégré en script réutilisable, hors CI — l'admin n'est pas dans la CI, décision existante). (3) Passe manuelle écran par écran contre l'admin ISO gelé, dont un test de l'éditeur prose sous Nuxt 4 (compatibilité NON testée à ce jour — `@nuxt/kit ^3.8` en peer) : nécessite `TIPTAP_PRO_TOKEN` en local, étape Quentin.

## Risks / Trade-offs

- [Prose incompatible Nuxt 4] → seul vrai inconnu (peer `@nuxt/kit ^3.8`). Test manuel précoce (D5.3) ; si casse : options = pin d'une version, patch local, ou vivre sans WYSIWYG jusqu'à la phase 4 (TipTap OSS) — décision Quentin le cas échéant.
- [Régression silencieuse d'un écran] → référence ISO gelée + passe manuelle systématique ; la couche données inchangée limite drastiquement la surface.
- [Lock encore dégradé] → régénération avec tokens + vérification `git diff` de l'arbre prose avant commit (procédure documentée, piège connu).
- [pinia-orm 2 : breaking changes runtime] → la PR #3 a déjà validé boot + build ; la passe manuelle couvre les écrans qui consomment les stores.

## Migration Plan

1. Merge → rien côté instances (changement front + un header CORS).
2. Le fix CORS bénéficie immédiatement à tout client de l'API ; aucun impact sur les builds Vercel existants (fetch server-side sans Origin).
3. Rollback : revert du merge (aucune migration de données).

## Open Questions

- Aucune — le périmètre est verrouillé (minimum absolu, décision 29/07).

# Roadmap — commun.app

> **Vision** : CMS open source (AGPL v3) pour les communes françaises de 500 à 5 000 habitants.
> Auto-hébergeable gratuitement, disponible en SaaS managé souverain, avec IA intégrée (Mistral).
> Concurrent visé : mairie.app — différenciation par l'IA (conseils municipaux, délibérations + votes,
> budgets), la transparence et les remontées citoyennes.
>
> **Stack** : Bun · TypeScript · Nitro v3 · Nuxt 4 + Nuxt UI · tRPC 11 · Drizzle + SQLite (bun:sqlite) · Mistral (Voxtral)
> **Architecture** : single-tenant — une instance = une collectivité (sa DB SQLite, son S3, son conteneur).

**Contexte (27/07/2026)** : Poulpus (société d'origine) est en cessation d'activité, clients alertés,
maintenance minimale assurée. Commun est la relance — solo dev + IA — ET la porte de sortie digne des
clients existants : instances souveraines, récupérables par une agence ou un développeur.

**Séquence actée (27/07/2026)** : socle complet → refonte *basique* de l'admin (stack moderne,
fonctions identiques) → **migration silencieuse** des clients (ils ne voient que des changements d'UI
minuscules) → amélioration de l'admin (UI prête pour l'IA) → thème + cache/ISR → information officielle
des clients + open source → modèle économique + nouvelles features. Rien de réécrit deux fois ; le
chemin legacy (sites Vercel + plan REST golden-testé) reste le filet jusqu'à preuve du remplaçant.

---

## Phase 1 — Socle complet *(~90 % fait, reste ~1-2 semaines)*

**Objectif : le monolithe tient la prod des 4 clients, jobs compris.**

- [x] Monorepo Bun : `packages/core` (collections dynamiques, users, médias, tokens), `apps/api` Nitro v3 (tRPC admin + REST legacy-compat), auth Bearer, docker-compose, CI
- [x] Migrateur dump Mongo → SQLite : **0 diff vs prod sur les 4 orgs** (golden test), users avec mots de passe fonctionnels, tokens API, statuts éditoriaux, purge des seeds
- [x] Admin legacy branché tRPC single-tenant, stabilisé sur les retours de test (statuts, auteur, dates, nav single-tenant)
- [ ] **Jobs → Nitro tasks** (inventaire fait — 2 jobs seulement, GitHub Actions ; décisions en attente : mystère grigny, pipelines cmar-paca dormants, Slack, fix lng/lat) :
  - deploy quotidien + à la demande (GET hook Vercel — trivial, branche le bouton Publier)
  - data-sync ot-pertuis (seul injector ACTIF : 2 pipelines APIDAE unlink + 1 Airtable) — moteur de mapping porté tel quel, I/O via services directs (fin du JWT forgé `@changeme` et des écritures Mongo directes)
  - ordonnancement corrigé : sync PUIS deploy (le legacy déployait avant la sync)
- [x] Emails transactionnels Loops (invitations ; « mot de passe oublié »)
- [x] Passe sécurité de base (rate limiting, headers) — le legacy exposé n'est plus touché
- [ ] Revue E2E Quentin + couverture minimum vital ; clôture OpenSpec

**Critère de sortie** : une instance vit une semaine sans intervention (contenus, jobs, sites publiés).

---

## Phase 2 — Refonte basique de l'admin *(~2-3 semaines)*

**Objectif : stack modernisée, fonctions et UI quasi IDENTIQUES — condition de la migration silencieuse.**

Périmètre STRICT (le reste attend la phase 4) :
- [ ] Nuxt 3.10 → Nuxt 4, dépendances à jour (`@nuxt/icon`, `@nuxt/fonts`)
- [ ] Couche données : `models/_factory` → composables par domaine + TanStack Query (pinia-orm retiré ; état serveur = cache de query) ; `useAsyncData`/`useQuery` remplacent les middlewares prefetch/headings ; axios → `$fetch`
- [ ] Machinerie multi-tenant retirée (segment `[workspace]`, middlewares 01/02, stores workspace)
- [ ] CASL et luxon conservés ; @poulpus/prose conservé PROVISOIREMENT (remplacé en phase 4, bloquant pour l'open source, pas pour la migration)
- [ ] Non-régression : l'admin ISO gelé sert de référence écran par écran

**Critère de sortie** : mêmes parcours qu'aujourd'hui, base de code moderne, aucun changement visible notable.

---

## Phase 3 — Migration silencieuse des clients 🎯 *(~2-3 semaines)*

**Objectif : les 4 clients tournent sur Commun sans s'en apercevoir.**

- [ ] Infra Scaleway tout-en-un : un VPS mutualisé, un conteneur par client (API + admin statique), un bucket S3 par client (copie server-side intra-région), backup SQLite quotidien → S3
- [ ] Les sites publics RESTENT sur Vercel (plan REST legacy-compat golden-testé) — aucune refonte de thème requise pour basculer
- [ ] Bascule site par site (CMAR → Grigny → LCSS → Pertuis), double-run legacy en lecture seule, DNS
- [ ] Décommission du legacy (microservices, framework maison, jobs GitHub Actions, Mongo)

**Critère de sortie** : 4 clients en prod sur Commun, plateforme legacy éteinte, zéro ticket client lié à la bascule.

---

## Phase 4 — Amélioration de l'admin *(~3-4 semaines)*

**Objectif : l'UI prête à accueillir les usages IA.**

- [ ] Nuxt UI v4 (Tailwind 4, `useToast`…) — la refonte visuelle, maintenant que la bascule est faite
- [ ] **@poulpus/prose → TipTap open source** (préalable open source ; format ProseMirror conservé, uids préservés via extension maison)
- [ ] Écrans générés depuis les définitions de collections ; écran métier délibérations (séances + votes par élu)
- [ ] Emplacements copilote IA prévus dans l'UI (panneau, actions contextuelles) — sans l'IA elle-même
- [ ] **Fusion admin + API dans une seule app Nuxt** (un dev server, un build, un artefact — port h3 v2→v1 si Nuxt n'a pas rejoint Nitro v3)
- [ ] PWA + CLI d'instance open source (`admin:create`, `backup`, `restore`, `migrate`)

---

## Phase 5 — Thème & rendu incrémental *(~3-4 semaines)*

**Objectif : tuer le cycle « édition → hook Vercel → full rebuild » (lent, mémoivore).**

- [ ] `packages/theme-base` : app Nuxt 4 **SSR + cache de routes sur l'instance** (ISR/SWR Nitro) — une page se rend à la première visite, servie du cache ensuite ; **publier = invalider des clés** (v1 : purge complète, largement suffisante à l'échelle d'une commune). Plus de build, plus de Vercel
- [ ] Le site public est une **app séparée de l'admin/API** (décision 27/07) : une commune peut avoir N sites (mairie, cinéma…) partageant un seul espace d'admin — co-localisés sur l'instance via compose, multi-domaines
- [ ] Design tokens (couleurs, logo, typo) + blocs contraints v1 (rendu des `_pages` migrées) puis v2 (éditeur de blocs dans l'admin)
- [ ] RGAA AA dans la layer ; consolidation des ~81 % de composants communs aux thèmes legacy
- [ ] Bascule des 4 sites Vercel vers le rendu sur instance, un par un

---

## Phase 6 — Information clients, structure & open source *(~2 semaines, ∥ phase 5)*

- [ ] Communication officielle aux clients : stratégie, possibilités (rester sur le SaaS relancé, partir avec leur instance), conditions
- [ ] Structure juridique : nouvelle société ou continuité Poulp'us (décision Quentin + Benoit) ; contrats, RGPD, sous-traitance hébergement
- [ ] Repo public AGPL (possible seulement après la sortie de prose) : org GitHub, Discussions, CONTRIBUTING, hygiène open source
- [ ] Site vitrine commun.app

---

## Phase 7 — Modèle économique & nouvelles features *(~6-8 semaines)*

- [ ] **IA** : transcription conseils (Voxtral) → structuration (délibérations, votes par élu, quorum) → CR réglementaire relu dans l'admin ; copilote rédaction ; copilote d'agencement de pages (blocs JSON validés Zod)
- [ ] **Transparence** : délibérations + votes publiés, budgets, bilans (mensuels/annuels/mandat)
- [ ] **Citoyens** : remontées d'informations synthétisées pour la commune ; participation
- [ ] Crédits IA (comptage, packs), facturation puis Chorus Pro
- [ ] Control plane SaaS (codebase séparée propriétaire, n'importe jamais `@commun/core` — frontière AGPL) : provisioning Dokploy `slug.commun.app`
- [ ] Prospection relancée : petites communes uniquement, **plus de marchés publics**

---

## Phase 8 — Lancement *(continu)*

- [ ] Recherche concurrentielle documentée (mairie.app en premier, Sites Faciles, Publik, WeDelib, LaPageLocale…)
- [ ] Subventions (ANCT, DINUM, NLnet, Banque des Territoires), partenariat Mistral, AMF, civic tech
- [ ] Programme pilote 5-10 communes (les clients migrés = références)

---

## Horizon lointain (non planifié)

- Apps dédiées élus / citoyens (le site public en PWA couvre le cas citoyen d'abord)
- Forum communautaire type Discourse (pertinent à ~20-30 communes)
- Marketplace de thèmes labellisés « RGAA vérifié » (si une communauté existe)

---

## Modèle économique *(vision actée juillet 2026)*

**Open core** : le CMS complet est AGPL v3 et auto-hébergeable gratuitement ; les revenus viennent du cloud managé, de l'IA à l'usage et des services — pas du code. (Modèle WordPress.org / WordPress.com.)

### SaaS managé (abonnement annuel, Chorus Pro)

| Plan | Prix | Inclus |
|---|---|---|
| Essentiel | ~200 €/an | Hébergement FR, mises à jour auto, support email |
| Pro | ~400 €/an | + Chorus Pro, RGAA AA, modules avancés |
| Coopératif | ~600 €/an | + Vote roadmap, accès bêta, support téléphone |

### IA à l'usage (crédits, Mistral)

Transcription des conseils (Voxtral) + structuration (délibérations, votes, quorum) + compte-rendu réglementaire + copilote rédaction. Un conseil complet ≈ 60 crédits ; coût réel Mistral ≈ 0,50 € → marge ×4 à ×6.

| Pack | Prix | Crédits |
|---|---|---|
| Starter | 10 € | 100 (~2 conseils) |
| Commune | 25 € | 300 (~6 conseils) |
| Annuel S | 80 €/an | 1 200 |
| Annuel M | 180 €/an | 3 000 |

### Autres sources

Services pro (intégration, formation, migration, audit RGAA, thèmes dédiés) · subventions (ANCT, DINUM, Banque des Territoires, NLnet) · co-financement coopératif de la roadmap.

### Infra cible (SaaS)

Une instance = un conteneur Nitro + Garage S3 (Deuxfleurs, AGPL) + SQLite ≈ 100 MB RAM → 60-80 instances par VPS ≈ 6 €/mois, soit **~0,08 €/instance/mois** pour ~20 €/mois facturés. Provisioning automatisé par le control plane via l'API Dokploy (project.create → compose.create → domain.create SSL → deploy → `slug.commun.app`), cycle de vie piloté par la facturation. (Pour la migration des 4 clients — phase 3 — l'infra est plus simple : Scaleway VPS + Object Storage, pas encore de Dokploy/Garage.)

### Pourquoi l'open source ne cannibalise pas

Les mairies ne s'auto-hébergent pas ; l'IA est cloud par nature (pas de clé Mistral hors commun.app) ; la moat est opérationnelle (confiance, souveraineté, services), pas dans le code. Créneau sans concurrent direct : open source + CMS moderne + délibérations + transcription IA au prix des petites communes.

---

## Vue synthétique

| # | Phase | Durée | Fin estimée* |
|---|---|---|---|
| 1 | Socle complet (jobs, Loops, sécurité, E2E) | 1-2 sem | mi-août 2026 |
| 2 | Refonte basique admin (stack moderne, iso-fonctions) | 2-3 sem | début sept. |
| 3 | **Migration silencieuse des 4 clients** 🎯 | 2-3 sem | fin sept. |
| 4 | Amélioration admin (Nuxt UI, TipTap OSS, IA-ready) | 3-4 sem | fin oct. |
| 5 | Thème + cache/ISR sur instance (fin de Vercel) | 3-4 sem | fin nov. |
| 6 | Info clients + structure société + open source | 2 sem (∥ 5) | nov. |
| 7 | IA + transparence + citoyens + crédits + control plane | 6-8 sem | jan.-fév. 2027 |
| 8 | Lancement + subventions + pilote | continu | 2027 → |

*\*Solo avec assistance IA, imprévus inclus.*

## Décisions actées

- **Séquence hybride 27/07/2026** : migration silencieuse APRÈS refonte basique (stack moderne, fonctions identiques) ; améliorations visibles et thème APRÈS la bascule
- **Rendu des sites : SSR + cache sur l'instance** (ISR/invalidation par clé, v1 = purge à la publication) — le cycle build Vercel disparaît en phase 5 ; d'ici là les sites Vercel restent le filet
- **Fusion admin + API** en une app Nuxt (phase 4) ; **le site public reste une app SÉPARÉE** : multi-site possible (une commune, N sites, un seul admin) — co-localisation via compose
- Collections dynamiques = outillage interne (jeu de types fermé, Zod/TS, exploitable par l'IA) ; les objets à valeur légale/IA (délibérations, votes, budgets) auront des **domaines typés dédiés**, pas des collections génériques
- @poulpus/prose : conservé pour la migration silencieuse, remplacé par TipTap OSS en phase 4 — **bloquant pour l'open source** (registres privés, licence Pro)
- Jobs : transplant direct en Nitro tasks (pas d'adaptation intermédiaire) ; seul ot-pertuis a un injector actif
- Infra migration : Scaleway tout-en-un (VPS mutualisé + Object Storage fr-par), backup SQLite → S3 ; Dokploy/Garage = cible SaaS
- Deux CLIs : CLI d'instance open source ; control plane propriétaire séparé (n'importe jamais `@commun/core`)
- Single-tenant ; multi-organisation INTRA-tenant (une org = un site) = évolution future préparée (CASL conservé), pas construite maintenant
- Le legacy (Poulpus) n'est plus touché ; cessation d'activité en cours, structure juridique à trancher avec Benoit (phase 6)
- RGAA dans le socle gratuit ; Voxtral (pas Whisper OpenAI) ; blocs contraints Zod (GrapesJS écarté) ; CASL et luxon conservés
- Pas d'app native (PWA d'abord) ; plus de marchés publics — petites communes uniquement

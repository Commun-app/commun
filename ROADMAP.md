# Roadmap — commun.app

> **Vision** : CMS open source (AGPL v3) pour les communes françaises de 500 à 5 000 habitants.
> Auto-hébergeable gratuitement, disponible en SaaS managé souverain, avec IA intégrée (Mistral).
>
> **Stack** : Bun · TypeScript · Nitro v3 · Nuxt 4 + Nuxt UI · tRPC 11 · Drizzle + SQLite (bun:sqlite) · Mistral (Voxtral)
> **Architecture** : single-tenant — une instance = une collectivité (sa DB SQLite, son S3, son conteneur).

**Priorité assumée (réorganisation du 24/07/2026)** : basculer les 4 clients existants sur la nouvelle mouture **le plus tôt possible**. Rien avant la phase 3 qui ne serve la bascule ; rien de réécrit deux fois. Marketing et institutionnel reportés au lancement.

---

## Phase 1 — Monolithe ISO *(~90 % — en cours)*

**Objectif : le monolithe reproduit le legacy à l'identique, prouvé.**

- [x] Monorepo Bun : `packages/core` (organization, users, médias, collections dynamiques), `apps/api` Nitro v3 (plan admin tRPC + plan public REST legacy-compat), auth Bearer, docker-compose, CI
- [x] Migrateur dump Mongo → SQLite validé par **golden test : 0 différence vs prod sur les 4 organisations** (+ import users avec mots de passe fonctionnels, tokens API, purge des seeds sur migration)
- [x] Admin legacy (`apps/admin`) branché tRPC single-tenant — validé smoke API + navigateur + revue E2E de Quentin (9.11)
- [ ] Emails transactionnels Loops (9.9) : invitations, mot de passe oublié
- [ ] Passe sécurité transverse (9.12) : rate limiting, headers, X-Request-Id
- [ ] Revue E2E Quentin de tous les scénarios + couverture du minimum vital (base évolutive) ; correctif d'isolation de la suite (le seed ne doit plus lire le `.env` racine)
- [ ] Clôture OpenSpec (`/opsx:verify`, 8.2)

**Critère de sortie** : suite E2E verte et revue, sécurité de base en place, change archivé.

---

## Phase 2 — Prêt à basculer *(~2-3 semaines)*

**Objectif : tout ce qui manque pour qu'un client vive sur Commun au quotidien.**

### 2a — Admin stabilisé (pas de refonte)
- [ ] Correctifs issus des retours de revue — uniquement ce qui touche la fiabilité (la modernisation attend la phase 4 : pas de réécriture intermédiaire de la couche models)
- [ ] Bouton Publier branché sur la task de déploiement (cf. 2b)

### 2b — Jobs → Nitro tasks (transplant direct, décision 24/07 : pas d'adaptation intermédiaire des jobs legacy — même effort payé une seule fois)
- [ ] Deploy nightly + à la demande : appel du hook Vercel (les builds RESTENT sur Vercel pendant la transition, les sites consomment notre API golden-testée)
- [ ] Injector OpenData (décisions grigny — alimente actes-administratifs quotidiennement)
- [ ] Sync APIDAE (Pertuis) et Airtable (LCSS) : moteur de mapping porté tel quel, frontière I/O réécrite (services directs, fin du JWT auto-forgé et de l'écriture Mongo directe)
- [ ] Ordonnancement corrigé : sync de données **puis** deploy (le legacy déployait à 0h30 avant la sync de 5h30)

**Critère de sortie** : une instance Commun vit seule une semaine (contenus édités, jobs qui tournent, sites publiés) sans intervention.

---

## Phase 3 — Migration des 4 clients 🎯 *(~3-4 semaines)*

**Objectif : Grigny, LCSS, Pertuis, CMAR-PACA en prod sur Commun, legacy éteint.**

- [ ] Infra Scaleway tout-en-un (décision 24/07) : **un VPS mutualisé** (~100 Mo RAM/instance), un conteneur par client (le Nitro de l'API sert aussi l'admin en statique), Object Storage fr-par
- [ ] Éclatement S3 : un bucket par client (copie server-side intra-région — les médias sont déjà chez Scaleway)
- [ ] SQLite = un fichier sur le volume : **backup quotidien → S3** (snapshot ou Litestream), pas de service managé
- [ ] Bascule site par site (pressenti : CMAR → Grigny → LCSS → Pertuis), double-run avec legacy en lecture seule, puis DNS
- [ ] Notice de bascule aux clients (nouvelle URL d'admin, mêmes identifiants)
- [ ] **Décommission du legacy** après la 4ᵉ bascule : microservices, framework maison, jobs, admin-fix

**Critère de sortie** : 4 clients en prod sur Commun, plateforme legacy éteinte.

---

## Phase 4 — Refonte complète de l'admin *(~4 semaines)*

**Objectif : une secrétaire de mairie peut tout gérer sans formation — et la dette front est soldée.**

- [ ] Cadrage acté 24/07 : migration **en place, écran par écran** (l'admin ISO en prod = référence de non-régression). Nuxt 4 + Nuxt UI v4 + @nuxt/icon + @nuxt/fonts ; TanStack Query remplace pinia-orm (état serveur = cache de query, jamais un store) ; models → composables par domaine ; middlewares workspace/prefetch/headings supprimés (`useAsyncData`/`useQuery` + `useHead`) ; axios → `$fetch` ; notifications maison → `useToast`. **Conservés : CASL** (permissions fines et multi-organisation intra-tenant à venir — une org = un site : mairie, cinéma du village…) **et luxon**
- [ ] **Fusion admin + API dans une seule app Nuxt** (décision 24/07) : Nuxt héberge son Nitro — un seul dev server, un seul build, un seul artefact, plus de CORS. Implique le port de la couche HTTP h3 v2 → v1 si Nuxt n'a pas encore rejoint Nitro v3 (couche mince, ~15 fichiers ; `packages/core` inchangé)
- [ ] Éditeur riche : `@poulpus/prose` → TipTap open source (TipTap Pro incompatible AGPL)
- [ ] Écrans générés depuis les définitions de collections (moteur = **outillage interne**, pas un produit headless — jeu de types fermé, Zod/TS, exploitable par l'IA) ; écran métier dédié : délibérations (séances + votes)
- [ ] PWA (manifest, installable) — couvre le cas mobile sans app native
- [ ] CLI d'instance **open source** : `admin:create` (bootstrap premier admin), `backup`, `restore`, `migrate`

**Critère de sortie** : parcours complet actualité + délibération dans le nouvel admin, en prod chez les 4 clients.

---

## Phase 5 — Thème & génération de sites *(~3-4 semaines)*

**Objectif : un seul thème maintenu, N communes — et le terrain préparé pour l'IA.**

- [ ] `packages/theme-base` : layer Nuxt (~81 % de composants déjà byte-identiques entre les sites) + design tokens (couleurs, logo, typo)
- [ ] Surcharges par commune via `extends` (app mince par site) — vendues comme prestation (AGPL : service, pas licence)
- [ ] **Pages par blocs contraints** (GrapesJS écarté — markup libre incompatible RGAA/montée de version/IA) : v1 rendu ISO des `_pages` migrées → v2 éditeur de blocs dans l'admin (fin du JSON brut en textarea), chaque bloc = composant du thème + props + liaison de données, JSON à schéma Zod
- [ ] Build statique **rapatrié sur l'instance** (fin de Vercel), Nuxt Content v3 stable, contenu fetché au build
- [ ] **RGAA AA dans la layer** (obligation légale → argument du socle gratuit)

**Critère de sortie** : un site témoin généré depuis une instance, score RGAA/Lighthouse documenté.

---

## Phase 6 — Site vitrine & communauté *(~2-3 semaines, ∥ phases 4-5)*

- [ ] Site vitrine commun.app : vision, modules, démo, pricing, docs (auto-hébergement en 10 min)
- [ ] GitHub public : org `commun-app`, Discussions, templates FR, `CONTRIBUTING.md`, hygiène AGPL (en-têtes, `SECURITY.md`, DCO, changelog)
- [ ] Notice aux clients existants + newsletter

**Critère de sortie** : site en ligne, repo prêt à passer public.

---

## Phase 7 — Produit payant *(~6-8 semaines)*

### 7.1 — IA (la killer feature)
- [ ] Transcription conseils : upload audio → Voxtral → structuration LLM (délibérations, votes, quorum) → CR réglementaire relu dans l'admin (live streaming = v2)
- [ ] Copilote rédaction (suggestion, validation humaine) + **copilote d'agencement de pages** (v3 des blocs : le LLM émet du JSON de blocs validé Zod — la démo différenciante)
- [ ] Test sur un vrai conseil d'une commune pilote

### 7.2 — Modèle économique outillé
- [ ] Système de crédits IA : comptage, packs, facturation simple puis Chorus Pro

### 7.3 — Control plane (SaaS)
- [ ] **Codebase séparée, propriétaire, qui n'importe PAS `@commun/core`** (frontière AGPL : elle orchestre Dokploy, facturation, DNS) — provisioning `slug.commun.app`, cycle de vie piloté par la facturation. Manuel d'abord, automatisé quand le manuel ne passe plus à l'échelle

**Critère de sortie** : un enregistrement de conseil réel → un CR publié ; une commune peut s'inscrire et payer.

---

## Phase 8 — Lancement *(continu)*

- [ ] Recherche concurrentielle documentée (Sites Faciles, Publik, Mairie.app, WeDelib, LaPageLocale…)
- [ ] Subventions (ANCT, DINUM, NLnet, Banque des Territoires), partenariat Mistral, démarche AMF, civic tech
- [ ] Programme pilote : 5-10 communes gratuites 1 an contre feedback (les 4 clients migrés = références)
- [ ] Annonce publique (réseaux secrétaires de mairie, communs numériques, Linuxfr/HN)

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
| 1 | Monolithe ISO (reste : Loops, sécurité, E2E, clôture) | ~1 sem | début août 2026 |
| 2 | Prêt à basculer (admin stabilisé + jobs → tasks) | 2-3 sem | fin août |
| 3 | **Migration des 4 clients + décommission legacy** 🎯 | 3-4 sem | fin sept. |
| 4 | Refonte admin (Nuxt 4 + UI + TanStack + fusion) | ~4 sem | fin oct. |
| 5 | Thème + blocs + SSG sur instance + RGAA | 3-4 sem | fin nov. |
| 6 | Site vitrine + communauté GitHub | 2-3 sem (∥ 4-5) | nov. |
| 7 | IA + crédits + control plane | 6-8 sem | jan. 2027 |
| 8 | Lancement + subventions + pilote | continu | fév. 2027 → |

*\*Solo avec assistance IA, imprévus inclus. Point de départ : fin juillet 2026.*

## Décisions actées

- **Bascule d'abord** (24/07/2026) : les 4 clients migrent sur l'admin ISO stabilisé AVANT la refonte — rien de réécrit deux fois
- Jobs : transplant direct en Nitro tasks (pas d'adaptation intermédiaire des jobs legacy) ; builds sur Vercel pendant la transition
- Infra migration : Scaleway tout-en-un (VPS mutualisé + Object Storage fr-par), un conteneur/client, backup SQLite → S3 ; Dokploy/Garage = cible SaaS, pas migration
- Fusion admin + API dans une seule app Nuxt en phase 4 (Nuxt héberge son Nitro ; port h3 v2→v1 si nécessaire)
- Deux CLIs distincts : CLI d'instance **open source** (admin:create, backup, migrate) ; control plane **propriétaire et séparé** (n'importe jamais `@commun/core` — frontière AGPL)
- Single-tenant : une instance = une collectivité (DB SQLite, S3, conteneur dédiés)
- Le legacy (Poulpus) n'est plus touché : tout part dans Commun
- RGAA dans le socle gratuit (obligation légale, pas une option payante)
- Transcription via Mistral Voxtral (souveraineté — pas de Whisper OpenAI)
- Collections dynamiques = outillage interne (pas un produit headless CMS) : jeu de types fermé, Zod/TS, exploitable par l'IA
- Theming : UN thème officiel RGAA AA + design tokens ; surcouches `extends` vendues comme prestation (AGPL : service, pas licence)
- Pages par blocs contraints (JSON à schéma Zod) — GrapesJS écarté ; agencement agentique en phase 7
- CASL et luxon conservés dans l'admin (permissions fines / multi-org intra-tenant à venir ; utils dates FR)
- Pas d'app native à horizon visible : PWA (admin puis site public) ; apps élus/citoyens = horizon lointain
- Marketing/subventions après la preuve de fonctionnement, pas avant

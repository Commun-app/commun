# Roadmap — commun.app

> **Vision** : CMS open source (AGPL v3) pour les communes françaises de 500 à 5 000 habitants.
> Auto-hébergeable gratuitement, disponible en SaaS managé souverain, avec IA intégrée (Mistral).
>
> **Stack** : Bun · TypeScript · Nitro v3 · Nuxt 4 + Nuxt UI · tRPC 11 · Drizzle + SQLite (bun:sqlite) · Mistral (Voxtral)
> **Architecture** : single-tenant — une instance = une collectivité (sa DB SQLite (bun:sqlite), son S3, son serveur).
> **Base de travail** : boilerplate `flotte/opencorp` (monorepo Bun, apps/daemon Nitro v3, packages/core par domaines, apps/web Nuxt 4).

**Priorité assumée** : d'abord la preuve par le produit (scaffold → admin → thèmes → migration des 4 clients existants). Le positionnement marketing (recherche concurrentielle, dossier subventions, communication) est volontairement reporté au moment du lancement.

---

## Phase 1 — Scaffold du monorepo *(~3 semaines)*

**Objectif : la chaîne technique validée de bout en bout.**

- [ ] Copier l'ossature d'opencorp → renommage `@commun/*`, purge de la logique métier (agents, channels, event-queue)
- [ ] ADRs consignés dans le repo : single-tenant, SQLite (bun:sqlite) + Drizzle, Nitro v3, AGPL v3, Bun, une instance = une collectivité
- [ ] `packages/core` — schéma de données v1, un domaine = schéma Drizzle + queries + router tRPC + validation Zod :
  - commune (settings, identité, thème), utilisateurs/rôles
  - actualités, agenda, élus, projets, délibérations/séances, formulaires citoyens, médias
- [ ] `apps/api` (Nitro v3) : catch-all tRPC (plan admin) + routes REST `server/routes/api/**` (plan public : contenu pour le build des sites, formulaires citoyens)
- [ ] Auth single-tenant simple : sessions, invitations, rôles admin/rédacteur (aucune machinerie multi-org)
- [ ] Médias : S3-compatible (un bucket par commune) + fallback disque local pour l'auto-hébergement
- [ ] `docker-compose.yml` d'auto-hébergement fonctionnel dès cette phase (c'est le produit open source)
- [ ] CI : typecheck, tests (`bun test`), lint

**Critère de sortie** : un domaine complet (actualités) en CRUD via tRPC + REST, testé, qui tourne sous Docker.

**Risque suivi** : Nitro v3 est en beta — lockfile Bun figé, mises à jour uniquement aux jalons.

---

## Phase 2 — Refonte de l'admin *(~4-5 semaines)*

**Objectif : une secrétaire de mairie peut tout gérer sans formation.**

- [ ] `apps/admin` : Nuxt 4 + Nuxt UI 4 + trpc-nuxt + TanStack Query
- [ ] Écrans par module : actualités (publication programmée), agenda, élus, projets, **délibérations** (CRUD + publication), formulaires citoyens (réception), médias, réglages de la commune
- [ ] **Modules typés en dur** (choix assumé vs le moteur de collections JSON génériques de l'ancien admin — simplicité pour la cible). Le moteur JSON validé Zod reste en backlog comme module « collections personnalisées »
- [ ] Éditeur riche : remplacer `@poulpus/prose` (dépendance TipTap Pro incompatible avec un projet AGPL) par TipTap open source ou ProseMirror direct
- [ ] Déclenchement du rebuild du site depuis l'admin (avec état de progression)

**Critère de sortie** : parcours complet actualité + délibération, de la saisie à l'exposition sur l'API publique.

---

## Phase 3 — Layer thème & génération de sites *(~3-4 semaines, chevauche la phase 2)*

**Objectif : un seul thème maintenu, N communes.**

- [ ] `packages/theme-base` : **layer Nuxt** consolidant les ~81 % de composants byte-identiques entre grigny/lcss/pertuis + le module de fetch de contenu
- [ ] Nuxt Content v3 **stable** (fin de l'alpha.8 en prod), contenu fetché au build — plus jamais committé dans les repos
- [ ] Chaque site = app mince (`sites/<commune>`) qui `extends` la layer : pages spécifiques, routeRules, surcharges
- [ ] Build statique **auto-hébergé sur l'instance** (fin de Vercel) : publication → rebuild → servi par l'instance (Caddy/nginx). Cohérent avec la promesse souveraineté
- [ ] **RGAA AA dans la layer** (obligation légale des sites publics → argument produit du socle gratuit) : audit composants, focus, contrastes, ARIA
- [ ] Ordonnancement corrigé : sync de données **puis** rebuild (le legacy déployait à 0h30 avant la sync APIDAE de 5h30)

**Critère de sortie** : un site témoin complet généré depuis une instance Commun, score RGAA/Lighthouse documenté.

---

## Phase 4 — Migration des 4 clients existants *(~4 semaines)*

**Objectif — la preuve de fonctionnement : Grigny, LCSS, Pertuis et CMAR-PAC en prod sur Commun, un serveur chacun.**

- [ ] **Script de migration Mongo → SQLite (bun:sqlite)** par organisation : mapping Collections/Records (le JSON legacy) → modules typés, migration des médias S3 vers le bucket par commune, utilisateurs réinvités (reset propre, pas de migration des mots de passe)
- [ ] **Portage du connecteur APIDAE/Airtable** en module de `packages/core` (tâche planifiée Nitro) — indispensable pour Pertuis et LCSS. Le moteur de mapping de job-data-sync se porte bien ; il passera par l'API interne (fin de l'écriture directe en DB avec JWT auto-forgé)
- [ ] Migration site par site, du plus simple au plus complexe (à confirmer : CMAR-PAC → Grigny → LCSS → Pertuis), double-run avec legacy en lecture seule avant chaque bascule DNS
- [ ] Provisioning des 4 serveurs (docker-compose par instance — le control plane automatisé viendra bien plus tard)
- [ ] **Décommission du legacy** après la 4ᵉ bascule : microservices, framework maison, ancien SSG, jobs, admin-fix

**Critère de sortie** : 4 sites en prod sur Commun, plateforme legacy éteinte.

**Risque principal de toute la roadmap** : le mapping des Collections JSON legacy vers les modules typés — le moins prévisible. À dérisquer dès la phase 1 en écrivant le script de migration sur un dump réel.

---

## Phase 5 — Module IA *(~4 semaines)*

**Objectif : la killer feature démontrable pour le lancement.**

- [ ] **Transcription des conseils municipaux** v1 : upload audio → Voxtral (Mistral) → structuration LLM (délibérations, votes, intervenants, quorum) → compte-rendu au format réglementaire, relu/édité dans l'admin avant publication. (Le live streaming WebSocket = v2, pas au lancement)
- [ ] **Copilote rédaction** dans l'éditeur (actualités, agenda) — mode suggestion, validation humaine systématique
- [ ] **Système de crédits** : comptage, packs, facturation simple (Chorus Pro complet viendra ensuite)
- [ ] Test en conditions réelles sur un vrai conseil d'une commune pilote

**Critère de sortie** : un enregistrement de conseil réel → un CR publié sur un site pilote.

---

## Phase 6 — Pré-lancement : site vitrine & communauté *(~2-3 semaines, parallélisable)*

- [ ] **Site vitrine commun.app** (`apps/website`, Nuxt) : vision, modules (délibérations + transcription IA en avant), démo, pricing, documentation (auto-hébergement en 10 min, guide contributeur)
- [ ] **Espace communautaire — GitHub d'abord** : org `commun-app`, monorepo public, GitHub Discussions (Q&A, idées, annonces), issues avec templates FR, `CONTRIBUTING.md`, code de conduite, labels `good first issue`. Forum type Discourse pour les non-techniciens : en backlog, pertinent à partir de ~20-30 communes
- [ ] Hygiène open source : en-têtes AGPL, `SECURITY.md`, DCO, semver + changelog automatisé

**Critère de sortie** : site en ligne, repo prêt à passer public.

---

## Phase 7 — Lancement, positionnement & subventions *(continu)*

*Tout le volet marketing/institutionnel volontairement reporté ici.*

- [ ] **Recherche concurrentielle approfondie** : Sites Faciles (ANCT/beta.gouv), Publik (Entr'ouvert), Mairie.app, WeDelib, LaPageLocale, Campagnol… → matrice honnête intégrée au site et aux dossiers
- [ ] **Solidification du dossier** : pitch, dossiers de subvention (ANCT, DINUM, NLnet, Banque des Territoires), contact partenariat Mistral (open source + intérêt public), démarche AMF/labellisation
- [ ] Repo public + annonce (réseaux de secrétaires de mairie, communs numériques, Linuxfr/HN pour la traction dev)
- [ ] **Programme pilote** : 5-10 communes gratuites 1 an contre feedback — les 4 organisations migrées servent de références démontrables
- [ ] SaaS managé v1 : provisioning manuel des instances ; le control plane automatisé n'arrive que quand le manuel ne passe plus à l'échelle

---

## Vue synthétique

| # | Phase | Durée | Fin estimée* |
|---|---|---|---|
| 1 | Scaffold monorepo (api + core + schéma) | 3 sem | mi-août 2026 |
| 2 | Refonte admin (Nuxt 4 + Nuxt UI + tRPC) | 4-5 sem | fin sept. |
| 3 | Layer thème + SSG auto-hébergé + RGAA | 3-4 sem (∥ ph. 2) | fin sept. |
| 4 | Migration Grigny / LCSS / Pertuis / CMAR-PAC | 4 sem | fin oct. |
| 5 | IA : transcription + copilote + crédits | 4 sem | fin nov. |
| 6 | Site vitrine + communauté GitHub | 2-3 sem (∥ ph. 4-5) | nov. |
| 7 | Lancement + recherche concurrentielle + subventions | continu | déc. 2026 → |

*\*Solo avec assistance IA, imprévus de migration inclus. Point de départ : fin juillet 2026.*

## Décisions actées

- Single-tenant : une instance = une collectivité (DB SQLite (bun:sqlite), S3, serveur dédiés) — 4 serveurs assumés pour les clients existants
- Le legacy (Poulpus) n'est plus touché, y compris ses problèmes de sécurité : tout part dans Commun
- RGAA dans le socle gratuit (obligation légale, pas une option payante)
- Transcription via Mistral Voxtral (cohérence souveraineté, pas de Whisper OpenAI)
- Marketing/subventions après la preuve de fonctionnement, pas avant

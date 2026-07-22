# Design — scaffold-monorepo

## Context

Le legacy Poulpus (analysé le 2026-07-22) : 5 microservices Node/Express sur framework maison, MongoDB partagée entre services, admin Nuxt 3/Pinia ORM, 3 thèmes Nuxt forkés dupliqués à ~81 %, 2 jobs GitHub Actions. Le multi-tenant (hiérarchie d'organisations par `path`, scopes par rôle) est la principale source de complexité alors que chaque client est de fait servi isolément.

Commun repart de zéro dans `commun.app/` avec une architecture single-tenant (une instance = une collectivité) et s'appuie sur le boilerplate `flotte/opencorp` dont la structure correspond déjà à la cible : monorepo Bun workspaces, `apps/daemon` Nitro v3 + tRPC 11 + h3 v2, `packages/core` organisé par domaines (schéma Drizzle + queries + router tRPC par domaine), `apps/web` Nuxt 4 + Nuxt UI, `docs/` undocs, tests `bun test`.

Contraintes : projet destiné à l'AGPL v3 et à l'auto-hébergement (zéro dépendance propriétaire dans le socle) ; les 4 organisations existantes (Grigny, LCSS, Pertuis, CMAR PACA) devront migrer depuis MongoDB en phase 4 ; le legacy reste intouché.

## Goals / Non-Goals

**Goals:**
- Monorepo `@commun/*` opérationnel : `apps/api`, `packages/core`, `docs/`, docker-compose, CI.
- Schéma de données v1 complet des domaines du socle (dont les collections personnalisées extensibles), en Drizzle + SQLite (`bun:sqlite`), validé Zod.
- API à deux plans : tRPC (futur admin) + REST h3 (contenu public, formulaires citoyens).
- Auth single-tenant fonctionnelle (sessions, invitations, rôles admin/rédacteur) + tokens API pour le build des sites.
- Auto-hébergement prouvé : `docker compose up` → instance fonctionnelle documentée.
- Dérisquage migration : script Mongo → LibSQL exécuté avec succès sur un dump réel des 4 organisations.

**Non-Goals:**
- L'admin Nuxt (phase 2), la layer thème/SSG (phase 3), la bascule effective des clients (phase 4), l'IA (phase 5), le site vitrine (phase 6).
- Le control plane SaaS / l'orchestration de flotte d'instances.
- Toute modification du code legacy Poulpus.
- La publication npm des packages (workspace interne uniquement à ce stade).

## Decisions

**D1 — Partir de l'ossature opencorp plutôt que d'un scaffold neuf.**
La structure (workspaces, tsconfig.base, daemon Nitro v3, core par domaines, undocs, playwright-bdd) est exactement la cible et Drizzle + SQLite y sont déjà câblés. Alternative rejetée : `nitro init` neuf — reconstruirait à la main ce qui existe déjà, sans gain. On copie l'ossature, on purge la logique métier (agents, channels, event-queue, drizzle migrations opencorp), on renomme `@opencorp/*` → `@commun/*`.

**D2 — SQLite via `bun:sqlite` + Drizzle, abandon de Mongoose/MongoDB.**
Un CMS de collectivité = quelques milliers de lignes ; SQLite donne zéro ops, backup = un fichier, auto-hébergement trivial — cohérent avec une instance par collectivité. Le driver retenu est **`bun:sqlite`, natif du runtime** (annotation de Quentin) : zéro binding à compiler, image Docker simplifiée, support Drizzle de première classe (`drizzle-orm/bun-sqlite`). Drizzle apporte les types TS bout en bout (condition du plan tRPC). Alternatives rejetées : LibSQL (n'apporterait que la réplication distante type Turso, hors besoin, au prix d'un binding natif) ; garder Mongo (impose un mongod par instance auto-hébergée, lourd pour la cible) ; Postgres (surdimensionné, ops plus lourde). Coût accepté : script de migration depuis le Mongo legacy (dérisqué dans ce change).

**D3 — Single-tenant par design.**
Aucune table ni middleware ne connaît la notion d'« organisation multiple » : la table `collectivite` est un singleton de configuration (vocabulaire générique : communes, communautés de communes et autres collectivités partageant le même principe de transparence de gouvernance). Supprime la hiérarchie `path`, les scopes et `collectionScope`/`organizationScope` du legacy. Alternative rejetée : garder un multi-tenant « au cas où » — c'est précisément la complexité qui a tué le legacy.

**D4 — Nitro v3 (beta) plutôt que v2.**
Projet neuf : on évite une seconde migration. Risque beta accepté et contenu : versions figées par le lockfile Bun (le boilerplate tourne déjà sur `nitro 3.0.x-beta` + `h3 2.0.x-rc`), montées de version uniquement aux jalons de phase.

**D5 — Deux plans d'API : tRPC interne, REST public.**
tRPC 11 (catch-all `routes/api/trpc/[...trpc].ts`) pour l'admin — types partagés via `packages/core`. REST h3 (`routes/api/**`) pour ce qui est consommé hors monorepo : contenu au build des sites (auth par token API), soumission des formulaires citoyens (public, rate-limité). Alternative rejetée : tout-tRPC — inutilisable proprement par le build Nuxt Content des sites et par des tiers. Règle actée (annotation) : le plan REST reste réduit au strict minimum nécessaire au build statique et aux formulaires citoyens ; toute nouvelle surface d'API passe par tRPC par défaut.

**D6 — Socle hybride : modules typés + collections personnalisées extensibles.**
Les besoins universels (actualités, agenda, élus, projets, délibérations, formulaires, médias) sont des modules typés en dur : simplicité, écrans dédiés, garanties de schéma. Pour les besoins spécifiques des futures collectivités (annotation de Quentin : le socle doit rester extensible), le socle inclut un domaine « collections personnalisées » : définition en base (nom, champs choisis dans un jeu **fermé** de types — texte, texte riche, nombre, booléen, date, média, relation, liste de choix), validation Zod générée depuis la définition, CRUD générique exposé en tRPC et sur le plan contenu. C'est la reprise assainie du concept `attributes/editor/display` du legacy — sans JSON libre ni composants arbitraires. Alternatives rejetées : tout-typé figé (ne répond pas aux besoins des futures mairies) ; tout-générique (la complexité qui a nui au legacy). Conséquence migration : les Collections legacy mappent vers les domaines typés quand la correspondance existe, vers une collection personnalisée sinon.

**D7 — Auth : sessions opaques en DB + tokens API, pas de JWT.**
Single-tenant = pas besoin de tokens auto-porteurs ; les sessions en table (cookie httpOnly, expiration, révocation) sont plus simples et plus sûres que le JWT legacy (dont le secret `@changeme`…). Les consommateurs machine (build des sites) utilisent des tokens API hashés en DB. Invitations par lien à usage unique (`crypto.randomBytes`, jamais `Math.random`).

**D8 — Médias : interface à deux drivers + S3 embarqué dans le compose.**
Interface unique dans `packages/core` avec driver S3-compatible (bucket par collectivité, URLs pré-signées, SDK AWS v3) et driver disque local (fallback minimal sans dépendance). Le choix se fait par variables d'env. Le docker-compose de référence propose en plus un **profil embarquant un service S3-compatible auto-hébergé** (MinIO, ou Garage — projet français, cohérent avec le positionnement souverain) : l'expérience S3 complète sans dépendance cloud (annotation de Quentin). Le retraitement d'images (webp multi-tailles, via sharp) s'exécute en **tâches asynchrones internes à l'instance** (Nitro tasks) — pas de queue externe type SQS.

**D9 — Migration legacy : package dédié `packages/legacy-migrate`.**
CLI (citty) lisant un dump MongoDB (bson/jsonl) **hors ligne** — aucune connexion au prod requise. Pipeline : extraction par organisation → mapping Collections/Records JSON → domaines typés → insertion Drizzle → rapport (mappé / non mappé / perdu). Le rapport de couverture sur le dump réel des 4 organisations est LE livrable de dérisquage : il dira dès la phase 1 quels champs legacy n'ont pas de destination.

**D10 — Documentation : reprise du setup undocs d'opencorp.**
`docs/` avec guide d'auto-hébergement (docker compose en 10 min), référence de configuration (variables d'env), guide contributeur. La doc est un livrable du socle open source, pas un à-côté.

## Risks / Trade-offs

- [Nitro v3/h3 v2 beta : breaking changes] → lockfile figé, upgrades uniquement aux jalons, e2e sur les routes clés pour détecter les régressions de montée de version.
- [Mapping Collections JSON → domaines typés plus irrégulier que prévu] → c'est le risque n°1 de la roadmap ; le rapport de couverture du script sur dump réel (D9) le mesure dès cette phase ; les champs orphelins sont soit ajoutés au schéma v1, soit archivés dans une colonne JSON `legacy_extra` par enregistrement (rien n'est perdu).
- [Binding natif sharp sous Bun et dans l'image Docker] → validé dès la phase 1 par le build d'image en CI ; côté base de données, `bun:sqlite` est intégré au runtime — aucun binding à compiler.
- [Purge incomplète d'opencorp : logique agents résiduelle] → checklist de purge explicite dans les tasks + `grep opencorp` en CI.
- [Compatibilité licences AGPL] → audit des deps du socle dans ce change (le remplacement de TipTap Pro concerne la phase 2 mais la contrainte est actée dès maintenant).

## Migration Plan

Projet greenfield — pas de déploiement à migrer. Ordre de bootstrap : copie/purge/renommage de l'ossature → schéma core par domaines → API → auth → médias → docker-compose + docs → script legacy-migrate + rapport sur dump réel. Rollback trivial (rien en production).

## Open Questions

- Le repo Git de `commun.app/` : initialisé dans ce change (`git init` + premier commit) — à confirmer, ainsi que la création de l'org GitHub `commun-app` (prévue phase 6).

## Résolu par annotations (2026-07-22)

- **Base de données** : `bun:sqlite` plutôt que LibSQL — driver natif du runtime, zéro binding (D2 révisé).
- **Extensibilité** : socle hybride acté — modules typés + collections personnalisées à jeu de champs fermé (D6 révisé).
- **Plan REST** : réduit au strict minimum (build statique + formulaires citoyens), tout le reste en tRPC (D5 révisé).
- **Médias** : compose de référence avec profil S3-compatible embarqué (MinIO/Garage) + tâches de retraitement internes (D8 révisé).
- **Dump Mongo** : Quentin le fournira en temps voulu — la CLI se développe sur échantillon, l'exécution réelle (task 7.6) attend la livraison.
- **Vocabulaire** : domaine `collectivite` (et non `commune`) — le produit couvre communes, communautés de communes et d'autres collectivités partageant le même principe de transparence de gouvernance/délibérations.

# Proposal — scaffold-monorepo

## Why

La plateforme legacy Poulpus (5 microservices sur framework maison, MongoDB partagée, admin Nuxt 3, thèmes dupliqués à ~81 %) est trop complexe à maintenir pour la valeur qu'elle délivre, et porte des dettes bloquantes (sécurité, tests fictifs, multi-tenant inutilisé). Le projet pivote vers **Commun (commun.app)** : un CMS open source (AGPL v3) single-tenant pour communes françaises, auto-hébergeable et déclinable en SaaS souverain. Ce change pose la fondation technique : le monorepo, le socle de données, l'API, et le dérisquage de la migration des 4 organisations existantes.

## What Changes

- Création du monorepo `commun.app/` (Bun workspaces, TypeScript strict) à partir de l'ossature du boilerplate `flotte/opencorp`, renommée `@commun/*`, logique métier d'opencorp purgée.
- `packages/core` : schéma de données v1 en Drizzle + SQLite (`bun:sqlite`), organisé par domaines (collectivité, utilisateurs/rôles, actualités, agenda, élus, projets, délibérations/séances, formulaires citoyens, médias, collections personnalisées) — chaque domaine = schéma + queries + router tRPC + validation Zod.
- `apps/api` : serveur Nitro v3 exposant le plan admin en tRPC 11 et un plan public REST h3 réduit au strict minimum (contenu pour le build des sites, soumission de formulaires citoyens) — toute autre surface d'API passe par tRPC.
- Auth single-tenant : sessions, invitations, rôles (admin/rédacteur) — **aucune machinerie multi-organisation** (rupture assumée avec le legacy : hiérarchie `path`, scopes par organisation supprimés).
- Médias : stockage S3-compatible (un bucket par commune) avec fallback disque local pour l'auto-hébergement.
- Self-hosting : `docker-compose.yml` fonctionnel dès cette phase + reprise du setup `docs/` (undocs) d'opencorp pour la documentation (guide d'auto-hébergement, guide contributeur).
- CI : typecheck, tests `bun test`, lint.
- **Dérisquage roadmap** : script de migration Mongo → SQLite (`bun:sqlite`) exécuté sur un dump réel des 4 organisations existantes (Grigny, LCSS, Pertuis, CMAR PACA) — validation du mapping Collections/Records JSON → modules typés dès la phase 1, pas en phase 4.

Aucun code legacy n'est modifié (décision actée : l'existant reste intouché jusqu'à la bascule).

**Principe de périmètre (review du 2026-07-23)** : la phase 1 reproduit l'existant à iso-fonctionnalités (hors code mort/abandonné), sans fonctionnalité nouvelle — les délibérations et formulaires citoyens, initialement envisagés ici, sont reportés à leurs propres changes.

## Capabilities

### New Capabilities
- `monorepo-workspace` : structure du monorepo Bun (apps/packages), conventions TypeScript, CI, scripts de dev.
- `core-domains` : schéma de données single-tenant, collections personnalisées extensibles et logique métier par domaine (Drizzle + SQLite (`bun:sqlite`), queries, validation Zod).
- `api-server` : serveur Nitro v3 — routeur tRPC (plan admin) et routes REST publiques (plan contenu/formulaires).
- `tenant-auth` : authentification et autorisation single-tenant (sessions, invitations, rôles admin/rédacteur).
- `media-storage` : gestion des médias (S3-compatible par commune, fallback disque local, URLs signées).
- `self-hosting` : distribution auto-hébergeable (docker-compose, configuration par variables d'env, documentation undocs).
- `legacy-migration` : script de migration Mongo → SQLite (`bun:sqlite`) par organisation (mapping Collections/Records → domaines typés ou collections personnalisées, validation sur dump réel).

### Modified Capabilities

_(aucune — premier change du projet, `openspec/specs/` est vide)_

## Impact

- **Nouveau code uniquement** : tout vit dans `commun.app/` (apps/api, packages/core, docs/, docker/). Le legacy Poulpus n'est pas touché.
- **Dépendances clés** : Nitro `3.x-beta` (risque suivi : lockfile figé, upgrades aux jalons), h3 v2, tRPC 11, Drizzle ORM, SQLite (`bun:sqlite`), Zod 4, Bun ≥ 1.1.
- **Source d'ossature** : `/Users/qvdp/Projects/flotte/opencorp` (lecture seule — on copie, on ne modifie pas).
- **Données** : accès en lecture à un dump MongoDB de production Poulpus pour le script de migration (les 4 organisations).
- **Hors périmètre** (phases ultérieures de ROADMAP.md) : admin Nuxt (phase 2), layer thème/SSG (phase 3), bascule effective des clients (phase 4), IA (phase 5), site vitrine (phase 6).

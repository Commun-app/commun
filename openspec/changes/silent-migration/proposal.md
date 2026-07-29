## Why

Les phases 1 et 2 sont closes : le monolithe tient la prod (jobs compris) et l'admin tourne sur une stack maintenue. Il faut maintenant faire tourner les 4 clients (CMAR, Grigny, LCSS, Pertuis) sur Commun **sans qu'ils s'en aperçoivent**, puis décommissionner le legacy — c'est l'objectif 🎯 de la roadmap, et le préalable à tout le reste (ouverture du code, SaaS). La bascule est précédée d'une **période d'observation** : les instances tournent en double du legacy pendant quelques jours, alimentées par resynchronisation, chacune avec son déploiement Vercel de vérification, jusqu'à validation de l'iso-fonctionnement.

## What Changes

- **Image d'instance unique** : un conteneur par client servant l'API ET l'admin statique sur la même origine (l'admin appelle `/api/trpc` en relatif) — un seul domaine par client (`<slug>.<domaine de base>`), un seul certificat, une seule image pour tous les clients.
- **Hébergement sur le VPS Dokploy existant** (décision 29/07 — remplace le « Scaleway brut » du cadrage initial) : une app Dokploy par client, secrets par instance, domaine associé.
- **S3 dédié par client** : bucket par instance, copie des objets legacy depuis le manifeste de migration, resynchronisation incrémentale pendant l'observation.
- **Sauvegardes par Dokploy** (review PR #6) : backups planifiés du volume de chaque instance vers S3, configurés dans Dokploy — aucune logique applicative.
- **Crons actifs pendant l'observation** (review PR #6, pas de mode ombre) : `apidae:sync` écrit dans le SQLite de l'ombre (exerce la sync réelle), `deploy` frappe le hook de TEST posé par le pipeline de resync après chaque restauration.
- **Pipeline de resynchronisation** legacy → instance (nocturne + à la demande) : dump Mongo → CLI de migration → remplacement de la base de l'instance → sync S3 → déclenchement du build Vercel d'observation. Pas de temps réel (décision, voir design).
- **Portail de connexion** (`apps/portal`, première brique du cloud commun.app) : hébergé à terme sur app.poulp.us, login ISO, routage email → instance, authentification déléguée à l'instance et **remise de session** vers son admin — transparent pour l'utilisateur.
- **Runbook de bascule par client** : gel des écritures legacy, resync final, bascule d'app.poulp.us vers le portail, activation des jobs, re-pointage du Vercel de prod, checklist de décommission.

## Capabilities

### New Capabilities

- `client-hosting` : hébergement des instances clients — image d'instance (API + admin même origine), app Dokploy par client, S3 dédié, domaines, secrets.
- `shadow-sync` : resynchronisation legacy → instance pendant l'observation — re-migration depuis dump Mongo, sync S3 incrémentale, build Vercel de vérification, comparaison golden.
- `auth-portal` : portail de connexion — login ISO legacy, routage email → instance, session déléguée et redirection.

### Modified Capabilities

- `admin-app` : ADDED — remise de session (l'admin accepte un token remis par le portail) + base API relative (même origine).

## Impact

- `apps/api/Dockerfile.instance` (build admin avec tokens + API), `apps/portal` (app Nitro légère, TEMPORAIRE dans le monorepo — la vraie app portail cloud sera privée). L'outillage d'infra/clients (resync, sync S3, mapping portail) vit HORS du monorepo open source (review PR #6) — local puis repo privé.
- `apps/admin` : base API relative par défaut, page/plugin de remise de session — changements minimes.
- Aucune modification de schéma DB ; la CLI de migration est réutilisée telle quelle (auteurs inclus depuis la PR #5).
- Opérations manuelles Quentin : DNS (+ achat du domaine cible, non bloquant — le domaine de base est un paramètre), création des buckets, secrets Dokploy, projets Vercel d'observation, dumps Mongo de prod.

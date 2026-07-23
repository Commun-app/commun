# Tasks — scaffold-monorepo

## 1. Ossature du monorepo

- [x] 1.1 Copier l'ossature d'opencorp dans `commun.app/` (workspaces, tsconfig.base, scripts, structure apps/packages, docs/) — sans node_modules, .git ni artefacts de build
- [x] 1.2 Purger la logique métier opencorp : domaines agents/channels/messages, event-queue, migrations Drizzle opencorp, fixtures et tests associés
- [x] 1.3 Renommer `@opencorp/*` → `@commun/*` (package.json, imports, scripts, README) ; `apps/daemon` → `apps/api`
- [x] 1.4 Vérifier `bun install` + `bun run typecheck` propres ; ajouter un check CI `grep -ri opencorp` = 0 occurrence (`scripts/check-naming.sh`)
- [x] 1.5 `git init`, LICENSE AGPL v3, README de lancement, premier commit
- [x] 1.6 Workflow CI : typecheck + tests + naming check sur push (`.github/workflows/ci.yml`)

## 2. Schéma de données (`@commun/core`)

- [x] 2.1 Configurer Drizzle + SQLite via `bun:sqlite` (connexion, drizzle-kit, application automatique des migrations au démarrage, PRAGMA foreign_keys=ON)
- [x] 2.2 Domaine `organization` : settings d'instance en enregistrement unique (identité, coordonnées, thème, réseaux) — vocabulaire générique, codebase anglaise (D11)
- [x] 2.3 Domaine `users` : utilisateurs, rôles admin/rédacteur, sessions, invitations, tokens API (tables — tokens hashés)
- [x] 2.4 ~~Domaines de contenu typés~~ **Révisé (D6 rév. 2)** : le contenu standard vit dans le moteur de collections ; les 4 collections par défaut (`news`, `events`, `officials`, `projects`) sont seedées par migration Drizzle custom (`0001_seed-default-collections.sql`)
- [x] 2.5 Domaine `deliberations` (typé, exception assumée) : `council_sessions` (date, ordre du jour, compte-rendu) + `deliberations` (numéro, objet, votes structurés, résultat), publiables
- [x] 2.6 Domaine `forms` : définitions de formulaires citoyens + soumissions
- [x] 2.7 Domaine `media` : enregistrements médias (mime, variantes, alt/légende)
- [x] 2.8 Colonne `legacy_extra` (JSON) sur chaque table de contenu + schémas Zod create/update par domaine (drizzle-zod)
- [x] 2.9 Moteur de collections : définitions (champs à jeu fermé de 8 types anglais), validation Zod générée, CRUD générique avec validation des entrées, cycle de publication
- [x] 2.10 Tests unitaires des queries (`bun test`) : schema + seed, collections (5 dont collection seedée et publication programmée), auth, tokens — 13 tests

## 3. API (`apps/api`)

- [x] 3.1 Router tRPC racine agrégeant les routers des domaines système (organization, users, apiTokens, deliberations, forms, media, collections), monté en catch-all `/api/trpc` ; contexte par requête (session, db, cookies)
- [x] 3.2 Middleware de protection : `protectedProcedure` (session) et `adminProcedure` (rôle) ; erreurs structurées + logs consola
- [x] 3.3 Route REST publique de contenu `/api/content/[domain]` : domaines système + fallback collections par slug (news, events, …), contenu publié uniquement, auth par token API
- [x] 3.4 Route REST publique `POST /api/forms/[slug]` avec rate-limiting par IP (5/min) et validation contre les champs du formulaire
- [x] 3.5 `GET /health` (état DB) ; garde de démarrage prod refusant les valeurs placeholder (`assertProductionConfig`)
- [ ] 3.6 Tests d'intégration automatisés des routes clés (auth, CRUD actualité, contenu public, formulaire) — smoke manuels faits, à automatiser dans e2e/

## 4. Authentification

- [x] 4.1 Login email + mot de passe (argon2id via Bun.password), session opaque hashée en DB, cookie httpOnly/sameSite (+Secure en prod), logout et révocation
- [x] 4.2 Invitations à usage unique (`crypto.randomBytes`, expiration 7 j), définition du mot de passe, activation du compte
- [x] 4.3 Tokens API : génération affichée une fois, stockage hashé (sha256), révocation, restriction lecture seule au plan contenu
- [x] 4.4 Tests : login/logout, session forgée/révoquée, lien d'invitation consommé/expiré, token API révoqué (rédacteur vs admin vérifié en smoke, à couvrir en e2e avec 3.6)

## 5. Médias

- [x] 5.1 Interface de stockage + driver disque local (put/get/remove/url, anti-traversal, servi par `/api/media/file/[...key]`)
- [x] 5.2 Driver S3-compatible (SDK v3, URLs signées, endpoint custom pour MinIO/Garage) — implémenté et typé ; test d'intégration contre MinIO restant (profil compose `s3` prêt)
- [x] 5.3 Validation des uploads (20 Mo max, allowlist MIME fermée) + variantes webp 320/768/1280 par tâche asynchrone interne (sharp, fire-and-forget)
- [x] 5.4 Upload REST multipart (session requise), CRUD tRPC ; suppression = enregistrement + original + variantes (testé)

## 6. Self-hosting & documentation

- [x] 6.1 Dockerfile multi-stage Bun (user non-root `bun`, migrations embarquées via `COMMUN_MIGRATIONS_DIR`) ; job CI de build d'image sur main
- [x] 6.2 `docker-compose.yml` de référence (API + volume données, healthcheck) + profil `s3` MinIO + `.env.example` exhaustif
- [x] 6.3 Bootstrap du premier admin : lien d'invitation à usage unique loggé au premier boot d'une instance vierge (`COMMUN_ADMIN_EMAIL`), inerte dès qu'un utilisateur existe
- [x] 6.4 `docs/` (undocs) : auto-hébergement pas à pas, référence des variables d'env, sauvegarde/restauration (VACUUM INTO), guide contributeur
- [x] 6.5 Test de bout en bout VALIDÉ : `docker compose up` propre → `/health` OK → invitation bootstrap → acceptInvitation → login → token API → entrée `news` publiée via tRPC → lue via `/api/content/news`

## 7. Dérisquage migration (`@commun/legacy-migrate`)

- [ ] 7.1 Réceptionner le dump MongoDB de production Poulpus (mongodump des 4 organisations) — Quentin le fournit en temps voulu ; développer 7.2–7.5 sur un échantillon en attendant
- [x] 7.2 CLI citty (`@commun/legacy-migrate`) : lecture hors ligne bson (mongodump) et jsonl (mongoexport), sélection par slug — validée sur fixture d'échantillon
- [x] 7.3 Moteur de mapping : composants legacy → jeu fermé de types (fusion dans les collections seedées quand les slugs correspondent, création sinon), statuts/publication préservés, attributs orphelins → `legacy_extra`, entrées invalides conservées en quarantaine (`_invalidData`)
- [x] 7.4 Manifeste des médias (objet legacy → clé cible + entrées référentes) — transfert physique en phase 4
- [x] 7.5 Rapport de couverture JSON par organisation + sortie console ; migration idempotente (reconstruction complète, testée)
- [ ] 7.6 **Exécution sur le dump réel des 4 organisations (Grigny, LCSS, Pertuis, CMAR PACA)** ; analyse des 4 rapports ; ajustements du schéma v1 si des manques structurels apparaissent
- [ ] 7.7 Consigner les conclusions du dérisquage (écarts, décisions de mapping) dans le design du change

## 8. Clôture

- [x] 8.1 Audit de licences des dépendances de production : 100 % MIT ou Apache-2.0 (trpc, zod, nanoid, citty, consola, h3, nitro : MIT ; drizzle-orm/zod, sharp, bson, aws-sdk : Apache-2.0) — toutes compatibles AGPL v3
- [ ] 8.2 Revue croisée specs ↔ implémentation (`/opsx:verify`) et mise à jour de ROADMAP.md (phase 1 cochée, enseignements phase 4)

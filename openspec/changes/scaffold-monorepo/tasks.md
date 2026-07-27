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
- [x] 2.5 ~~Domaine `deliberations`~~ **Retiré (review 2026-07-23)** : fonctionnalité nouvelle, hors périmètre phase 1 (iso-fonctionnel existant) — reviendra avec le module IA
- [x] 2.6 ~~Domaine `forms`~~ **Retiré (review 2026-07-23)** : idem, fonctionnalité nouvelle hors périmètre phase 1
- [x] 2.7 Domaine `media` : enregistrements médias (mime, variantes, alt/légende)
- [x] 2.8 Colonne `legacy_extra` (JSON) sur chaque table de contenu + schémas Zod create/update par domaine (drizzle-zod)
- [x] 2.9 Moteur de collections : définitions (champs à jeu fermé de 8 types anglais), validation Zod générée, CRUD générique avec validation des entrées, cycle de publication
- [x] 2.10 Tests unitaires des queries (`bun test`) : schema + seed, collections (5 dont collection seedée et publication programmée), auth, tokens — 13 tests

## 3. API (`apps/api`)

- [x] 3.1 Router tRPC racine agrégeant les routers des domaines système (organization, users, apiTokens, deliberations, forms, media, collections), monté en catch-all `/api/trpc` ; contexte par requête (session, db, cookies)
- [x] 3.2 Middleware de protection : `protectedProcedure` (session) et `adminProcedure` (rôle) ; erreurs structurées + logs consola
- [x] 3.3 Route REST publique de contenu `/api/content/[domain]` : domaines système + fallback collections par slug (news, events, …), contenu publié uniquement, auth par token API
- [x] 3.4 ~~Route publique formulaires~~ **Retirée (review 2026-07-23)** : le plan REST public est désormais 100 % lecture seule
- [x] 3.5 `GET /health` (état DB) ; ~~garde placeholder~~ retirée sur review (pas d'heuristique de secrets) — aucun secret en dur ni valeur par défaut fonctionnelle
- [x] 3.6 E2E automatisés (Playwright + Gherkin, 12 scénarios verts) : health, cycle invitation→login (Bearer)→me→logout, rôles (redacteur FORBIDDEN sur users/collections, admin OK + invite), cycle de contenu complet (création collection → entrée draft → publication → visible sur /api/content ET /api/v1/content/records + slug dans deployment), header Authorization brut legacy, route wordpress statique — seed via script Bun
- [x] 3.7 Plan legacy-compat (review 2026-07-23) : `/api/v1/content/{records,deployment,wordpress-marseille-15-16}` ISO pour bascule des thèmes sans modification ; colonne `organization.deployment` (migration 0002) alimentée par la CLI de migration

## 4. Authentification

- [x] 4.1 Login email + mot de passe (argon2id via Bun.password), session opaque hashée en DB, cookie httpOnly/sameSite (+Secure en prod), logout et révocation
- [x] 4.2 Invitations à usage unique (`crypto.randomBytes`, expiration 7 j), définition du mot de passe, activation du compte
- [x] 4.3 Tokens API : génération affichée une fois, stockage hashé (sha256), révocation, restriction lecture seule au plan contenu
- [x] 4.4 Tests : login/logout, session forgée/révoquée, lien d'invitation consommé/expiré, token API révoqué (rédacteur vs admin vérifié en smoke, à couvrir en e2e avec 3.6)

## 5. Médias

- [x] 5.1 ~~Driver disque local~~ **Retiré (review 2026-07-23)** : S3-only iso legacy ; driver `unconfigured` à erreur explicite sans variables S3
- [x] 5.2 Driver S3-compatible (SDK v3 : presigned PUT, head, signed GET, delete ; endpoint custom MinIO/Garage) — test d'intégration MinIO restant (profil compose prêt)
- [x] 5.3 Flux d'upload iso legacy : requestUpload (allowlist MIME) → PUT direct client → finalize (head + enregistrement) ; resize **stubé par log** (7 variantes legacy, SQS sans worker) — implémentation réelle en fin de phase
- [x] 5.4 CRUD tRPC (requestUpload/finalize/list/update/remove) ; suppression = enregistrement + objets (testé sur double S3)

## 6. Self-hosting & documentation

- [x] 6.1 Dockerfile multi-stage Bun (user non-root `bun`, migrations embarquées via `COMMUN_MIGRATIONS_DIR`) ; job CI de build d'image sur main
- [x] 6.2 `docker-compose.yml` de référence (API + volume données, healthcheck) + profil `s3` MinIO + `.env.example` exhaustif
- [x] 6.3 Bootstrap du premier admin : lien d'invitation à usage unique loggé au premier boot d'une instance vierge (`COMMUN_ADMIN_EMAIL`), inerte dès qu'un utilisateur existe
- [x] 6.4 `docs/` (undocs) : auto-hébergement pas à pas, référence des variables d'env, sauvegarde/restauration (VACUUM INTO), guide contributeur
- [x] 6.5 Test de bout en bout VALIDÉ : `docker compose up` propre → `/health` OK → invitation bootstrap → acceptInvitation → login → token API → entrée `news` publiée via tRPC → lue via `/api/content/news`

## 7. Dérisquage migration (`@commun/legacy-migrate`)

- [x] 7.1 Dump mongodump de prod reçu (base `shared`, 90 Mo — 17 orgs, 7 396 records, 22 234 médias, 6 tokens) dans `.dump/` (gitignoré)
- [x] 7.2 CLI citty (`@commun/legacy-migrate`) : lecture hors ligne bson (mongodump) et jsonl (mongoexport), sélection par slug — validée sur fixture d'échantillon
- [x] 7.3 Moteur de mapping : composants legacy → jeu fermé de types (fusion dans les collections seedées quand les slugs correspondent, création sinon), statuts/publication préservés, attributs orphelins → `legacy_extra`, entrées invalides conservées en quarantaine (`_invalidData`)
- [x] 7.4 Manifeste des médias (objet legacy → clé cible + entrées référentes) — transfert physique en phase 4
- [x] 7.5 Rapport de couverture JSON par organisation + sortie console ; migration idempotente (reconstruction complète, testée)
- [x] 7.6 **Exécuté sur le dump réel** (grigny, lcss, ot-pertuis, cmar-paca + marseille15-16) : 100 % des collections mappées, ~7 200 entrées migrées, 2 entrées réellement corrompues en quarantaine (marseille) ; corrections majeures issues du réel : héritage de définitions par orgs GABARITS (path + collections[]), liens record→définition par SLUG, vocabulaire de types réel (text/wysiwyg/media/relation-*/json/integer/schedules/enumeration/array), valeurs complexes STRINGIFIÉES en Mongo (parse), slugs dupliqués (suffixe incrémental), insertion des lignes media (id = ObjectId legacy, clé S3 conservée), type `json` ajouté au jeu fermé
- [x] 7.7 Conclusions consignées dans le design ; test fonctionnel réel validé : API bootée sur la base migrée de Grigny, auth avec le token device AUTHENTIQUE du dump (header brut), payload records 14,3 Mo ISO (cover en tableau signé 7 variantes, wysiwyg stringifié avec mediaRecord + src signés, filtre events 265/277, records[] inverses), deployment avec 0 `_media:` non résolu et 584 slugs (suffixes incrémentaux réels)

## 9. Retours de l'audit de parité (annotations Quentin, 2026-07-23 — « ISO legacy »)

- [x] 9.1 Payload `content/records` ISO : rich-text résolu (mediaRecord + src signé) puis STRINGIFIÉ, champs media → tableaux de records legacy signés (7 variantes → original), `options.hidden` exclu, filtre events sans période, `records[]` (relations inverses) inclus
- [x] 9.2 Payload `content/deployment` ISO : résolution récursive `_media:<id>` dans `_theme`/`_pages` (médias signés)
- [x] 9.3 Type de champ `steps` (iso array-of-steps) + option `hidden` sur les champs ; mapper CLI à jour
- [x] 9.4 Médias : `list`/`get` tRPC retournent des `objects` en URLs SIGNÉES (iso lecture legacy), `metaData` persisté (base + métadonnées S3), TTL signé 7 jours, SVG retiré de l'allowlist
- [x] 9.5 Tokens API : la CLI importe les tokens legacy hashés (continuité de bascule — les sites gardent leur token)
- [x] 9.6 Entries ISO : slugify(fr) auto + suffixe incrémental, update PARTIEL (merge champ par champ), `publishedAt` auto à la publication, pagination skip/limit(20) + tri updatedAt desc, relations bidirectionnelles (`related` maintenu + migré)
- [x] 9.7 Audit trail `createdBy`/`updatedBy` (organization, definitions, entries, media) + métadonnées d'appareil des sessions (`ua`/`ip`, listées) ; `users.get` unitaire + `users.update` élargi (email)
- [x] 9.8 Collections : `editor`/`display`/`headings` en colonnes éditables + capturés par la CLI ; `organization.settings` en colonne dédiée (fix mapping settings→theme)
- [x] 9.9 **Emails transactionnels via Loops** (demande Quentin) : invitations + « mot de passe oublié » réel (le legacy n'envoyait jamais d'email) — change dédié
- [ ] 9.10 **Jobs legacy → Nitro tasks** (décision Quentin) : job-ssg-deploy et job-data-sync (APIDAE/Airtable) rapatriés en tasks appelant les services directement ; config `injector` migrée si simple — change dédié (avance la phase 4)
- [x] 9.11 **Admin legacy → client tRPC** (décision Quentin) : remplacer le client REST `_factory` de admin-fix par un client tRPC — aucune modification côté serveur ; prérequis du test admin
- [x] 9.12 Transverse sécurité (rate limiting, X-Request-Id, helmet/HSTS) → phase sécurité ultérieure (arbitré)

## 8. Clôture

- [x] 8.1 Audit de licences des dépendances de production : 100 % MIT ou Apache-2.0 (trpc, zod, nanoid, citty, consola, h3, nitro : MIT ; drizzle-orm/zod, sharp, bson, aws-sdk : Apache-2.0) — toutes compatibles AGPL v3
- [ ] 8.2 Revue croisée specs ↔ implémentation (`/opsx:verify`) et mise à jour de ROADMAP.md (phase 1 cochée, enseignements phase 4)

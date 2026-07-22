# Tasks — scaffold-monorepo

## 1. Ossature du monorepo

- [ ] 1.1 Copier l'ossature d'opencorp dans `commun.app/` (workspaces, tsconfig.base, scripts, structure apps/packages, docs/) — sans node_modules, .git ni artefacts de build
- [ ] 1.2 Purger la logique métier opencorp : domaines agents/channels/messages, event-queue, migrations Drizzle opencorp, fixtures et tests associés
- [ ] 1.3 Renommer `@opencorp/*` → `@commun/*` (package.json, imports, scripts, README) ; `apps/daemon` → `apps/api`
- [ ] 1.4 Vérifier `bun install` + `bun run typecheck` propres ; ajouter un check CI `grep -ri opencorp` = 0 occurrence
- [ ] 1.5 `git init`, LICENSE AGPL v3, README de lancement, premier commit
- [ ] 1.6 Workflow CI : typecheck + lint + `bun test` sur push

## 2. Schéma de données (`@commun/core`)

- [ ] 2.1 Configurer Drizzle + SQLite via `bun:sqlite` (connexion, drizzle-kit, application automatique des migrations au démarrage)
- [ ] 2.2 Domaine `collectivite` : settings d'instance en enregistrement unique (identité, coordonnées, thème, réseaux) — vocabulaire générique (communes, communautés de communes, autres collectivités)
- [ ] 2.3 Domaine `users` : utilisateurs, rôles admin/rédacteur, sessions, invitations, tokens API
- [ ] 2.4 Domaines de contenu : actualités, agenda (événements), élus, projets — avec statut draft/published et publication programmée
- [ ] 2.5 Domaine `deliberations` : séances (date, ordre du jour) + délibérations (numéro, objet, vote), publiables
- [ ] 2.6 Domaine `formulaires` : définitions de formulaires citoyens + soumissions
- [ ] 2.7 Domaine `medias` : enregistrements médias (mime, variantes, alt/légende)
- [ ] 2.8 Colonne `legacy_extra` (JSON) sur chaque table de contenu + schémas Zod create/update par domaine
- [ ] 2.9 Domaine `collections personnalisées` : table de définitions (champs à jeu fermé de types), validation Zod générée depuis la définition, CRUD générique, cycle de publication
- [ ] 2.10 Tests unitaires des queries de chaque domaine (`bun test`, base SQLite en mémoire)

## 3. API (`apps/api`)

- [ ] 3.1 Router tRPC racine agrégeant les routers de domaines, monté en catch-all `/api/trpc` ; contexte h3 (session, db)
- [ ] 3.2 Middleware de protection : procédures `protected` (session) et `adminOnly` (rôle) ; erreurs structurées + logs consola
- [ ] 3.3 Routes REST publiques de contenu (`/api/content/*`) : contenu publié par domaine, auth par token API
- [ ] 3.4 Route REST publique de soumission des formulaires citoyens, avec rate-limiting par IP
- [ ] 3.5 `GET /health` (version + état DB) ; refus de démarrage en prod si secrets manquants ou valeurs d'exemple
- [ ] 3.6 Tests d'intégration des routes clés (auth, CRUD actualité, contenu public, formulaire)

## 4. Authentification

- [ ] 4.1 Login email + mot de passe (hash argon2), session opaque en DB, cookie httpOnly/secure/sameSite, logout et révocation
- [ ] 4.2 Invitations à usage unique (`crypto.randomBytes`, expiration), définition du mot de passe, activation du compte
- [ ] 4.3 Tokens API : génération affichée une fois, stockage hashé, révocation, restriction lecture seule au plan contenu
- [ ] 4.4 Tests : login/logout, expiration de session, rédacteur vs admin, lien d'invitation consommé/expiré, token révoqué

## 5. Médias

- [ ] 5.1 Interface de stockage + driver disque local (upload, lecture servie par l'API, suppression)
- [ ] 5.2 Driver S3-compatible (URLs pré-signées upload/lecture, bucket par commune) — testé contre un émulateur (MinIO) en dev
- [ ] 5.3 Validation des uploads (taille, types MIME autorisés) + génération asynchrone des variantes webp (Nitro tasks + sharp)
- [ ] 5.4 CRUD bibliothèque de médias côté tRPC ; suppression = enregistrement + objets stockés

## 6. Self-hosting & documentation

- [ ] 6.1 Dockerfile multi-stage Bun (non-root) avec binding natif sharp fonctionnel (`bun:sqlite` intégré au runtime) ; build d'image en CI sur main
- [ ] 6.2 `docker-compose.yml` de référence (API + volumes données/médias) + profil optionnel S3 embarqué (MinIO ou Garage) + `.env.example` exhaustif
- [ ] 6.3 Bootstrap du premier admin (commande CLI, refusée si un admin existe)
- [ ] 6.4 Adapter `docs/` (undocs) : guide d'auto-hébergement pas à pas, référence des variables d'env, guide sauvegarde/restauration, guide contributeur
- [ ] 6.5 Test de bout en bout : `docker compose up` depuis un clone propre → `/health` OK → premier admin créé → une actualité créée via tRPC et lue via `/api/content`

## 7. Dérisquage migration (`@commun/legacy-migrate`)

- [ ] 7.1 Réceptionner le dump MongoDB de production Poulpus (mongodump des 4 organisations) — Quentin le fournit en temps voulu ; développer 7.2–7.5 sur un échantillon en attendant
- [ ] 7.2 CLI citty : lecture du dump hors ligne (bson/jsonl), sélection d'une organisation par slug
- [ ] 7.3 Moteur de mapping Collections/Records `attributes` JSON → domaines typés, relations (labels, records liés, médias) résolues, statuts préservés, champs orphelins → `legacy_extra`, Collections sans domaine cible → collections personnalisées
- [ ] 7.4 Manifeste des médias (objet legacy → destination cible + références remappées)
- [ ] 7.5 Rapport de couverture par organisation (migré par domaine, mappé vs legacy_extra, non mappé, erreurs) ; migration idempotente (reconstruction complète)
- [ ] 7.6 **Exécution sur le dump réel des 4 organisations (Grigny, LCSS, Pertuis, CMAR PACA)** ; analyse des 4 rapports ; ajustements du schéma v1 si des manques structurels apparaissent
- [ ] 7.7 Consigner les conclusions du dérisquage (écarts, décisions de mapping) dans le design du change

## 8. Clôture

- [ ] 8.1 Audit de licences des dépendances de production (compatibilité AGPL)
- [ ] 8.2 Revue croisée specs ↔ implémentation (`/opsx:verify`) et mise à jour de ROADMAP.md (phase 1 cochée, enseignements phase 4)

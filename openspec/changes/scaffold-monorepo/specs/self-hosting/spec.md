# self-hosting

## ADDED Requirements

### Requirement: Déploiement docker-compose
Le repo SHALL fournir un `docker-compose.yml` de référence démarrant une instance complète (API + volume de données SQLite) configurée uniquement par variables d'environnement, documentée dans un fichier `.env.example` exhaustif, ainsi qu'un profil embarquant un service S3-compatible auto-hébergé (MinIO) — les médias exigeant un stockage S3 (iso legacy, review du 2026-07-23).

#### Scenario: Démarrage en 10 minutes
- **WHEN** un hébergeur copie `.env.example` en `.env`, renseigne les secrets et exécute `docker compose up`
- **THEN** l'instance démarre, applique ses migrations, répond sur `/health` et permet la création du premier compte admin

#### Scenario: Persistance des données
- **WHEN** l'instance est arrêtée puis redémarrée via docker compose
- **THEN** la base SQLite est intacte (volume persistant) ; les médias vivent sur le stockage S3

#### Scenario: Profil S3 embarqué
- **WHEN** l'hébergeur démarre le compose avec le profil S3 activé
- **THEN** le service S3-compatible démarre avec l'instance et celle-ci l'utilise comme driver de stockage des médias

### Requirement: Bootstrap du premier administrateur
Une instance vierge SHALL offrir un mécanisme de création du premier compte admin (commande CLI ou token de bootstrap affiché au premier démarrage), impossible à rejouer une fois un admin existant.

#### Scenario: Instance déjà initialisée
- **WHEN** le mécanisme de bootstrap est invoqué alors qu'un admin existe déjà
- **THEN** l'opération est refusée

### Requirement: Documentation undocs
Le monorepo SHALL inclure un site de documentation (`docs/`, setup undocs repris d'opencorp) couvrant au minimum : guide d'auto-hébergement pas à pas, référence complète des variables d'environnement, guide de sauvegarde/restauration (fichier SQLite + médias), et guide contributeur.

#### Scenario: Build de la documentation
- **WHEN** on exécute le build de `docs/`
- **THEN** le site statique de documentation est généré sans erreur avec les 4 guides présents

### Requirement: Image Docker reproductible
L'API SHALL être buildable en image Docker (multi-stage, Bun, utilisateur non-root) et l'image SHALL être construite par la CI sur la branche principale.

#### Scenario: Build de l'image
- **WHEN** la CI construit l'image Docker de l'API
- **THEN** le build réussit et l'image démarre avec le binding natif sharp fonctionnel (`bun:sqlite` étant intégré au runtime)

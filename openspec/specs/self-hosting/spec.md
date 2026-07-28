# self-hosting Specification

## Purpose
TBD - created by archiving change scaffold-monorepo. Update Purpose after archive.
## Requirements
### Requirement: Déploiement docker-compose
Le repo SHALL fournir un `docker-compose.yml` de référence démarrant une instance complète (API + volume de données SQLite) configurée uniquement par variables d'environnement, documentée dans un fichier `.env.example` exhaustif — les médias exigeant un stockage S3-compatible EXTERNE (iso legacy ; Scaleway en production managée). Le profil « S3 auto-hébergé sur la même machine » a été retiré du compose de production (décision 2026-07-28) et reviendra en phase 6 avec Garage.

#### Scenario: Démarrage en 10 minutes
- **WHEN** un hébergeur copie `.env.example` en `.env`, renseigne les secrets et exécute `docker compose up`
- **THEN** l'instance démarre, applique ses migrations, répond sur `/health` (les comptes proviennent de la migration ou d'invitations)

#### Scenario: Persistance des données
- **WHEN** l'instance est arrêtée puis redémarrée via docker compose
- **THEN** la base SQLite est intacte (volume persistant) ; les médias vivent sur le stockage S3

#### Scenario: Profil S3 embarqué — RETIRÉ (décision 2026-07-28)
- Le compose de production ne porte plus de service S3 : stockage externe uniquement (Scaleway…). L'option tout-en-un reviendra en phase 6 avec Garage.

### Requirement: Aucun bootstrap du premier administrateur
L'instance SHALL NOT embarquer de mécanisme de bootstrap du premier admin (scripts/bootstrap-admin.ts SUPPRIMÉ — décision Quentin, 2026-07-28) : les comptes proviennent de la migration legacy ou d'une invitation. La création du premier admin d'une instance VIERGE reviendra avec le CLI d'instance (phase 4, `admin:create`).

#### Scenario: Instance vierge sans compte
- **WHEN** une instance démarre sur une base vide
- **THEN** aucun compte n'existe et aucun script de création n'est exposé — l'accès s'obtient par migration ou invitation

### Requirement: Documentation undocs
Le monorepo SHALL inclure un site de documentation (`docs/`, setup undocs repris d'opencorp) couvrant au minimum : guide d'auto-hébergement pas à pas, référence complète des variables d'environnement, guide de sauvegarde/restauration (fichier SQLite + médias), et guide contributeur.

#### Scenario: Build de la documentation
- **WHEN** on exécute le build de `docs/`
- **THEN** le site statique de documentation est généré sans erreur avec les 4 guides présents

### Requirement: Image Docker reproductible
L'API SHALL être buildable en image Docker (multi-stage, Bun, utilisateur non-root) et l'image SHALL être construite par la CI sur la branche principale.

#### Scenario: Build de l'image
- **WHEN** la CI construit l'image Docker de l'API
- **THEN** le build réussit et l'image démarre (`bun:sqlite` intégré au runtime ; sharp absent — il arrivera avec l'implémentation réelle des variantes d'images, reportée)


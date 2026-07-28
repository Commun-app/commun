# monorepo-workspace

## ADDED Requirements

### Requirement: Structure du monorepo Bun
Le projet SHALL être un monorepo Bun workspaces avec la structure `apps/*` (api, admin) et `packages/*` (core) — RECTIFICATIF (2026-07-28) : `legacy-migrate` est un projet bun LOCAL hors workspace et hors repo (gitignoré : il manipule des dumps de production), consommant `@commun/core` via `file:` —, un `tsconfig.base.json` partagé en TypeScript strict, et des packages nommés `@commun/<nom>`.

#### Scenario: Installation propre
- **WHEN** un contributeur clone le repo et exécute `bun install`
- **THEN** toutes les dépendances des workspaces s'installent sans erreur et `bun run typecheck` passe sur tous les packages

#### Scenario: Aucun résidu opencorp
- **WHEN** on recherche `opencorp` (insensible à la casse) dans les sources du monorepo
- **THEN** aucune occurrence n'est trouvée (hors éventuel crédit dans un fichier d'attribution)

### Requirement: Scripts de développement unifiés
La racine SHALL exposer les scripts `dev` (API en mode dev), `build`, `test`, `typecheck` et `lint`, opérant sur l'ensemble des workspaces via les filtres Bun.

#### Scenario: Démarrage dev
- **WHEN** un contributeur exécute `bun run dev`
- **THEN** l'API Nitro démarre en mode développement avec rechargement à chaud

### Requirement: Intégration continue
Le repo SHALL fournir un workflow CI exécutant typecheck, lint et tests sur chaque push, et le build de l'image Docker de l'API sur la branche principale.

#### Scenario: Push sur une branche
- **WHEN** un commit est poussé
- **THEN** la CI exécute typecheck, lint et la suite E2E (spécification exécutable — les tests unitaires du core ont été supprimés, décision revue 2026-07-28) et échoue si l'un d'eux échoue

### Requirement: Licence AGPL v3
Le repo SHALL être placé sous licence AGPL v3 (fichier `LICENSE`) et les dépendances du socle SHALL être compatibles avec une distribution AGPL (aucune dépendance propriétaire).

#### Scenario: Audit des dépendances
- **WHEN** l'audit de licences des dépendances de production est exécuté
- **THEN** aucune dépendance incompatible AGPL ou propriétaire (ex. TipTap Pro) n'est présente dans le socle

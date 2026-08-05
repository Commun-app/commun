# Commun

> Le CMS open source des communes et collectivités françaises — auto-hébergeable, souverain, avec IA intégrée.

**commun.app** permet à une collectivité (commune, communauté de communes…) de gérer son site public — actualités, agenda, élus, projets et toute collection de contenus sur mesure — depuis une administration simple, et de le publier en site statique rapide et accessible (RGAA). À venir sur la feuille de route : délibérations avec transcription IA des conseils, formulaires citoyens.

- **Open source** : AGPL v3 — auto-hébergez gratuitement, contribuez, auditez.
- **Single-tenant** : une instance = une collectivité. Sa base SQLite, ses médias, son serveur.
- **Souverain** : hébergeable en France, IA française (Mistral) pour la transcription des conseils municipaux et l'aide à la rédaction.

## Structure du monorepo

| Chemin | Rôle |
|---|---|
| `apps/api` | API single-tenant — Nitro v3 (tRPC admin + REST public minimal) |
| `packages/core` | Domaines métier, schéma Drizzle (SQLite via `bun:sqlite`), router tRPC |
| `docs/` | Documentation (UnDocs) — auto-hébergement, configuration, contribution |
| `e2e/` | Tests de bout en bout (Playwright + Gherkin) |

## Développement

Prérequis : [Bun](https://bun.sh) ≥ 1.1.

```sh
bun install
bun run dev          # API en dev sur http://127.0.0.1:3001
bun run test         # tests unitaires (packages/core)
bun run typecheck    # TypeScript sur tous les workspaces
bun run test:e2e     # tests e2e (build + boot de l'API)
```

## Licence

[AGPL v3](./LICENSE) — © contributors de Commun.

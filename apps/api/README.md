# @commun/api

API single-tenant de Commun — serveur [Nitro v3](https://nitro.build).

- **Plan admin** : tRPC monté sur `/api/trpc/*` (router défini dans `@commun/core`).
- **Plan public** : routes REST h3 réduites au strict minimum — contenu publié pour le build des sites (`/api/content/*`, token API) et soumission des formulaires citoyens.
- **Santé** : `GET /health`.

```sh
bun run dev        # depuis la racine du monorepo (scripts/dev.sh)
bun run dev:api    # uniquement l'API
```

Note : `bun --bun nitro dev` est nécessaire — le core importe `bun:sqlite`, indisponible sous Node.

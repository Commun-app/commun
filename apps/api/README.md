# @commun/api

API single-tenant de Commun — serveur [Nitro v3](https://nitro.build).

- **Plan admin** : tRPC monté sur `/api/trpc/*` (router défini dans `@commun/core`).
- **Plan public** : routes REST lecture seule pour le build des sites — `/api/content/<slug>` (token API) et le plan legacy-compat `/api/v1/content/{records,deployment,wordpress-marseille-15-16}` consommé tel quel par les thèmes actuels.
- **Santé** : `GET /health`.

```sh
bun run dev        # depuis la racine du monorepo (scripts/dev.sh)
bun run dev:api    # uniquement l'API
```

Note : `bun --bun nitro dev` est nécessaire — le core importe `bun:sqlite`, indisponible sous Node.

# Portail de connexion (silent-migration, D7) — app Nitro légère, aucune
# dépendance privée : image PUBLIQUE. Le mapping (PORTAL_MAP) est monté au
# déploiement, jamais dans l'image.
FROM oven/bun:1 AS build
WORKDIR /app

COPY package.json bun.lock .npmrc ./
COPY apps/api/package.json apps/api/
COPY apps/admin/package.json apps/admin/
COPY packages/core/package.json packages/core/
COPY packages/apidae-sync/package.json packages/apidae-sync/
COPY apps/portal/package.json apps/portal/
COPY patches ./patches
RUN bun install --no-save

COPY . .
RUN cd apps/portal && bun run build

FROM oven/bun:1 AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Mapping monté au déploiement (volume/fichier) — voir spec auth-portal.
ENV PORTAL_MAP=/data/portal-map.json

COPY --from=build /app/apps/portal/.output ./.output

USER bun
EXPOSE 3000
ENV PORT=3000

CMD ["bun", ".output/server/index.mjs"]

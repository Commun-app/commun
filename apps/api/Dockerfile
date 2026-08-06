# Image API OPEN SOURCE (spec self-hosting) : l'API seule, 100 % AGPL —
# c'est l'image publique que n'importe qui peut self-hoster (ghcr
# commun-api), celle du smoke CI et du docker-compose. L'image d'INSTANCE
# (API + admin, publiable elle aussi depuis la sortie de prose/TipTap Pro)
# est à côté : Dockerfile.instance.
FROM oven/bun:1 AS build
WORKDIR /app

# Workspace manifests first for layer-cached installs.
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/admin/package.json apps/admin/
COPY packages/core/package.json packages/core/
COPY packages/apidae-sync/package.json packages/apidae-sync/
COPY apps/portal/package.json apps/portal/
RUN bun install --frozen-lockfile

COPY . .
RUN bun --filter @commun/api build

FROM oven/bun:1 AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV COMMUN_DATA_DIR=/data
# The bundle cannot resolve migrations relative to source files — ship them
# explicitly and point the core at them.
ENV COMMUN_MIGRATIONS_DIR=/app/drizzle

COPY --from=build /app/apps/api/.output ./.output
COPY --from=build /app/packages/core/drizzle ./drizzle

RUN mkdir -p /data && chown bun:bun /data
USER bun
VOLUME /data
EXPOSE 3000

CMD ["bun", ".output/server/index.mjs"]

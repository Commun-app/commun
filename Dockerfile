# Commun API — multi-stage Bun image (spec self-hosting).
FROM oven/bun:1 AS build
WORKDIR /app

# Workspace manifests first for layer-cached installs.
# --no-save : sans token, bun ne sait sauter @poulpus/prose (optionnelle,
# registre privé) qu'en install non-frozen, et celle-ci élaguerait le
# lockfile — --no-save installe sans jamais l'écrire. L'image ne construit
# que l'API ; disparaît avec prose (phase 4, TipTap OSS).
COPY package.json bun.lock .npmrc ./
COPY apps/api/package.json apps/api/
COPY apps/admin/package.json apps/admin/
COPY packages/core/package.json packages/core/
COPY packages/apidae-sync/package.json packages/apidae-sync/
# patchedDependencies (prose) : bun lit patches/ à l'install — sans tokens la
# patchée n'est pas installée, mais le dossier doit exister.
COPY patches ./patches
RUN bun install --no-save

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

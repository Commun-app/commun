# Commun API — multi-stage Bun image (spec self-hosting).
FROM oven/bun:1 AS build
WORKDIR /app

# Workspace manifests first for layer-cached installs.
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY packages/core/package.json packages/core/
COPY packages/legacy-migrate/package.json packages/legacy-migrate/
RUN bun install --frozen-lockfile

COPY . .
RUN bun --filter @commun/api build
# Standalone first-admin bootstrap CLI (spec self-hosting) — bundled so the
# runtime image needs no workspace sources.
RUN bun build scripts/bootstrap-admin.ts --target=bun --outfile=bootstrap-admin.mjs

FROM oven/bun:1 AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV COMMUN_DATA_DIR=/data
# The bundle cannot resolve migrations relative to source files — ship them
# explicitly and point the core at them.
ENV COMMUN_MIGRATIONS_DIR=/app/drizzle

COPY --from=build /app/apps/api/.output ./.output
COPY --from=build /app/packages/core/drizzle ./drizzle
COPY --from=build /app/bootstrap-admin.mjs ./bootstrap-admin.mjs

RUN mkdir -p /data && chown bun:bun /data
USER bun
VOLUME /data
EXPOSE 3000

CMD ["bun", ".output/server/index.mjs"]

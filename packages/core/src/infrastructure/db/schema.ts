// Drizzle schema of the single-tenant instance database — aggregation point.
//
// Each domain owns its tables (src/domains/<domaine>/schema.ts); this module
// re-exports them so `connectDb` gets the full typed schema and drizzle-kit
// sees every table from one entrypoint. Every content table carries a
// `legacy_extra` JSON column so nothing is lost when migrating from the
// legacy Mongo platform.

export * from '../../domains/collectivite/schema.ts';
export * from '../../domains/users/schema.ts';
export * from '../../domains/medias/schema.ts';
export * from '../../domains/actualites/schema.ts';
export * from '../../domains/agenda/schema.ts';
export * from '../../domains/elus/schema.ts';
export * from '../../domains/projets/schema.ts';
export * from '../../domains/deliberations/schema.ts';
export * from '../../domains/formulaires/schema.ts';
export * from '../../domains/collections/schema.ts';

// Drizzle schema of the single-tenant instance database — aggregation point.
//
// Each domain owns its tables (src/domains/<domain>/schema.ts); this module
// re-exports them so `connectDb` gets the full typed schema and drizzle-kit
// sees every table from one entrypoint.
//
// Content model: ALL content lives in the generic collections engine (default
// collections seeded by migration) — phase 1 reproduces the legacy platform
// iso-functionally, no new features. Every content table carries a
// `legacy_extra` JSON column so nothing is lost when migrating from the
// legacy Mongo platform.

export * from '../../domains/organization/schema.ts';
export * from '../../domains/users/schema.ts';
export * from '../../domains/media/schema.ts';
export * from '../../domains/collections/schema.ts';

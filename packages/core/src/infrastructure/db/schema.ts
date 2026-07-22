// Drizzle schema of the single-tenant instance database — aggregation point.
//
// Each domain owns its tables (src/domains/<domain>/schema.ts); this module
// re-exports them so `connectDb` gets the full typed schema and drizzle-kit
// sees every table from one entrypoint.
//
// Content model: standard content (news, events, officials, projects) lives in
// the generic collections engine, seeded by migration. Deliberations keep a
// typed schema (structured votes, AI transcription target). Every content
// table carries a `legacy_extra` JSON column so nothing is lost when
// migrating from the legacy Mongo platform.

export * from '../../domains/organization/schema.ts';
export * from '../../domains/users/schema.ts';
export * from '../../domains/media/schema.ts';
export * from '../../domains/deliberations/schema.ts';
export * from '../../domains/forms/schema.ts';
export * from '../../domains/collections/schema.ts';

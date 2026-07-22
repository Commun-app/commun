// Drizzle schema of the single-tenant instance database.
//
// Domain tables land here per capability (see openspec/changes/scaffold-monorepo):
// collectivite, users/sessions/invitations/api-tokens, actualites, agenda,
// elus, projets, deliberations/seances, formulaires, medias, collections
// personnalisées. Every content table carries a `legacy_extra` JSON column so
// nothing is lost when migrating from the legacy Mongo platform.

export {};

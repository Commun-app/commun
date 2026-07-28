// Shared base types. Deliberately plain aliases (not branded) for the MVP —
// they document intent at call-sites without rippling nominal typing through
// the whole codebase. Promote to branded types in a dedicated change if id/
// timestamp mix-ups ever become a real problem.

/** An opaque entity identifier (UUID). */
export type Id = string;

/** An ISO-8601 timestamp string (e.g. `new Date().toISOString()`). */
export type IsoTimestamp = string;

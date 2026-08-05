/**
 * Columns the outside never supplies. Every write DTO omits them, so a client
 * can neither forge an identity nor rewrite an audit trail.
 *
 * They come in two sets because not every table carries the full audit trail —
 * `organization` has no `createdBy`, being created once at install.
 */
export const SYSTEM_COLUMNS = {
  id: true,
  createdAt: true,
  updatedAt: true,
  legacyExtra: true,
} as const;

/** Audit trail, stamped by the services from the session. */
export const AUDIT_COLUMNS = {
  createdBy: true,
  updatedBy: true,
} as const;

/** The usual set: system columns plus a full audit trail. */
export const WRITE_OMIT = { ...SYSTEM_COLUMNS, ...AUDIT_COLUMNS } as const;

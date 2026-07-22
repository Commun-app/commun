import { and, eq, isNull, lte, or, type SQL } from 'drizzle-orm';
import { text, type SQLiteColumn } from 'drizzle-orm/sqlite-core';
import { nanoid } from 'nanoid';

/** Primary key: opaque nanoid, generated at insert time. */
export const id = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => nanoid());

export const createdAt = () =>
  text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString());

export const updatedAt = () =>
  text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString())
    .$onUpdateFn(() => new Date().toISOString());

/**
 * Catch-all for legacy attributes with no typed destination — populated only
 * by the Mongo migration CLI so nothing is lost (spec: core-domains).
 */
export const legacyExtra = () =>
  text('legacy_extra', { mode: 'json' }).$type<Record<string, unknown> | null>();

/** Publication lifecycle shared by every publishable content table. */
export const publicationStatus = () =>
  text('status', { enum: ['draft', 'published'] })
    .notNull()
    .default('draft');

/** ISO timestamp from which a published item is publicly visible (schedulable). */
export const publishedAt = () => text('published_at');

/**
 * WHERE clause of the public plane: status=published AND (publishedAt unset OR
 * past). Shared by every publishable domain — scheduled items stay hidden.
 */
export const publishedWhere = (
  table: { status: SQLiteColumn; publishedAt: SQLiteColumn },
  now: string = new Date().toISOString(),
): SQL =>
  and(
    eq(table.status, 'published'),
    or(isNull(table.publishedAt), lte(table.publishedAt, now)),
  )!;

import { nanoid } from 'nanoid';

/**
 * Generate a new opaque entity id. Centralized so the id length/alphabet is a
 * single decision; domains call `newId()` instead of reaching for nanoid.
 */
export function newId(size = 10): string {
  return nanoid(size);
}

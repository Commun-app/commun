import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Code from '@tiptap/extension-code';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import { communStarterKit, communSchemaExtensions } from '../../src/extensions.ts';

/**
 * Headless editor built with the exact production assembly, plugins
 * included — plugin-level mutations are invisible to a schema-only check.
 */
export function createHarnessEditor(
  content: unknown,
  { onContentError }: { onContentError?: (error: Error) => void } = {},
) {
  return new Editor({
    extensions: [
      StarterKit.configure({ ...communStarterKit, horizontalRule: false }),
      Code.extend({ excludes: 'code' }),
      HorizontalRule,
      ...communSchemaExtensions(),
    ],
    content: content as any,
    enableContentCheck: true,
    onContentError({ error }) {
      onContentError?.(error);
    },
  });
}

/**
 * Canonical form for comparison. ProseMirror equivalence: a null attribute
 * and an absent key denote the same document (toJSON materializes defaults),
 * and an empty `attrs` equals no `attrs`.
 */
export function canon(value: any, isAttrs = false): any {
  if (Array.isArray(value)) return value.map((v) => canon(v));
  if (value && typeof value === 'object') {
    const entries = Object.keys(value)
      .sort()
      .filter((k) => !(isAttrs && value[k] === null))
      .map((k) => [k, canon(value[k], k === 'attrs')])
      .filter(([k, v]) => !(k === 'attrs' && v && typeof v === 'object' && !Object.keys(v).length));
    return Object.fromEntries(entries);
  }
  return value;
}

export const sameDoc = (a: unknown, b: unknown) =>
  JSON.stringify(canon(a)) === JSON.stringify(canon(b));

/** Readable structural diff: path(type) with lost/added/changed keys. */
export function* diffNode(a: any, b: any, path = '$'): Generator<string> {
  if (a === undefined || b === undefined || a?.type !== b?.type) {
    yield `${path} type: ${a?.type} → ${b?.type}`;
    return;
  }
  const ka = Object.keys(a.attrs ?? {});
  const kb = Object.keys(b.attrs ?? {});
  for (const k of ka.filter((k) => !kb.includes(k))) yield `${path}(${a.type}) attr -${k}`;
  for (const k of kb.filter((k) => !ka.includes(k)))
    yield `${path}(${a.type}) attr +${k}=${JSON.stringify(b.attrs[k])}`;
  for (const k of ka.filter((k) => kb.includes(k)))
    if (JSON.stringify(a.attrs[k]) !== JSON.stringify(b.attrs[k]))
      yield `${path}(${a.type}) attr ${k}: ${JSON.stringify(a.attrs[k])} → ${JSON.stringify(b.attrs[k])}`;
  const ma = (a.marks ?? []).map((m: any) => m.type).join();
  const mb = (b.marks ?? []).map((m: any) => m.type).join();
  if (ma !== mb) yield `${path}(${a.type}) marks: [${ma}] → [${mb}]`;
  if ((a.text ?? null) !== (b.text ?? null)) yield `${path}(${a.type}) text modifié`;
  const ca = a.content ?? [];
  const cb = b.content ?? [];
  if (ca.length !== cb.length) yield `${path}(${a.type}) enfants: ${ca.length} → ${cb.length}`;
  for (let i = 0; i < Math.min(ca.length, cb.length); i++)
    yield* diffNode(ca[i], cb[i], `${path}.${i}`);
}

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const isUuidV4 = (value: unknown): boolean =>
  typeof value === 'string' && UUID_V4.test(value);

/**
 * Differences allowed between a stored document and its unmodified resave.
 * Each family matches the previous editor's behavior; the inventory in
 * openspec/changes/refonte-admin-ui documents them. Anything else is a
 * regression.
 */
export function isAllowedDiff(line: string): boolean {
  // Null default materialized (PM equivalence).
  if (/attr \+\w+=null$/.test(line)) return true;
  // Missing uid filled on open with a v4 UUID.
  const uidAdd = line.match(/attr \+uid="([0-9a-f-]+)"$/);
  if (uidAdd) return isUuidV4(uidAdd[1]);
  // Dead legacy key the schema no longer declares.
  if (/\((file|image)\) attr -data$/.test(line)) return true;
  return false;
}

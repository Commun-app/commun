import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { beforeAll, describe, expect, test } from 'bun:test';
import { CORPUS } from './harness/corpus.ts';
import {
  createHarnessEditor,
  diffNode,
  isAllowedDiff,
  isUuidV4,
  sameDoc,
} from './harness/assembly.ts';
import { sanitizeDoc } from '../src/sanitize.ts';

/**
 * Content-conservation harness. It does not re-test TipTap: it pins OUR
 * assembly — uid configuration, disabled StarterKit parts, custom node
 * attribute sets — so stored client documents round-trip unchanged.
 * TipTap upgrades tend to add attributes or reorder marks silently; zero
 * unexplained diff is the contract (spec admin-editor). CI runs the
 * synthetic corpus; a private sweep covers the real client databases.
 */

beforeAll(() => {
  GlobalRegistrator.register();
});

const roundTrip = (doc: unknown) => {
  const errors: Error[] = [];
  const editor = createHarnessEditor(doc, { onContentError: (e) => errors.push(e) });
  const out = editor.getJSON();
  editor.destroy();
  return { out, errors };
};

describe('content conservation', () => {
  for (const { name, expect: expectation, doc } of CORPUS) {
    if (expectation === 'invalid') {
      test(`${name} — reported, never silent`, () => {
        const { errors } = roundTrip(doc);
        expect(errors.length).toBeGreaterThan(0);
      });

      test(`${name} — repaired by sanitizeDoc then conserved`, () => {
        const repaired = sanitizeDoc(structuredClone(doc));
        const { out, errors } = roundTrip(repaired);
        expect(errors).toHaveLength(0);
        expect(sameDoc(repaired, out)).toBe(true);
      });
      continue;
    }

    test(name, () => {
      const { out, errors } = roundTrip(doc);
      expect(errors).toHaveLength(0);

      if (expectation === 'identical' && sameDoc(doc, out)) return;

      // Only documented families are allowed, and only for normalized docs.
      const diffs = [...diffNode(doc, out)];
      const unexpected = diffs.filter((line) => !isAllowedDiff(line));
      expect(unexpected).toEqual([]);
      if (expectation === 'identical') {
        // A complete document must not even produce allowed diffs.
        expect(diffs).toEqual([]);
      }
    });
  }

  test('existing uids are never regenerated, even after editing', () => {
    const source = CORPUS[0]!.doc;
    const editor = createHarnessEditor(source);
    // A real edit: text appended to the first paragraph.
    editor.commands.insertContentAt(editor.state.doc.child(0).nodeSize - 1, ' (édité)');
    const out = editor.getJSON();
    editor.destroy();

    const collectUids = (node: any, acc: Map<string, string>) => {
      if (node?.attrs?.uid) acc.set(JSON.stringify(node.attrs.uid), node.type);
      for (const child of node?.content ?? []) collectUids(child, acc);
      return acc;
    };
    const before = collectUids(source, new Map());
    const after = collectUids(out, new Map());
    for (const uid of before.keys()) {
      expect(after.has(uid)).toBe(true);
    }
  });

  test('a newly created block receives a fresh v4 uid', () => {
    const editor = createHarnessEditor(CORPUS[0]!.doc);
    editor.commands.insertContentAt(editor.state.doc.content.size, {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Bloc ajouté.' }],
    });
    const out = editor.getJSON();
    editor.destroy();
    const added = out.content?.at(-1);
    expect(added?.type).toBe('paragraph');
    expect(isUuidV4(added?.attrs?.uid)).toBe(true);
  });
});

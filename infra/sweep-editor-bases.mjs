// LOCAL sweep of the client databases through the real editor. Never in CI:
// client dumps (.dump/, gitignored) stay on this machine.
//
//   bun infra/sweep-editor-bases.mjs [databases root]
//
// Defaults to ../.dump/migrated/<client>/commun.db. Re-run against fresh
// production dumps before switching any screen to the new editor.
import { Database } from 'bun:sqlite';
import GlobalRegistrator from '../packages/editor/node_modules/@happy-dom/global-registrator/lib/GlobalRegistrator.js';

GlobalRegistrator.register();

const { createHarnessEditor, sameDoc, diffNode, isAllowedDiff } = await import(
  '../packages/editor/test/harness/assembly.ts'
);
const { sanitizeDoc } = await import('../packages/editor/src/sanitize.ts');

const ROOT = process.argv[2] ?? new URL('../.dump/migrated', import.meta.url).pathname;
const CLIENTS = ['grigny', 'cmar-paca', 'lcss', 'ot-pertuis'];

const findDocs = (value, out) => {
  if (Array.isArray(value)) {
    for (const v of value) findDocs(v, out);
    return;
  }
  if (value && typeof value === 'object') {
    if (value.type === 'doc' && Array.isArray(value.content)) {
      out.push(value);
      return;
    }
    for (const v of Object.values(value)) findDocs(v, out);
  }
};

let total = 0;
let identical = 0;
let normalized = 0;
let repaired = 0;
const regressions = [];

// sanitizeDoc warns would flood the report.
const originalWarn = console.warn;
console.warn = () => {};

for (const client of CLIENTS) {
  const db = new Database(`${ROOT}/${client}/commun.db`, { readonly: true });
  for (const { id, data } of db.query('SELECT id, data FROM entries').all()) {
    if (!data?.includes('"doc"')) continue;
    const docs = [];
    try {
      findDocs(JSON.parse(data), docs);
    } catch {
      continue;
    }
    for (const doc of docs) {
      total++;
      const clean = sanitizeDoc(doc);
      if (clean !== doc) repaired++;

      const errors = [];
      let out;
      try {
        const editor = createHarnessEditor(clean, { onContentError: (e) => errors.push(e) });
        out = editor.getJSON();
        editor.destroy();
      } catch (error) {
        regressions.push(`${client}/${id} : LEVÉ ${String(error).slice(0, 120)}`);
        continue;
      }
      if (errors.length) {
        regressions.push(`${client}/${id} : contentError ${errors[0]?.message?.slice(0, 100)}`);
        continue;
      }
      if (sameDoc(clean, out)) {
        identical++;
        continue;
      }
      const bad = [...diffNode(clean, out)].filter((line) => !isAllowedDiff(line));
      if (!bad.length) {
        normalized++;
        continue;
      }
      for (const line of bad.slice(0, 3))
        regressions.push(`${client}/${id} : ${line.slice(0, 160)}`);
    }
  }
  db.close();
}

console.warn = originalWarn;

console.log(`\n${total} documents (real editor, plugins active)`);
console.log(`  ${identical} identical`);
console.log(`  ${normalized} normalized (allowed families)`);
console.log(`  ${repaired} repaired on open (empty text nodes)`);
console.log(`  ${regressions.length} REGRESSION(S)`);
for (const line of regressions.slice(0, 30)) console.log(`    ✗ ${line}`);
process.exit(regressions.length ? 1 : 0);

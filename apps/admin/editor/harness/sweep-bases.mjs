// Balayage LOCAL des bases clients à travers le VRAI éditeur (happy-dom) —
// le second étage du harnais de conservation (D9). Jamais en CI : les dumps
// clients (.dump/, gitignoré) ne quittent pas la machine.
//
//   bun editor/harness/sweep-bases.mjs [chemin des bases]
//
// Par défaut : ../../.dump/migrated/<client>/commun.db (les 4 clients).
// Avant une bascule d'écrans : le repasser sur des dumps de PROD frais.
import { Database } from 'bun:sqlite'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register()

const { createHarnessEditor, sameDoc, diffNode, isAllowedDiff } = await import(
  './assembly.ts'
)
const { sanitizeDoc } = await import('../schema.ts')

const ROOT = process.argv[2] ?? new URL('../../../../.dump/migrated', import.meta.url).pathname
const CLIENTS = ['grigny', 'cmar-paca', 'lcss', 'ot-pertuis']

const findDocs = (value, out) => {
  if (Array.isArray(value)) {
    for (const v of value) findDocs(v, out)
    return
  }
  if (value && typeof value === 'object') {
    if (value.type === 'doc' && Array.isArray(value.content)) {
      out.push(value)
      return
    }
    for (const v of Object.values(value)) findDocs(v, out)
  }
}

let total = 0
let identical = 0
let normalized = 0
let repaired = 0
const regressions = []

// Les warn de sanitizeDoc pollueraient le rapport : compteur silencieux.
const originalWarn = console.warn
console.warn = () => {}

for (const client of CLIENTS) {
  const db = new Database(`${ROOT}/${client}/commun.db`, { readonly: true })
  for (const { id, data } of db.query('SELECT id, data FROM entries').all()) {
    if (!data?.includes('"doc"')) continue
    const docs = []
    try {
      findDocs(JSON.parse(data), docs)
    } catch {
      continue
    }
    for (const doc of docs) {
      total++
      const clean = sanitizeDoc(doc)
      if (clean !== doc) repaired++

      const errors = []
      let out
      try {
        const editor = createHarnessEditor(clean, { onContentError: (e) => errors.push(e) })
        out = editor.getJSON()
        editor.destroy()
      } catch (error) {
        regressions.push(`${client}/${id} : LEVÉ ${String(error).slice(0, 120)}`)
        continue
      }
      if (errors.length) {
        regressions.push(`${client}/${id} : contentError ${errors[0]?.message?.slice(0, 100)}`)
        continue
      }
      if (sameDoc(clean, out)) {
        identical++
        continue
      }
      const bad = [...diffNode(clean, out)].filter((line) => !isAllowedDiff(line))
      if (!bad.length) {
        normalized++
        continue
      }
      for (const line of bad.slice(0, 3)) regressions.push(`${client}/${id} : ${line.slice(0, 160)}`)
    }
  }
  db.close()
}

console.warn = originalWarn

console.log(`\n${total} documents (éditeur réel, plugins actifs)`)
console.log(`  ${identical} identiques`)
console.log(`  ${normalized} normalisés (familles admises : +uid rempli, -data legacy)`)
console.log(`  ${repaired} réparés à l'ouverture (nœuds texte vides)`)
console.log(`  ${regressions.length} RÉGRESSION(S)`)
for (const line of regressions.slice(0, 30)) console.log(`    ✗ ${line}`)
process.exit(regressions.length ? 1 : 0)

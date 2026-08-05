import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { beforeAll, describe, expect, test } from 'bun:test'
import { CORPUS } from './harness/corpus.ts'
import {
  createHarnessEditor,
  diffNode,
  isAllowedDiff,
  isUuidV4,
  sameDoc,
} from './harness/assembly.ts'
import { sanitizeDoc } from './schema.ts'

/**
 * Harnais de conservation du contenu (D9, spec admin-editor) : chaque
 * document du corpus est chargé dans un VRAI éditeur (happy-dom) — même
 * assemblage que l'UEditor de production — puis relu sans intervention.
 * Zéro écart hors familles documentées, sinon le test nomme le document,
 * le chemin, le type et la nature de l'écart.
 *
 * CI : corpus synthétique committé (jamais de donnée client — dépôt public).
 * Le balayage des 4 vraies bases est local : `bun editor/harness/sweep-bases.mjs`.
 */

beforeAll(() => {
  GlobalRegistrator.register()
})

const roundTrip = (doc: unknown) => {
  const errors: Error[] = []
  const editor = createHarnessEditor(doc, { onContentError: (e) => errors.push(e) })
  const out = editor.getJSON()
  editor.destroy()
  return { out, errors }
}

describe('conservation du contenu (D9)', () => {
  for (const { name, expect: expectation, doc } of CORPUS) {
    if (expectation === 'invalid') {
      test(`${name} — signalé, jamais silencieux`, () => {
        const { errors } = roundTrip(doc)
        expect(errors.length).toBeGreaterThan(0)
      })

      test(`${name} — réparé par sanitizeDoc puis conservé`, () => {
        const repaired = sanitizeDoc(structuredClone(doc))
        const { out, errors } = roundTrip(repaired)
        expect(errors).toHaveLength(0)
        expect(sameDoc(repaired, out)).toBe(true)
      })
      continue
    }

    test(name, () => {
      const { out, errors } = roundTrip(doc)
      expect(errors).toHaveLength(0)

      if (expectation === 'identical' && sameDoc(doc, out)) return

      // Écarts : seules les familles documentées (inventaire-extensions.md)
      // sont admises — et uniquement pour les documents `normalized`.
      const diffs = [...diffNode(doc, out)]
      const unexpected = diffs.filter((line) => !isAllowedDiff(line))
      expect(unexpected).toEqual([])
      if (expectation === 'identical') {
        // Un document complet ne doit même pas produire d'écart admis.
        expect(diffs).toEqual([])
      }
    })
  }

  test('uid existants : jamais régénérés, même après édition (invariant D2)', () => {
    const source = CORPUS[0].doc
    const editor = createHarnessEditor(source)
    // Une édition réelle : du texte ajouté en fin de premier paragraphe.
    editor.commands.insertContentAt(editor.state.doc.child(0).nodeSize - 1, ' (édité)')
    const out = editor.getJSON()
    editor.destroy()

    const collectUids = (node: any, acc: Map<string, string>) => {
      if (node?.attrs?.uid) acc.set(JSON.stringify(node.attrs.uid), node.type)
      for (const child of node?.content ?? []) collectUids(child, acc)
      return acc
    }
    const before = collectUids(source, new Map())
    const after = collectUids(out, new Map())
    for (const uid of before.keys()) {
      expect(after.has(uid)).toBe(true)
    }
  })

  test('un bloc créé par édition reçoit un uid v4 neuf', () => {
    const editor = createHarnessEditor(CORPUS[0].doc)
    editor.commands.insertContentAt(editor.state.doc.content.size, {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Bloc ajouté.' }],
    })
    const out = editor.getJSON()
    editor.destroy()
    const added = out.content?.at(-1)
    expect(added?.type).toBe('paragraph')
    expect(isUuidV4(added?.attrs?.uid)).toBe(true)
  })
})

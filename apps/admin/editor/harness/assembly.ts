import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Code from '@tiptap/extension-code'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import { communStarterKit, communSchemaExtensions } from '../schema.ts'

/**
 * Harnais de conservation (D9) — assemblage HEADLESS strictement équivalent
 * à ce que l'UEditor monte en production : StarterKit (défauts UEditor + la
 * config communStarterKit) + les Code/HorizontalRule retouchés que l'UEditor
 * ajoute + le jeu d'extensions de parité. Un vrai `Editor` est instancié
 * (happy-dom) : contrairement au contrôle de schéma, il exerce AUSSI les
 * plugins (remplissage d'uid, input rules…) — là où vivent les mutations
 * silencieuses.
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
      onContentError?.(error)
    },
  })
}

/**
 * Canonisation pour comparaison : clés triées, et équivalence ProseMirror —
 * un attr à `null` et une clé absente désignent le MÊME document (toJSON
 * matérialise les défauts). `attrs` vide ≡ absent.
 */
export function canon(value: any, isAttrs = false): any {
  if (Array.isArray(value)) return value.map((v) => canon(v))
  if (value && typeof value === 'object') {
    const entries = Object.keys(value)
      .sort()
      .filter((k) => !(isAttrs && value[k] === null))
      .map((k) => [k, canon(value[k], k === 'attrs')])
      .filter(
        ([k, v]) =>
          !(k === 'attrs' && v && typeof v === 'object' && !Object.keys(v).length),
      )
    return Object.fromEntries(entries)
  }
  return value
}

export const sameDoc = (a: unknown, b: unknown) =>
  JSON.stringify(canon(a)) === JSON.stringify(canon(b))

/** Diff structurel lisible : chemin(type) → clé perdue/ajoutée/changée. */
export function* diffNode(a: any, b: any, path = '$'): Generator<string> {
  if (a === undefined || b === undefined || a?.type !== b?.type) {
    yield `${path} type: ${a?.type} → ${b?.type}`
    return
  }
  const ka = Object.keys(a.attrs ?? {})
  const kb = Object.keys(b.attrs ?? {})
  for (const k of ka.filter((k) => !kb.includes(k))) yield `${path}(${a.type}) attr -${k}`
  for (const k of kb.filter((k) => !ka.includes(k)))
    yield `${path}(${a.type}) attr +${k}=${JSON.stringify(b.attrs[k])}`
  for (const k of ka.filter((k) => kb.includes(k)))
    if (JSON.stringify(a.attrs[k]) !== JSON.stringify(b.attrs[k]))
      yield `${path}(${a.type}) attr ${k}: ${JSON.stringify(a.attrs[k])} → ${JSON.stringify(b.attrs[k])}`
  const ma = (a.marks ?? []).map((m: any) => m.type).join()
  const mb = (b.marks ?? []).map((m: any) => m.type).join()
  if (ma !== mb) yield `${path}(${a.type}) marks: [${ma}] → [${mb}]`
  if ((a.text ?? null) !== (b.text ?? null)) yield `${path}(${a.type}) text modifié`
  const ca = a.content ?? []
  const cb = b.content ?? []
  if (ca.length !== cb.length) yield `${path}(${a.type}) enfants: ${ca.length} → ${cb.length}`
  for (let i = 0; i < Math.min(ca.length, cb.length); i++)
    yield* diffNode(ca[i], cb[i], `${path}.${i}`)
}

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
export const isUuidV4 = (value: unknown): boolean =>
  typeof value === 'string' && UUID_V4.test(value)

/**
 * Écarts ADMIS entre l'original et le ré-enregistrement — chaque famille est
 * documentée dans inventaire-extensions.md et correspond au comportement de
 * l'admin ACTUEL (prose) :
 * - `+uid` avec un UUID v4 là où l'original n'en avait pas (remplissage à
 *   l'ouverture, ~209 reliquats de migration) ;
 * - `-data` sur file/image (clé legacy morte, non déclarée par le schéma —
 *   le prose actuel la perd pareil).
 * Toute autre différence est une RÉGRESSION.
 */
export function isAllowedDiff(line: string): boolean {
  // Matérialisation d'un défaut null (équivalence PM : attr null ≡ absent).
  if (/attr \+\w+=null$/.test(line)) return true
  // Remplissage d'un uid manquant à l'ouverture, en UUID v4 (iso prose).
  const uidAdd = line.match(/attr \+uid="([0-9a-f-]+)"$/)
  if (uidAdd) return isUuidV4(uidAdd[1])
  // Clé legacy morte, non déclarée par le schéma (le prose actuel la perd pareil).
  if (/\((file|image)\) attr -data$/.test(line)) return true
  return false
}

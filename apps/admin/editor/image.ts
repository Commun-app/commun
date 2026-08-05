import Image from '@tiptap/extension-image'

export interface ImageNodeOptions {
  upload: ((file: File) => Promise<{ id: string; src: string; title: string }>) | null
  fetch: ((attrs: { id: string }) => Promise<{ src?: string; title?: string }>) | null
}

/**
 * Image — portage iso du nœud `image` de @poulpus/prose, qui étendait déjà
 * l'extension Image de TipTap. Contrat JSON (341 nœuds en base) :
 * attrs { src, alt, title, id, uid }. Comme pour `file`, l'attr legacy
 * `data` (résiduel) n'est sciemment pas déclaré.
 */
export const ImageNode = Image.extend<ImageNodeOptions>({
  addOptions() {
    return {
      ...(this as any).parent?.(),
      upload: null,
      fetch: null,
    }
  },

  addAttributes() {
    // L'attr `data` legacy (résiduel) n'est sciemment pas déclaré, et les
    // `width`/`height` de la v3 sont RETIRÉS : la v2 ne les avait pas, les
    // déclarer ajouterait deux clés nulles aux 341 images existantes à
    // chaque ré-enregistrement (corpus du 05/08).
    const { width: _w, height: _h, ...parent } = (this as any).parent?.() ?? {}
    return {
      ...parent,
      src: { default: null },
      id: { default: null },
      title: { default: null },
    }
  },
})

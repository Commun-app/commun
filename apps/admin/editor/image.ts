import Image from '@tiptap/extension-image'

export interface ImageNodeOptions {
  upload: ((file: File) => Promise<{ id: string; src: string; title: string }>) | null
  fetch: ((attrs: { id: string }) => Promise<{ src?: string; title?: string }>) | null
}

/** Image node: TipTap Image plus the `id` of the backing media. */
export const ImageNode = Image.extend<ImageNodeOptions>({
  addOptions() {
    return {
      ...(this as any).parent?.(),
      upload: null,
      fetch: null,
    }
  },

  addAttributes() {
    // v3's `width`/`height` are removed and legacy `data` stays undeclared:
    // declaring either would add keys to every stored image on save.
    const { width: _w, height: _h, ...parent } = (this as any).parent?.() ?? {}
    return {
      ...parent,
      src: { default: null },
      id: { default: null },
      title: { default: null },
    }
  },
})

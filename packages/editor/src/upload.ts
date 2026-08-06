import { Node, mergeAttributes } from '@tiptap/core';

export interface UploadPlaceholderOptions {
  upload: ((file: File) => Promise<{ id: string; src: string; title: string }>) | null;
}

/**
 * Transient upload slot inserted by the slash menu: shows a file picker in
 * place, then replaces itself with the real image/file node. It must never
 * reach saved content — input-editor strips it on emit.
 */
export const UploadPlaceholder = Node.create<UploadPlaceholderOptions>({
  name: 'imageUpload',
  group: 'block',
  atom: true,
  draggable: true,

  addOptions() {
    return { upload: null } as any;
  },

  parseHTML() {
    return [{ tag: 'div[data-type="image-upload"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'image-upload' })];
  },

  addCommands() {
    return {
      insertUploadPlaceholder:
        (attrs: { accept?: string } = {}) =>
        ({ commands }: any) =>
          commands.insertContent({ type: this.name, attrs }),
    } as any;
  },
});

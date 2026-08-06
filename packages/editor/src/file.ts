import { mergeAttributes, Node, nodeInputRule } from '@tiptap/core';

/** Markdown-style `![title](src)` input rule, kept from the previous editor. */
export const fileInputRegex = /(?:^|\s)(!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\))$/;

export interface FileNodeOptions {
  /** Uploads a browser File, resolves to { id, src, title }. */
  upload: ((file: File) => Promise<{ id: string; src: string; title: string }>) | null;
  /** Resolves a media by id to { src, title } (shared cache, bounded concurrency). */
  fetch: ((attrs: { id: string }) => Promise<{ src?: string; title?: string }>) | null;
}

/**
 * Attached-file block (attrs src/id/alt/title). The residual legacy `data`
 * attr is intentionally NOT declared: the schema drops it on save, as the
 * previous editor already did — a documented harness exception.
 */
export const FileNode = Node.create<FileNodeOptions>({
  name: 'file',
  group: 'block',
  draggable: true,
  inline: false,

  addOptions() {
    return {
      upload: null,
      fetch: null,
      HTMLAttributes: { type: 'file' },
    } as any;
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => {
          if (element.getAttribute('type') === 'file') {
            return element.getAttribute('src');
          }
        },
      },
      id: { default: null },
      alt: { default: null },
      title: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'input', attrs: { type: 'file' } }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['input', mergeAttributes((this.options as any).HTMLAttributes, HTMLAttributes)];
  },

  addCommands() {
    return {
      setFile:
        (options: Record<string, unknown>) =>
        ({ commands }: any) =>
          commands.insertContent({ type: this.name, attrs: options }),
    } as any;
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: fileInputRegex,
        type: this.type,
        getAttributes: (match) => {
          const [, , alt, src, title] = match;
          return { src, alt, title };
        },
      }),
    ];
  },
});

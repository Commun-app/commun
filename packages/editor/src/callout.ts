import { Node } from '@tiptap/core';

/**
 * Info callout block. Content is bare text (no paragraphs) and `icon` holds
 * a full Iconify name — both fixed by stored client content.
 */
export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'text*',
  draggable: true,
  selectable: true,
  inline: false,
  defining: false,

  addAttributes() {
    return {
      icon: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-icon'),
        renderHTML: (attributes) => ({ 'data-icon': attributes.icon }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'aside' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['aside', HTMLAttributes, 0];
  },

  addCommands() {
    return {
      setCallout:
        (options: { icon?: string | null } = {}) =>
        ({ commands }: any) =>
          commands.setNode(this.name, options),
    } as any;
  },
});

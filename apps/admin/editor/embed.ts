import { Node } from '@tiptap/core'

/**
 * Iframe de service externe (YouTube, Google Maps, Typeform…) — portage iso
 * du nœud `embed` de @poulpus/prose. Contrat JSON (48 nœuds en base) :
 * attrs { service, icon, placeholder, src, title, height, frameborder,
 * allow, allowfullscreen } — PAS d'uid (liste fermée de l'extension uid).
 * `frameborder` est une CHAÎNE ("0"), défauts iso prose.
 */
export const Embed = Node.create({
  name: 'embed',
  group: 'block',
  draggable: true,
  selectable: true,
  inline: false,
  defining: false,

  addAttributes() {
    return {
      service: { default: null },
      icon: { default: null },
      placeholder: { default: null },
      src: { default: null },
      title: { default: null },
      height: { default: null },
      frameborder: { default: '0' },
      allow: {
        default:
          'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
      },
      allowfullscreen: { default: true },
    }
  },

  parseHTML() {
    return [{ tag: 'iframe[src]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', ['iframe', HTMLAttributes, 0]]
  },

  addCommands() {
    return {
      setEmbed:
        (options: Record<string, unknown>) =>
        ({ commands }: any) =>
          commands.insertContent({ type: this.name, attrs: options }),
    } as any
  },
})

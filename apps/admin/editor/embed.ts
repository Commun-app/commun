import { Node } from '@tiptap/core'

/**
 * External-service iframe. Attrs mirror stored content exactly: embeds carry
 * no uid and `frameborder` is a string.
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

/** The one embed service present in stored content. */
export const EMBED_VIDEO = {
  service: 'video',
  icon: 'iconoir:youtube',
  placeholder: "Collez l'url https://www.youtube.com/watch…",
  title: 'YouTube video player',
  height: 315,
} as const

/** `youtube.com/watch?v=ID` or `youtu.be/ID` to an embeddable URL; anything else passes through. */
export function toVideoEmbedSrc(url: string): string {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
  return match ? `https://www.youtube.com/embed/${match[1]}` : url
}

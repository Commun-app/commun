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

/**
 * Embed services. Stored content only uses `video`; new services extend this
 * table without touching the node contract (same attrs for every service).
 */
export interface EmbedService {
  label: string
  icon: string
  placeholder: string
  title: string
  height: number
  toSrc: (url: string) => string
}

export const EMBED_SERVICES: Record<string, EmbedService> = {
  video: {
    label: 'Vidéo',
    icon: 'iconoir:youtube',
    placeholder: "Collez l'url YouTube ou Vimeo…",
    title: 'Lecteur vidéo',
    height: 315,
    toSrc: (url) => {
      const youtube = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
      if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`
      const vimeo = url.match(/vimeo\.com\/(\d+)/)
      if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
      return url
    },
  },
  map: {
    label: 'Carte',
    icon: 'iconoir:map-pin',
    placeholder: "Collez l'url d'intégration Google Maps…",
    title: 'Carte',
    height: 400,
    toSrc: (url) => url,
  },
}

/**
 * Synthetic conservation corpus: every node type, mark and degenerate shape
 * observed in client databases, with NO client data — this repository is
 * public. The sweep against real databases lives outside this repository.
 */

const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

const p = (n: number, text?: string, marks?: any[]) => ({
  type: 'paragraph',
  attrs: { textAlign: 'left', uid: uid(n) },
  content: text ? [{ type: 'text', text, ...(marks ? { marks } : {}) }] : [],
})

export interface CorpusDoc {
  name: string
  /** identical: zero diff. normalized: allowed families only. invalid: contentError expected before sanitation. */
  expect: 'identical' | 'normalized' | 'invalid'
  doc: any
}

export const CORPUS: CorpusDoc[] = [
  {
    name: 'complete — every node type and mark',
    expect: 'identical',
    doc: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2, textAlign: 'left', uid: uid(1) },
          content: [{ type: 'text', text: 'Titre de section' }],
        },
        {
          type: 'paragraph',
          attrs: { textAlign: 'center', uid: uid(2) },
          content: [
            { type: 'text', text: 'Du ' },
            { type: 'text', marks: [{ type: 'bold' }], text: 'gras' },
            { type: 'text', text: ', de l’' },
            { type: 'text', marks: [{ type: 'italic' }], text: 'italique' },
            { type: 'text', text: ', un ' },
            {
              type: 'text',
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href: 'https://exemple.fr/page',
                    target: '_blank',
                    rel: 'noopener noreferrer nofollow',
                    class: 'underline text-primary',
                  },
                },
              ],
              text: 'lien',
            },
            { type: 'text', text: ', du ' },
            { type: 'text', marks: [{ type: 'highlight', attrs: { color: null } }], text: 'surligné' },
            { type: 'text', text: ' et un ' },
            { type: 'text', marks: [{ type: 'textStyle' }], text: 'span nu' },
            { type: 'text', text: '.' },
          ],
        },
        { type: 'paragraph', attrs: { textAlign: 'left', uid: uid(3) }, content: [{ type: 'hardBreak' }] },
        {
          type: 'bulletList',
          attrs: { uid: uid(4) },
          content: [
            {
              type: 'listItem',
              attrs: { uid: uid(5) },
              content: [p(6, 'Premier item')],
            },
          ],
        },
        {
          type: 'orderedList',
          attrs: { start: 3, uid: uid(7) },
          content: [
            { type: 'listItem', attrs: { uid: uid(8) }, content: [p(9, 'Item numéroté')] },
          ],
        },
        {
          type: 'callout',
          attrs: { icon: 'iconoir:megaphone', uid: uid(10) },
          content: [{ type: 'text', text: 'Un encart : du texte NU, pas de paragraphe.' }],
        },
        {
          type: 'file',
          attrs: {
            id: '000000000000000000000001',
            src: 'https://bucket.exemple.fr/medias/document.pdf',
            title: 'document.pdf',
            alt: null,
            uid: uid(11),
          },
        },
        {
          type: 'image',
          attrs: {
            id: '000000000000000000000002',
            src: 'https://bucket.exemple.fr/medias/photo.jpg',
            title: 'photo.jpg',
            alt: 'Une photo',
            uid: uid(12),
          },
        },
        {
          type: 'embed',
          attrs: {
            service: 'video',
            icon: null,
            placeholder: null,
            src: 'https://www.youtube.com/embed/xxxxxxxxxxx',
            title: 'YouTube video player',
            height: 315,
            frameborder: '0',
            allow:
              'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
            allowfullscreen: true,
          },
        },
        {
          type: 'details',
          attrs: { toggle: true },
          content: [
            { type: 'detailsSummary', content: [{ type: 'text', text: 'Titre de l’accordéon' }] },
            {
              type: 'detailsContent',
              content: [
                p(13, 'Contenu replié.'),
                {
                  // Nested accordion.
                  type: 'details',
                  attrs: { toggle: true },
                  content: [
                    { type: 'detailsSummary', content: [{ type: 'text', text: 'Niveau 2' }] },
                    {
                      type: 'detailsContent',
                      content: [
                        {
                          // Files live inside accordions in real content.
                          type: 'file',
                          attrs: {
                            id: '000000000000000000000003',
                            src: 'https://bucket.exemple.fr/medias/arrete.pdf',
                            title: 'arrete.pdf',
                            alt: null,
                            uid: uid(14),
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        { type: 'horizontalRule' },
        {
          type: 'blockquote',
          attrs: { uid: uid(15) },
          content: [p(16, 'Une citation.')],
        },
      ],
    },
  },
  {
    name: 'mark order — link before bold before textStyle',
    expect: 'identical',
    doc: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { textAlign: 'left', uid: uid(20) },
          content: [
            {
              type: 'text',
              marks: [
                {
                  type: 'link',
                  attrs: { href: 'https://exemple.fr', target: '_blank', rel: 'noopener noreferrer nofollow', class: 'underline text-primary' },
                },
                { type: 'bold' },
                { type: 'textStyle' },
              ],
              text: 'lien gras stylé',
            },
            { type: 'text', marks: [{ type: 'bold' }, { type: 'italic' }, { type: 'textStyle' }], text: ' — gras italique span' },
          ],
        },
        {
          type: 'paragraph',
          attrs: { textAlign: 'left', uid: uid(21) },
          content: [{ type: 'hardBreak', marks: [{ type: 'bold' }, { type: 'textStyle' }] }],
        },
      ],
    },
  },
  {
    name: 'document ending on a block node — no trailing paragraph',
    expect: 'identical',
    doc: {
      type: 'doc',
      content: [
        p(30, 'Liste des arrêtés :'),
        {
          type: 'file',
          attrs: {
            id: '000000000000000000000004',
            src: 'https://bucket.exemple.fr/medias/dernier.pdf',
            title: 'dernier.pdf',
            alt: null,
            uid: uid(31),
          },
        },
      ],
    },
  },
  {
    name: 'missing uids — filled on open with v4 (allowed family)',
    expect: 'normalized',
    doc: {
      type: 'doc',
      content: [
        { type: 'paragraph', attrs: { textAlign: 'left' }, content: [{ type: 'text', text: 'Sans uid.' }] },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Titre sans uid ni textAlign' }] },
        { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Citation nue.' }] }] },
      ],
    },
  },
  {
    name: 'legacy data attr on file/image — dropped (allowed family)',
    expect: 'normalized',
    doc: {
      type: 'doc',
      content: [
        {
          type: 'file',
          attrs: {
            id: '000000000000000000000005',
            src: 'https://bucket.exemple.fr/medias/vieux.pdf',
            title: 'vieux.pdf',
            alt: null,
            data: { _id: '000000000000000000000005', originalName: 'vieux.pdf' },
            uid: uid(40),
          },
        },
        {
          type: 'image',
          attrs: {
            id: '000000000000000000000006',
            src: 'https://bucket.exemple.fr/medias/vieille.png',
            title: null,
            alt: null,
            data: null,
            uid: uid(41),
          },
        },
      ],
    },
  },
  {
    name: 'text node without text — invalid, repaired by sanitizeDoc',
    expect: 'invalid',
    doc: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { textAlign: 'left', uid: uid(50) },
          content: [{ type: 'text' }, { type: 'text', text: 'Le reste survit.' }],
        },
      ],
    },
  },
]

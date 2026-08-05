/**
 * Corpus SYNTHÉTIQUE du harnais de conservation (D9, tâche 3.1) — committé
 * et exécuté en CI. Chaque document reproduit une FORME observée dans les
 * 4 bases clients (relevés des 05-06/08), sans aucune donnée client : le
 * dépôt est public, `.dump/` n'y entre jamais. Le balayage des vraies bases
 * est l'affaire de `sweep-bases.mjs`, exécuté en local seulement.
 *
 * Couverture : chaque type de nœud, chaque marque, les combinaisons d'ordre
 * de marques, et les cas dégénérés découverts (uid manquants, attr `data`
 * legacy, nœud texte vide, document finissant par un bloc non textuel).
 */

const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

const p = (n: number, text?: string, marks?: any[]) => ({
  type: 'paragraph',
  attrs: { textAlign: 'left', uid: uid(n) },
  content: text ? [{ type: 'text', text, ...(marks ? { marks } : {}) }] : [],
})

export interface CorpusDoc {
  name: string
  /** `identical` : zéro écart exigé. `normalized` : seules les familles admises. `invalid` : contentError attendu sans sanitation. */
  expect: 'identical' | 'normalized' | 'invalid'
  doc: any
}

export const CORPUS: CorpusDoc[] = [
  {
    name: 'complet — tous les types de nœuds et de marques',
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
                  // Accordéon IMBRIQUÉ — 246 occurrences chez grigny.
                  type: 'details',
                  attrs: { toggle: true },
                  content: [
                    { type: 'detailsSummary', content: [{ type: 'text', text: 'Niveau 2' }] },
                    {
                      type: 'detailsContent',
                      content: [
                        {
                          // 1 587 files vivent DANS des accordéons (arrêtés).
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
    name: 'ordre des marques — link avant bold avant textStyle (rang v2)',
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
    name: 'document finissant par un bloc non textuel — trailingNode interdit',
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
    name: 'uid manquants — remplis à l’ouverture en v4 (famille admise, iso prose)',
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
    name: 'attr data legacy sur file/image — écarté (famille admise, iso prose)',
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
    name: 'nœud texte sans texte — invalide (31 documents grigny), réparé par sanitizeDoc',
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

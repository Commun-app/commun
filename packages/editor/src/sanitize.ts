/**
 * Drops text nodes without text — invalid ProseMirror inherited from the
 * migration; every editor rejects them and themes render them as nothing.
 * Returns the same reference when nothing needs repair.
 */
export function sanitizeDoc<T extends { type?: string; content?: any[] }>(doc: T): T {
  let repaired = false;
  const clean = (node: any): any | null => {
    if (!node || typeof node !== 'object') return node;
    if (node.type === 'text' && !node.text) {
      repaired = true;
      return null;
    }
    if (Array.isArray(node.content)) {
      const content = node.content.map(clean).filter(Boolean);
      if (content.length !== node.content.length) return { ...node, content };
      return content.some((child: any, i: number) => child !== node.content[i])
        ? { ...node, content }
        : node;
    }
    return node;
  };
  const out = clean(doc);
  if (repaired && typeof console !== 'undefined') {
    console.warn('[editor] repaired document: empty text node(s) dropped');
  }
  return out;
}

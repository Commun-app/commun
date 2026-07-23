/**
 * Slug generation — iso legacy (`slugify` locale fr, lower). Diacritics are
 * stripped via Unicode normalisation, anything non-alphanumeric collapses to
 * a single dash.
 */
export function slugify(value: string): string {
  return (
    value
      .normalize('NFD')
      // biome-ignore lint/suspicious/noMisleadingCharacterClass: combining marks removal
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'sans-titre'
  );
}

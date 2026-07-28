/**
 * Slug generation — iso legacy (`slugify` locale fr, lower). Diacritics are
 * stripped via Unicode normalisation, anything non-alphanumeric collapses to
 * a single dash.
 */
export function slugify(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'sans-titre'
  );
}

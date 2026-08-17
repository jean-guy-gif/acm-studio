// Conservative filters: a wrong value is worse than an empty one.

const GENERIC_IMAGE_HINTS = [
  'placeholder',
  'share',
  'logo',
  'default',
  'favicon',
  'sprite',
  'icon',
  'pixel',
  'blank',
  'spacer',
  'loader',
  'loading',
  'transparent',
  '1x1',
  'watermark',
  'no-photo',
  'no_photo',
  'nophoto',
  // Google-hosted assets (business logos, reviews, maps) are never a French
  // portal's own listing photos — seen polluting Figaro imports.
  'googleusercontent',
];

// True for share/placeholder/logo/default/favicon assets that are not the
// property's own photos.
export function isGenericImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return GENERIC_IMAGE_HINTS.some((hint) => lower.includes(hint));
}

// Portal names / slogans that must never be accepted as a listing title.
const PORTAL_NAMES = [
  'seloger',
  "bien'ici",
  'bienici',
  'leboncoin',
  'green acres',
  'green-acres',
  'belles demeures',
  'propriétés le figaro',
  'figaro',
];

const GENERIC_TITLE_PATTERNS = [
  /toutes les annonces/i,
  /annonces immobili[eè]res/i,
  /petites annonces/i,
];

// True when the title is empty, equals the source label, is a bare portal name,
// or is a portal slogan.
export function isGenericTitle(title: string, source?: string | null): boolean {
  const trimmed = title.trim();
  if (trimmed === '') {
    return true;
  }
  const lower = trimmed.toLowerCase();
  if (source && lower === source.trim().toLowerCase()) {
    return true;
  }
  if (PORTAL_NAMES.includes(lower)) {
    return true;
  }
  return GENERIC_TITLE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

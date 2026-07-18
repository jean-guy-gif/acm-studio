import type { Comparable } from '@/features/comparables/types';

// photo_urls is stored as jsonb. This safely narrows it to a string[] of
// non-empty URLs, shared by the card and the warnings service (no duplication).
export function getComparablePhotoUrls(comparable: Pick<Comparable, 'photo_urls'>): string[] {
  const raw = comparable.photo_urls;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
}

export function getMainPhotoUrl(comparable: Pick<Comparable, 'photo_urls'>): string | null {
  return getComparablePhotoUrls(comparable)[0] ?? null;
}

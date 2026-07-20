import type {
  SellerPresentationSection,
  SellerPresentationSectionKey,
} from '@/features/seller-presentation/types/seller-presentation';
import type { LiveSections } from '@/features/live-presentation/types/live-presentation';

// Splits the presentation sections into the full ordered list (kept as-is for the
// summary, including unavailable sections) and the navigable subset (available
// sections only). The input order (1..7) is never changed. Pure.
export function getLiveSections(sections: SellerPresentationSection[]): LiveSections {
  const all = [...sections].sort((a, b) => a.order - b.order);
  const navigable = all.filter((section) => section.status === 'available');
  return { all, navigable };
}

export function getFirstNavigableKey(
  sections: SellerPresentationSection[],
): SellerPresentationSectionKey | null {
  return getLiveSections(sections).navigable[0]?.key ?? null;
}

export function getLastNavigableKey(
  sections: SellerPresentationSection[],
): SellerPresentationSectionKey | null {
  const { navigable } = getLiveSections(sections);
  return navigable[navigable.length - 1]?.key ?? null;
}

// Sequential target for prev/next. Unavailable sections are skipped: the target
// is the nearest AVAILABLE section by order in the requested direction. Works
// whether the current section is available or not. Returns null at the bounds.
export function getSequentialSectionKey(
  sections: SellerPresentationSection[],
  currentKey: SellerPresentationSectionKey | null,
  direction: 'prev' | 'next',
): SellerPresentationSectionKey | null {
  const all = [...sections].sort((a, b) => a.order - b.order);
  const navigable = all.filter((section) => section.status === 'available');
  if (navigable.length === 0) {
    return null;
  }

  const current = all.find((section) => section.key === currentKey);
  const currentOrder = current?.order ?? (direction === 'next' ? -Infinity : Infinity);

  if (direction === 'next') {
    return navigable.find((section) => section.order > currentOrder)?.key ?? null;
  }
  const previous = navigable.filter((section) => section.order < currentOrder);
  return previous[previous.length - 1]?.key ?? null;
}

// 1-based index of an available section within the navigable list, or null when
// the section is not navigable (unavailable).
export function getNavigablePosition(
  sections: SellerPresentationSection[],
  key: SellerPresentationSectionKey | null,
): number | null {
  const { navigable } = getLiveSections(sections);
  const index = navigable.findIndex((section) => section.key === key);
  return index === -1 ? null : index + 1;
}

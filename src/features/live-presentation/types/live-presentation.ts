import type { SellerPresentationSection } from '@/features/seller-presentation/types/seller-presentation';

export type LiveMode = 'overview' | 'presentation';

// The full, ordered section list (for the summary) plus the navigable subset
// (available sections only, in order) used for sequential prev/next.
export type LiveSections = {
  all: SellerPresentationSection[];
  navigable: SellerPresentationSection[];
};

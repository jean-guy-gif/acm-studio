import type {
  SellerPresentationSection,
  SellerPresentationSectionKey,
} from '@/features/seller-presentation/types/seller-presentation';

export type SectionAvailability = {
  property: boolean;
  comparables: boolean;
  marketAnalysis: boolean;
  pricePositioning: boolean;
  advisorDecision: boolean;
  sellerPrice: boolean;
};

type SectionDefinition = {
  key: SellerPresentationSectionKey;
  title: string;
  // Reason shown when the section is unavailable. `warnings` is always available.
  reasonUnavailable: string;
  isAvailable: (availability: SectionAvailability) => boolean;
};

// Fixed order (1..7). Never reordered.
const SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    key: 'property',
    title: 'Bien vendeur',
    reasonUnavailable: 'Aucun bien vendeur renseigné.',
    isAvailable: (a) => a.property,
  },
  {
    key: 'comparables',
    title: 'Comparables retenus',
    reasonUnavailable: 'Aucun comparable retenu.',
    isAvailable: (a) => a.comparables,
  },
  {
    key: 'market_analysis',
    title: 'Analyse du marché',
    reasonUnavailable: 'Aucun comparable exploitable pour analyser le marché.',
    isAvailable: (a) => a.marketAnalysis,
  },
  {
    key: 'price_positioning',
    title: 'Positionnement prix',
    reasonUnavailable: 'Le positionnement ne peut pas être calculé (données insuffisantes).',
    isAvailable: (a) => a.pricePositioning,
  },
  {
    key: 'advisor_decision',
    title: 'Décision du conseiller',
    reasonUnavailable: 'Aucune décision de positionnement enregistrée.',
    isAvailable: (a) => a.advisorDecision,
  },
  {
    key: 'seller_price',
    title: 'Prix souhaité vendeur',
    reasonUnavailable: 'Aucun prix vendeur enregistré.',
    isAvailable: (a) => a.sellerPrice,
  },
  {
    key: 'warnings',
    title: 'Points de vigilance',
    reasonUnavailable: '',
    isAvailable: () => true,
  },
];

// Deterministic sections in the fixed presentation order.
export function buildPresentationSections(
  availability: SectionAvailability,
): SellerPresentationSection[] {
  return SECTION_DEFINITIONS.map((definition, index) => {
    const available = definition.isAvailable(availability);
    return {
      key: definition.key,
      order: index + 1,
      title: definition.title,
      status: available ? 'available' : 'unavailable',
      reasonUnavailable: available ? null : definition.reasonUnavailable,
    };
  });
}

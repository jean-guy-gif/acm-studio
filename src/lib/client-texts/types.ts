import type {
  DangerousReason,
  MarketDurationReason,
  PriceCoherence,
  PropertyConfirmed,
} from '@/features/live-seller/constants';
import type {
  Exposure,
  GeneralCondition,
  HeatingType,
  OutdoorSpace,
  ParkingType,
  PropertyType,
} from '@/features/subject-property/constants/property-options';

// Mission 140 — tout ce que voit ou reçoit le client, écrit et relu, jamais par une IA (23/10) : un
// fichier par langue (`fr.ts`, `en.ts`), mêmes clés, ce type écrit à la main. Une clé manquante dans
// une langue échoue au typecheck (jamais de `Partial`) ; un test parcourt toutes les clés. Les
// phrases variables sont des fonctions. L'interface du conseiller reste en français, hors de ces
// fichiers. Pur.

export type ClientTexts = {
  // Les mots des caractéristiques d'un bien, partout où le client les lit.
  labels: {
    propertyType: Record<PropertyType, string>;
    exposure: Record<Exposure, string>;
    condition: Record<GeneralCondition, string>;
    heating: Record<HeatingType, string>;
    outdoor: Record<OutdoorSpace, string>;
    parking: Record<ParkingType, string>;
  };
  live: LiveTexts;
};

export type LiveTexts = {
  intro: {
    kicker: string;
    title: string;
    start: string;
    count: (count: number) => string;
  };
  property: {
    title: string;
    askHint: string;
    showHint: string;
    fallbackAlt: string;
    stats: {
      type: string;
      surface: string;
      rooms: string;
      bedrooms: string;
      floor: string;
      exposure: string;
      condition: string;
      construction: string;
      heating: string;
      energy: string;
      ges: string;
      outdoor: string;
      parking: string;
      district: string;
      city: string;
      address: string;
    };
    highlights: string;
    question: string;
    confirmed: Record<PropertyConfirmed, string>;
    comment: string;
  };
  answers: {
    coherence: Record<PriceCoherence, string>;
    durationReason: Record<MarketDurationReason, string>;
    dangerousReason: Record<DangerousReason, string>;
  };
};

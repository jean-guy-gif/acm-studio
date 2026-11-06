import {
  DANGEROUS_REASON_LABELS,
  MARKET_DURATION_REASON_LABELS,
  PRICE_COHERENCE_LABELS,
  PROPERTY_CONFIRMED_LABELS,
} from '@/features/live-seller/constants';
import {
  EXPOSURE_LABELS,
  GENERAL_CONDITION_LABELS,
  HEATING_TYPE_LABELS,
  OUTDOOR_SPACE_LABELS,
  PARKING_TYPE_LABELS,
  PROPERTY_TYPE_LABELS,
} from '@/features/subject-property/constants/property-options';
import type { ClientTexts } from '@/lib/client-texts/types';

// Mission 140 — le français, la langue par défaut : les listes reprennent celles de l'outil (une
// seule source), les phrases sont celles qui étaient écrites dans les écrans, mot pour mot.
export const FRENCH_TEXTS: ClientTexts = {
  labels: {
    propertyType: PROPERTY_TYPE_LABELS,
    exposure: EXPOSURE_LABELS,
    condition: GENERAL_CONDITION_LABELS,
    heating: HEATING_TYPE_LABELS,
    outdoor: OUTDOOR_SPACE_LABELS,
    parking: PARKING_TYPE_LABELS,
  },
  live: {
    intro: {
      kicker: 'Rendez-vous vendeur',
      title: 'Découvrons ensemble les biens en concurrence avec votre logement.',
      start: 'Démarrer la présentation',
      count: (count) =>
        `${count} bien${count > 1 ? 's' : ''} concurrent${count > 1 ? 's' : ''} à examiner`,
    },
    property: {
      title: 'Votre bien',
      askHint: 'Reconnaissez-vous votre bien dans cette présentation ?',
      showHint: 'Votre bien, tel que nous allons le comparer aux biens en vente.',
      fallbackAlt: 'Votre bien',
      stats: {
        type: 'Type',
        surface: 'Surface',
        rooms: 'Pièces',
        bedrooms: 'Chambres',
        floor: 'Étage',
        exposure: 'Exposition',
        condition: 'État',
        construction: 'Construction',
        heating: 'Chauffage',
        energy: 'DPE',
        ges: 'GES',
        outdoor: 'Extérieurs',
        parking: 'Stationnement',
        district: 'Quartier',
        city: 'Ville',
        address: 'Adresse',
      },
      highlights: 'Points forts',
      question: 'Est-ce que cette présentation correspond bien à votre bien ?',
      confirmed: PROPERTY_CONFIRMED_LABELS,
      comment: 'Commentaire (facultatif)',
    },
    answers: {
      coherence: PRICE_COHERENCE_LABELS,
      durationReason: MARKET_DURATION_REASON_LABELS,
      dangerousReason: DANGEROUS_REASON_LABELS,
    },
  },
};

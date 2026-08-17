import { describe, expect, it } from 'vitest';

import {
  COMPARISON_CRITERION_LABELS,
  DANGEROUS_REASON_LABELS,
  MARKET_DURATION_REASON_LABELS,
  SERIOUS_COMPETITOR_LABELS,
} from '@/features/live-seller/constants';
import {
  EXPOSURE_LABELS,
  GENERAL_CONDITION_LABELS,
  HEATING_TYPE_LABELS,
  OUTDOOR_SPACE_LABELS,
  PARKING_TYPE_LABELS,
} from '@/features/subject-property/constants/property-options';
import { UI } from '@/lib/labels/ui';

// Mots anglais interdits dans TOUT libellé affiché (règle produit bloquante).
// Les exceptions autorisées (Live, DPE, GES, marques…) ne sont volontairement pas
// dans cette liste, donc elles ne déclenchent jamais l'alerte.
const FORBIDDEN = [
  'loading',
  'save',
  'cancel',
  'submit',
  'delete',
  'close',
  'next',
  'previous',
  'unknown',
  'outdated',
  'up to date',
  'no data',
  'full screen',
  'fullscreen',
  'price history',
  'seller',
  'competitor',
  'search',
  'settings',
  'logout',
  'welcome',
  'yes',
  'edit',
  'submit',
  'success',
  'failed',
  'warning',
];

// Toutes les valeurs de libellés affichés (jamais les clés techniques).
const ALL_LABELS: string[] = [
  ...Object.values(UI),
  ...Object.values(SERIOUS_COMPETITOR_LABELS),
  ...Object.values(MARKET_DURATION_REASON_LABELS),
  ...Object.values(DANGEROUS_REASON_LABELS),
  ...Object.values(COMPARISON_CRITERION_LABELS),
  ...Object.values(EXPOSURE_LABELS),
  ...Object.values(GENERAL_CONDITION_LABELS),
  ...Object.values(HEATING_TYPE_LABELS),
  ...Object.values(OUTDOOR_SPACE_LABELS),
  ...Object.values(PARKING_TYPE_LABELS),
];

describe('garde de francisation (dictionnaires affichés)', () => {
  it('aucun libellé ne contient de mot anglais interdit', () => {
    for (const label of ALL_LABELS) {
      const lower = label.toLowerCase();
      for (const word of FORBIDDEN) {
        expect(lower.includes(word), `«${label}» contient «${word}»`).toBe(false);
      }
    }
  });

  it('couvre un volume significatif de libellés', () => {
    expect(ALL_LABELS.length).toBeGreaterThan(40);
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { extractSearchResults } from '@/features/competitor-search/services/extract-search-results';
import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';

// EXIGENCE : partir d'une carte de recherche RÉELLE prise dans la fixture, pas d'un
// objet fabriqué à la main. Un test qui ne reproduit pas ce que la production fabrique
// valide un monde qui n'existe pas (le vice qui avait fait « passer » la garde de type
// et le filtre des logos).
//
// On reproduit la chaîne : fixture SeLoger réelle → carte extraite → la valeur que
// importAndCreateComparable écrit dans comparables.property_type est
// normalizePropertyType(candidate.propertyType) → 'apartment'. Puis le libellé neutre
// du Live, relu depuis cette colonne, ouvre sur « Appartement · … » sans aucun prix.
const FIXTURE = join(__dirname, '..', '__fixtures__', 'seloger-resultats-nice.html');
const cards = extractSearchResults(
  readFileSync(FIXTURE, 'utf8'),
  'https://www.seloger.com/recherche/achat/appartement/provence-alpes-cote-d-azur/nice-06000',
  'seloger',
);

describe('import — type de bien depuis une carte de recherche réelle (fixture SeLoger)', () => {
  it('une fiche importée ressort avec property_type = "apartment" (valeur écrite en base)', () => {
    expect(cards.length).toBeGreaterThan(0);
    const card = cards[0];
    // La carte réelle porte déjà le type canonique lu à la recherche.
    expect(card.propertyType).toBe('apartment');
    // C'est EXACTEMENT ce que importAndCreateComparable écrit dans la colonne :
    // insert({ property_type: normalizePropertyType(candidate.propertyType) }).
    expect(normalizePropertyType(card.propertyType)).toBe('apartment');
    // Toutes les cartes de cette recherche d'appartements sont des appartements.
    expect(cards.every((c) => c.propertyType === 'apartment')).toBe(true);
  });

  it('le libellé neutre du Live, relu depuis property_type, ouvre sur « Appartement » sans prix', () => {
    const card = cards[0];
    const label = neutralComparableLabel({
      propertyType: normalizePropertyType(card.propertyType), // = ce qui est en base
      roomsCount: card.roomsCount,
      surfaceArea: card.surfaceArea,
      city: card.city,
      district: null,
    });
    expect(label.startsWith('Appartement · ')).toBe(true);
    // Aucun prix : ni le montant lu sur la carte, ni « € ».
    expect(label).not.toContain('€');
    if (card.price != null) {
      expect(label).not.toContain(String(card.price));
    }
  });
});

import { describe, expect, it } from 'vitest';

import {
  listingAgeLookupUrl,
  canLookUpListingAge,
  LISTING_AGE_TOOL_HOME,
} from '@/features/comparables/services/listing-age-lookup';

describe('canLookUpListingAge', () => {
  it('accepte une adresse d’annonce', () => {
    expect(canLookUpListingAge('https://www.green-acres.fr/annonce/1')).toBe(true);
    expect(canLookUpListingAge('  http://exemple.fr/a  ')).toBe(true);
  });

  it('refuse une saisie vide ou qui n’est pas une adresse', () => {
    expect(canLookUpListingAge(null)).toBe(false);
    expect(canLookUpListingAge(undefined)).toBe(false);
    expect(canLookUpListingAge('   ')).toBe(false);
    expect(canLookUpListingAge('annonce 12345')).toBe(false);
    // Une adresse `javascript:` n'ouvre pas un site : elle exécute du code.
    expect(canLookUpListingAge('javascript:alert(1)')).toBe(false);
  });
});

describe('listingAgeLookupUrl', () => {
  // Garde-fou : l'adresse de l'annonce sur laquelle travaille le conseiller ne
  // doit pas partir dans la barre d'adresse d'un service tiers.
  it('renvoie l’adresse du service, sans aucun paramètre', () => {
    const url = listingAgeLookupUrl();
    expect(url).toBe(LISTING_AGE_TOOL_HOME);
    expect(url).not.toContain('?');
    expect(url).not.toContain('=');
  });
});

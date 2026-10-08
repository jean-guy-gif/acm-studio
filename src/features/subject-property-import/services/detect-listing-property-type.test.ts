import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { extractListingData } from '@/features/comparable-import/services/extract-listing-data';
import { normalizeListingData } from '@/features/comparable-import/services/normalize-listing-data';
import { detectListingPropertyType } from '@/features/subject-property-import/services/detect-listing-property-type';
import { mapListingToProperty } from '@/features/subject-property-import/services/map-listing-to-property';

const FIXTURES = join(__dirname, '..', '..', 'comparable-import', 'extractors', '__fixtures__');

// Les six annonces RÉELLES déjà capturées : ce que la fiche du bien vendeur reçoit d'un import.
const LISTINGS: { file: string; url: string; type: string; floor: number | null }[] = [
  {
    file: 'bienici-antibes.html',
    url: 'https://www.bienici.com/annonce/vente/antibes/appartement/4pieces/iad-france-1010343',
    type: 'Appartement',
    floor: 2,
  },
  {
    file: 'bienici-cagnes-maison.html',
    url: 'https://www.bienici.com/annonce/vente/cagnes-sur-mer/maison/9pieces/laforet-immo-facile-52960884',
    type: 'Maison',
    floor: null,
  },
  {
    file: 'figaro-nice-appartement.html',
    url: 'https://immobilier.lefigaro.fr/annonces/annonce-109593037.html',
    type: 'Appartement',
    floor: null,
  },
  {
    file: 'green-acres-cagnes.html',
    url: 'https://www.green-acres.fr/fr/properties/appartement/cagnes-sur-mer/A98cqw1yg8fmz1bt.htm',
    type: 'Appartement',
    floor: null,
  },
  {
    file: 'maisons-et-appartements-villeneuve.html',
    url: 'https://www.maisonsetappartements.fr/ads/4534734',
    type: 'Appartement',
    floor: null,
  },
  {
    file: 'seloger-villeneuve-loubet.html',
    url: 'https://www.seloger.com/annonces/achat/appartement/villeneuve-loubet-06270/26ZEJMLWB13Y',
    type: 'Appartement',
    floor: null,
  },
];

describe('import d’une annonce — type de bien et étage (fixtures réelles)', () => {
  it.each(LISTINGS)('$file → $type', ({ file, url, type, floor }) => {
    const html = readFileSync(join(FIXTURES, file), 'utf8');
    const { data } = normalizeListingData(extractListingData(html, url), url, 'portail');
    const { prefill } = mapListingToProperty(data);
    expect(prefill.property_type).toBe(type);
    expect(prefill.floor).toBe(floor);
  });

  it('Bien’ici publie « 2e étage (sur 6) » : étage et nombre d’étages remplissent la fiche', () => {
    const { file, url } = LISTINGS[0];
    const html = readFileSync(join(FIXTURES, file), 'utf8');
    const { data } = normalizeListingData(extractListingData(html, url), url, 'portail');
    const { prefill } = mapListingToProperty(data);
    expect(prefill.floor).toBe(2);
    expect(prefill.building_floors).toBe(6);
  });
});

describe('detectListingPropertyType', () => {
  it('lit le segment de l’adresse qui est un type', () => {
    expect(
      detectListingPropertyType(
        null,
        'https://www.bienici.com/annonce/vente/nice/maison/5pieces/x',
      ),
    ).toBe('house');
  });

  it('ne lit jamais le nom de domaine', () => {
    expect(
      detectListingPropertyType(null, 'https://www.maisonsetappartements.fr/ads/1'),
    ).toBeNull();
  });

  it('un segment de commune (« le-mas », « la-bastide ») n’est pas un type', () => {
    expect(
      detectListingPropertyType(null, 'https://portail.example/annonce/vente/le-mas/123'),
    ).toBeNull();
    expect(
      detectListingPropertyType(
        'Appartement 3 pièces',
        'https://portail.example/annonce/vente/la-bastide/123',
      ),
    ).toBe('apartment');
  });

  it('sans type dans l’adresse, lit le titre s’il ne nomme qu’un type', () => {
    expect(
      detectListingPropertyType(
        'Vente appartement 3 pièces 83.68 m² à Nice (06000), 570 000 €',
        'https://immobilier.lefigaro.fr/annonces/annonce-1.html',
      ),
    ).toBe('apartment');
    expect(detectListingPropertyType('Villa&nbsp;6 pièces', 'https://portail.example/a/1')).toBe(
      'house',
    );
  });

  it('un titre qui nomme deux types ne décide rien : vide plutôt que faux', () => {
    expect(
      detectListingPropertyType('Maison avec garage', 'https://portail.example/a/1'),
    ).toBeNull();
    expect(
      detectListingPropertyType('Le Mas - Appartement à vendre', 'https://portail.example/a/1'),
    ).toBeNull();
  });

  it('sans titre ni adresse lisible : null', () => {
    expect(detectListingPropertyType(null, 'pas une adresse')).toBeNull();
    expect(
      detectListingPropertyType('Bien rare à saisir', 'https://portail.example/a/1'),
    ).toBeNull();
  });
});

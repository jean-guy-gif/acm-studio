import { describe, expect, it } from 'vitest';

import { extractListingKey } from '@/features/comparable-import/utils/extract-listing-key';

describe('extractListingKey — one measured portal each', () => {
  it('SeLoger : identifiant en fin de chemin', () => {
    expect(
      extractListingKey(
        'https://www.seloger.com/annonces/achat/appartement/villeneuve-loubet-06270/26ZEJMLWB13Y?cmp=x',
      ),
    ).toEqual({
      portal: 'seloger',
      listingKey: '26ZEJMLWB13Y',
      canonicalUrl:
        'https://www.seloger.com/annonces/achat/appartement/villeneuve-loubet-06270/26ZEJMLWB13Y',
    });
  });

  it('Bien’ici : apimo-… en fin de chemin (la requête a déjà été normalisée)', () => {
    const identity = extractListingKey(
      'https://www.bienici.com/annonce/vente/villeneuve-loubet/appartement/3pieces/apimo-85508663?q=%2Frecherche',
    );
    expect(identity?.portal).toBe('bienici');
    expect(identity?.listingKey).toBe('apimo-85508663');
  });

  it('Green Acres : jeton en fin de chemin', () => {
    const identity = extractListingKey('https://www.green-acres.fr/en/properties/Al6sdpuxlkaknl9r');
    expect(identity?.portal).toBe('greenacres');
    expect(identity?.listingKey).toBe('Al6sdpuxlkaknl9r');
  });

  it('portail non mesuré → pas d’identité (on ne code aucun lecteur pour lui)', () => {
    expect(
      extractListingKey('https://immobilier.lefigaro.fr/annonces/annonce-12345.html'),
    ).toBeNull();
    expect(extractListingKey('https://portail-inconnu.example/annonce/42')).toBeNull();
  });

  it('adresse sans segment exploitable, ou invalide → null', () => {
    expect(extractListingKey('https://www.seloger.com/')).toBeNull();
    expect(extractListingKey('pas une url')).toBeNull();
  });
});

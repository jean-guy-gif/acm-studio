import { describe, expect, it } from 'vitest';

import { normalizeListingUrl } from '@/features/comparable-import/utils/normalize-listing-url';

describe('normalizeListingUrl — one case per portal (real address shapes)', () => {
  it('SeLoger : id dans le chemin → toute la requête tombe', () => {
    expect(
      normalizeListingUrl(
        'https://www.seloger.com/annonces/achat/appartement/villeneuve-loubet-06270/26ZEJMLWB13Y?projects=2&cmp=abc',
      ),
    ).toBe(
      'https://www.seloger.com/annonces/achat/appartement/villeneuve-loubet-06270/26ZEJMLWB13Y',
    );
  });

  it('SeLoger : un « ? » de fin sans paramètre est retiré', () => {
    expect(
      normalizeListingUrl(
        'https://www.seloger.com/annonces/.../villeneuve-loubet-06270/26ZEJMLWB13Y?',
      ),
    ).toBe('https://www.seloger.com/annonces/.../villeneuve-loubet-06270/26ZEJMLWB13Y');
  });

  it('Bien’ici : id dans le chemin → le ?q= de recherche tombe', () => {
    expect(
      normalizeListingUrl(
        'https://www.bienici.com/annonce/vente/villeneuve-loubet/appartement/3pieces/apimo-85508663?q=%2Frecherche%2Fachat',
      ),
    ).toBe(
      'https://www.bienici.com/annonce/vente/villeneuve-loubet/appartement/3pieces/apimo-85508663',
    );
  });

  it('Green-Acres : requête de suivi retirée', () => {
    expect(
      normalizeListingUrl('https://www.green-acres.fr/en/properties/12345.htm?utm_source=results'),
    ).toBe('https://www.green-acres.fr/en/properties/12345.htm');
  });

  it('Figaro Immobilier : requête de suivi retirée', () => {
    expect(
      normalizeListingUrl('https://immobilier.lefigaro.fr/annonces/annonce-12345.html?cmp=xyz'),
    ).toBe('https://immobilier.lefigaro.fr/annonces/annonce-12345.html');
  });

  it('Maisons et Appartements : requête de suivi retirée', () => {
    expect(
      normalizeListingUrl(
        'https://www.maisonsetappartements.fr/fr/06/annonce-vente-appartement-nice-12345.html?referrer=y',
      ),
    ).toBe('https://www.maisonsetappartements.fr/fr/06/annonce-vente-appartement-nice-12345.html');
  });

  it('Leboncoin : requête de suivi retirée (id dans le chemin)', () => {
    expect(
      normalizeListingUrl(
        'https://www.leboncoin.fr/ad/ventes_immobilieres/1234567890?utm_campaign=z',
      ),
    ).toBe('https://www.leboncoin.fr/ad/ventes_immobilieres/1234567890');
  });

  it('portail inconnu → adresse inchangée', () => {
    const url = 'https://portail-inconnu.example/annonce/42?ref=abc&page=2';
    expect(normalizeListingUrl(url)).toBe(url);
  });

  it('adresse invalide → renvoyée telle quelle', () => {
    expect(normalizeListingUrl('pas une url')).toBe('pas une url');
  });
});

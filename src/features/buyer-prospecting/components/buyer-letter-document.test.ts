import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BuyerLetterDocument } from '@/features/buyer-prospecting/components/buyer-letter-document';
import {
  buyerLetterAddressee,
  defaultBuyerLetter,
} from '@/features/buyer-prospecting/services/buyer-letter';
import { NO_FACTS } from '@/features/buyer-prospecting/services/prospect-facts';

// Mission 120 — le courrier au propriétaire né d'une recherche acquéreur, rendu : la recherche et
// la question de la visite ; ni le nom ni le budget de l'acquéreur, ni une promesse ; les
// mentions de tout courrier propriétaire (M90, M102, M103), avec sa propre finalité.
const facts = {
  ...NO_FACTS,
  propertyType: 'house',
  roomsCount: 7,
  surfaceArea: 200,
  outdoorSpaces: ['terrace'],
};
const buyer = {
  name: 'Famille Keller',
  budgetIdeal: 1_500_000,
  budgetMax: 1_650_000,
  propertyTypes: ['house' as const],
  roomsMin: 5,
  surfaceMin: 180,
  outdoor: true,
  parking: null,
  pool: null,
};
const sender = {
  advisorName: 'Natacha Conseil',
  email: 'natacha@agence.test',
  phone: '06 00 00 00 01',
  photoUrl: null,
  agencyName: 'Agence des Collines',
  logoUrl: null,
  postalAddress: '1 place du Marché, 06250 Mougins',
  professionalCard: 'CPI 0605 2026 000 000 001',
  professionalCardIssuer: 'CCI Nice Côte d’Azur',
  financialGuarantee: null,
  privacyUrl: 'acm.test/confidentialite',
};

const render = () =>
  renderToStaticMarkup(
    createElement(BuyerLetterDocument, {
      addressee: buyerLetterAddressee(facts, '8 allée du Décor, 06370 Mouans-Sartoux'),
      addressSource: 'locator',
      texts: defaultBuyerLetter(facts, buyer),
      sender,
      theirPhotoUrl: null,
      qr: { size: 21, path: 'M0 0h1v1H0z' },
    }),
  );

describe('le courrier au propriétaire d’une recherche acquéreur', () => {
  it('la recherche, la visite, le destinataire ; aucune photo par défaut', () => {
    const page = render();
    expect(page).toContain('J’accompagne une recherche qui correspond');
    expect(page).toContain('Je souhaiterais vérifier avec vous si une visite est envisageable.');
    expect(page).toContain('Au propriétaire du');
    expect(page).toContain('8 allée du Décor');
    expect(page).not.toContain('data-testid="their-photo"');
  });

  it('ni le nom, ni le budget, ni une promesse', () => {
    const page = render();
    expect(page).not.toMatch(/Keller|1\s?500\s?000|1\s?650\s?000|certain|offre|prête/i);
  });

  it('les mentions : carte professionnelle, « ne peut recevoir aucun fonds », origine de l’adresse, finalité propre', () => {
    const page = render();
    expect(page).toContain('CPI 0605 2026 000 000 001');
    expect(page).toContain('Ne peut recevoir aucun fonds');
    expect(page).toContain('déterminée à partir de données publiques');
    expect(page).toContain('Finalité : vous présenter une recherche qui correspond à votre bien.');
    expect(page).not.toContain('pour la vente de votre bien');
  });
});

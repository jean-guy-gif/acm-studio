import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BuyerLetterDocument } from '@/features/buyer-prospecting/components/buyer-letter-document';
import {
  buyerLetterAddressee,
  buyerLetterForbidden,
  buyerLetterVersion,
  colleagueAddressee,
  colleagueExclusivityCard,
  defaultBuyerColleagueLetter,
  defaultBuyerLetter,
} from '@/features/buyer-prospecting/services/buyer-letter';
import { NO_FACTS } from '@/features/buyer-prospecting/services/prospect-facts';
import { formatSquareMeters } from '@/lib/format';
import { NARROW_NBSP, NBSP } from '@/lib/typography/french-spacing';

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
    expect(page).toContain(
      'Finalité\u00a0: vous présenter une recherche qui correspond à votre bien.',
    );
    expect(page).not.toContain('pour la vente de votre bien');
  });
});

// Mission 120 B — le dossier de collaboration au confrère : qui écrit, le projet sans l'acquéreur,
// la carte « Votre exclusivité », une seule question ; ni honoraires, ni droit de visite, ni nom ni
// budget ; pas de mention CNIL, qui s'adresse au propriétaire.
describe('le dossier de collaboration au confrère', () => {
  const colleagueFacts = { ...facts, city: 'Mougins', hasPool: true, parkingTypes: ['garage'] };
  const criteria = { ...buyer, parking: true, pool: true };
  const card = colleagueExclusivityCard(
    colleagueFacts,
    criteria,
    'https://www.seloger.com/annonces/achat/maison/mougins-06/26ZEJMLWB13Y.htm',
  );
  const renderColleague = () =>
    renderToStaticMarkup(
      createElement(BuyerLetterDocument, {
        version: 'colleague',
        exclusivityCard: card,
        addressee: colleagueAddressee(card.label),
        addressSource: 'locator',
        texts: defaultBuyerColleagueLetter(colleagueFacts, criteria, sender),
        sender,
        theirPhotoUrl: null,
        qr: { size: 21, path: 'M0 0h1v1H0z' },
      }),
    );

  it('le destinataire, la demande, la question exacte', () => {
    const page = renderColleague();
    expect(page).toContain('Agence titulaire de l’exclusivité');
    expect(page).toMatch(/Maison · 7 pièces · 200\sm² · Mougins/);
    expect(page).toContain('Demande de collaboration');
    expect(page).toContain('Cher confrère,');
    expect(page).toContain('Je suis Natacha Conseil, conseiller chez Agence des Collines.');
    expect(page).toContain(
      'Votre mandat est-il ouvert à la collaboration pour une visite de mon acquéreur\u202f?',
    );
    expect(page).toContain('Annonce SeLoger n° 26ZEJMLWB13Y');
  });

  it('la carte ne reprend que ce que la fiche demande ET que l’annonce dit', () => {
    expect(card.rows).toEqual([
      { label: 'Type', value: 'Maison' },
      { label: 'Pièces', value: '7' },
      { label: 'Surface', value: formatSquareMeters(200) },
      { label: 'Extérieurs', value: 'Terrasse' },
      { label: 'Stationnement', value: 'Garage' },
      { label: 'Piscine', value: 'Oui' },
    ]);
    const noPool = colleagueExclusivityCard(colleagueFacts, { ...criteria, pool: null }, null);
    expect(noPool.rows.map((row) => row.label)).not.toContain('Piscine');
    expect(noPool.reference).toBeNull();
  });

  it('ni nom, ni budget, ni promesse, ni condition, ni mention CNIL', () => {
    const page = renderColleague();
    expect(page).not.toMatch(
      /Keller|1\s?500\s?000|1\s?650\s?000|certain|offre|prête|honoraires|droit de visite|CNIL/i,
    );
    expect(page).toContain('Ne peut recevoir aucun fonds');
    expect(page).toContain('entre professionnels');
  });

  it('une question réécrite qui nomme l’acquéreur est refusée', () => {
    expect(buyerLetterForbidden(['Un mandat pour la famille Keller\u202f?'], buyer)).toBe(true);
  });

  it('la version : le confrère en exclusivité, le propriétaire après un refus ou sans exclusivité', () => {
    expect(buyerLetterVersion('yes', false)).toBe('colleague');
    expect(buyerLetterVersion('yes', true)).toBe('owner');
    expect(buyerLetterVersion('no', false)).toBe('owner');
    expect(buyerLetterVersion(null, false)).toBe('owner');
  });

  it('après un refus, le courrier au propriétaire propose la phrase de M115', () => {
    expect(defaultBuyerLetter(facts, buyer, { collaborationDeclined: true }).letter).toContain(
      'elle a refusé cette collaboration. Je m’adresse donc à vous directement.',
    );
    expect(defaultBuyerLetter(facts, buyer).letter).not.toContain('refusé');
  });
});

// Jean-Guy (28/11) — les textes que réécrit le conseiller suivent la règle des espaces, à
// l'affichage seulement.
describe('les textes réécrits du courrier', () => {
  it('ne coupent pas leur ligne devant « : » ni « ? », et le texte reçu ne change pas', () => {
    const texts = {
      ...defaultBuyerLetter(facts, buyer),
      letter: 'Madame, Monsieur : une question ?',
    };
    const page = renderToStaticMarkup(
      createElement(BuyerLetterDocument, {
        addressee: buyerLetterAddressee(facts, '8 allée du Décor, 06370 Mouans-Sartoux'),
        addressSource: 'locator',
        texts,
        sender,
        theirPhotoUrl: null,
        qr: { size: 21, path: 'M0 0h1v1H0z' },
      }),
    );
    expect(page).toContain(`Madame, Monsieur${NBSP}: une question${NARROW_NBSP}?`);
    expect(texts.letter).toBe('Madame, Monsieur : une question ?');
  });
});

import { describe, expect, it } from 'vitest';

import { agencyMentionList } from '@/features/prospecting-file/services/build-prospecting-file';
import {
  BODY_FONT_PT,
  CONTACT_FONT_PT,
  CONTACT_LINE_MAX_CHARS,
  FOOTER_NAME_MAX_CHARS,
  HEADER_NAME_FONT_PT,
  HEADER_NAME_MAX_CHARS,
  contactAgencyLine,
  documentAgencyName,
  fitWholeWords,
  footerAgencyName,
  headerNameFontPt,
} from '@/features/prospecting-file/services/document-name';

// Le nom de l'agence de l'e2e : 60 caractères, sans logo, champ « Nom sur les documents » vide.
const TEST_AGENCY = 'TEST AUTOMATIQUE — ne pas utiliser — agence au nom très long';

describe('documentAgencyName', () => {
  it('prend « Nom sur les documents » s’il est rempli, sinon le nom de l’agence', () => {
    expect(documentAgencyName('Agence du Port', TEST_AGENCY)).toBe('Agence du Port');
    expect(documentAgencyName('', TEST_AGENCY)).toBe(TEST_AGENCY);
    expect(documentAgencyName('   ', 'Start')).toBe('Start');
    expect(documentAgencyName(null, null)).toBe('');
  });
});

describe('en-tête : deux lignes au plus, jamais sous la taille du texte courant', () => {
  it('garde la pleine taille pour un nom court', () => {
    expect(headerNameFontPt('Agence du Port')).toBe(HEADER_NAME_FONT_PT);
  });

  it('réduit le texte pour le nom de 60 caractères, sans passer sous le texte courant', () => {
    expect(TEST_AGENCY).toHaveLength(60);
    const size = headerNameFontPt(TEST_AGENCY);
    expect(size).toBeLessThan(HEADER_NAME_FONT_PT);
    expect(size).toBeGreaterThanOrEqual(BODY_FONT_PT);
    // Deux lignes de la feuille portent ce nom à cette taille.
    expect(TEST_AGENCY.length).toBeLessThanOrEqual(HEADER_NAME_MAX_CHARS);
  });

  it('ne descend jamais sous la taille du texte courant, même pour un nom démesuré', () => {
    expect(headerNameFontPt('Agence '.repeat(40))).toBe(BODY_FONT_PT);
  });
});

describe('fitWholeWords — jamais coupé au milieu d’un mot', () => {
  it('rend tel quel un nom qui tient', () => {
    expect(fitWholeWords('Agence du Port', 40)).toBe('Agence du Port');
  });

  it('coupe entre deux mots et le dit par « … »', () => {
    expect(fitWholeWords(TEST_AGENCY, 40)).toBe('TEST AUTOMATIQUE — ne pas utiliser…');
    expect(fitWholeWords('Immobilière des Remparts et du Vieux Port', 28)).toBe(
      'Immobilière des Remparts et…',
    );
  });

  it('ne dépasse jamais la place donnée', () => {
    for (const max of [10, 20, 33, 45, 59]) {
      const fitted = fitWholeWords(TEST_AGENCY, max);
      expect(fitted.length).toBeLessThanOrEqual(max);
      expect(TEST_AGENCY.startsWith(fitted.replace(/…$/, ''))).toBe(true);
      // Le dernier mot gardé est entier : ce qui suit dans le nom est un séparateur.
      const kept = fitted.replace(/…$/, '');
      expect(TEST_AGENCY.slice(kept.length, kept.length + 1)).toMatch(/^[\s—]?$/);
    }
  });
});

describe('pied de page et carte de contact : une seule ligne', () => {
  it('le nom de 60 caractères tient entier en pied de page', () => {
    expect(TEST_AGENCY.length).toBeLessThanOrEqual(FOOTER_NAME_MAX_CHARS);
    expect(footerAgencyName(TEST_AGENCY)).toBe(TEST_AGENCY);
    expect(
      agencyMentionList(
        {
          agencyName: TEST_AGENCY,
          postalAddress: null,
          professionalCard: null,
          professionalCardIssuer: null,
          financialGuarantee: null,
        },
        { withAddress: true },
      ),
    ).toEqual([TEST_AGENCY, 'Ne peut recevoir aucun fonds']);
  });

  it('un nom plus long encore est raccourci au mot entier', () => {
    const long = `${TEST_AGENCY} et de ses environs immédiats`;
    const fitted = footerAgencyName(long);
    expect(fitted.length).toBeLessThanOrEqual(FOOTER_NAME_MAX_CHARS);
    expect(fitted.endsWith('…')).toBe(true);
  });

  it('les mentions de l’agence suivent le nom', () => {
    expect(
      agencyMentionList(
        {
          agencyName: 'Start',
          postalAddress: ' 1 rue Exemple ',
          professionalCard: 'CPI 1',
          professionalCardIssuer: 'la CCI de Nice',
          financialGuarantee: null,
        },
        { withAddress: true },
      ),
    ).toEqual([
      'Start',
      '1 rue Exemple',
      'Carte professionnelle CPI 1 délivrée par la CCI de Nice',
      'Ne peut recevoir aucun fonds',
    ]);
  });

  it('« Conseiller · agence » garde sa taille pour un nom court', () => {
    expect(contactAgencyLine('Agence du Port')).toEqual({
      text: 'Conseiller · Agence du Port',
      fontPt: CONTACT_FONT_PT,
    });
  });

  it('réduit le texte pour le nom de 60 caractères, entier sur sa ligne', () => {
    const line = contactAgencyLine(TEST_AGENCY);
    expect(line.text).toBe(`Conseiller · ${TEST_AGENCY}`);
    expect(line.text.length).toBeLessThanOrEqual(CONTACT_LINE_MAX_CHARS);
    expect(line.fontPt).toBeLessThan(CONTACT_FONT_PT);
    expect(line.fontPt).toBeGreaterThanOrEqual(7.5);
  });
});

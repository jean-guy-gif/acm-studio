import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ProspectingFileDocument } from '@/features/prospecting-file/components/prospecting-file-document';
import { buildQrCode } from '@/features/prospecting-file/services/qr-code';
import { savedDocument } from '@/features/prospecting-file/services/saved-document';
import { makeFacts } from '@/features/prospecting-file/services/test-facts';
import { NO_SAVED_THEIR_PHOTO } from '@/features/prospecting-file/services/their-photo';
import {
  NO_OVERRIDES,
  type AddressSource,
  type ProspectingFileVersion,
  type ProspectingSender,
} from '@/features/prospecting-file/types';

const SENDER: ProspectingSender = {
  advisorName: 'Claire Martin',
  email: 'claire@agence.test',
  phone: '06 12 34 56 78',
  photoUrl: null,
  agencyName: 'Agence du Port',
  logoUrl: null,
  postalAddress: '1 place de la Mairie, 06160 Antibes',
  professionalCard: 'CPI 0605 2018 000 123 456',
  professionalCardIssuer: 'la CCI Nice Côte d’Azur',
  financialGuarantee: null,
  privacyUrl: 'acm.test/confidentialite',
};
const CARD = 'Carte professionnelle CPI 0605 2018 000 123 456 délivrée par la CCI Nice Côte d’Azur';

function printed(
  version: ProspectingFileVersion,
  source: AddressSource,
  sender: ProspectingSender = SENDER,
): string {
  const document = savedDocument({
    version,
    facts: makeFacts({ theirAddressSource: source }),
    sender,
    overrides: NO_OVERRIDES,
    photos: [],
    theirPhoto: { listing: [], saved: NO_SAVED_THEIR_PHOTO, signed: {}, prefix: 'a/p/c1/' },
    qr: buildQrCode('BEGIN:VCARD\nEND:VCARD'),
  });
  return renderToStaticMarkup(createElement(ProspectingFileDocument, document))
    .replace(/<style>[\s\S]*?<\/style>/, '')
    .replace(/&#x27;/g, "'");
}
const legal = (html: string): string =>
  /data-testid="legal-mention">([\s\S]*?)<\/footer>/.exec(html)?.[1].replace(/<!-- -->/g, '') ?? '';

// Mission 102 — ce que le courrier IMPRIME : la vraie source de l'adresse, les mentions de
// l'agence, sur les deux versions.
describe('le courrier imprimé', () => {
  it('propriétaire, adresse du Localisateur : la mention dit « données publiques »', () => {
    const mention = legal(printed('owner', 'locator'));
    expect(mention).toContain('Votre adresse a été déterminée à partir de données publiques');
    expect(mention).not.toContain('relevée par notre conseiller');
    expect(mention).toContain('Conservation : 3 ans au plus sans contact entre nous.');
    expect(mention).toContain('Confidentialité : acm.test/confidentialite.');
  });

  it('propriétaire, adresse saisie : la mention dit « relevée par notre conseiller »', () => {
    const mention = legal(printed('owner', 'advisor'));
    expect(mention).toContain('Votre adresse a été relevée par notre conseiller');
    expect(mention).not.toContain('données publiques');
  });

  it('propriétaire : la carte professionnelle et « aucun fonds » au verso, avant la mention légale', () => {
    const mention = legal(printed('owner', 'locator'));
    expect(
      mention.startsWith(`${CARD} · Ne peut recevoir aucun fonds. Responsable du traitement`),
    ).toBe(true);
  });

  it('la garantie financière, renseignée, remplace « aucun fonds »', () => {
    const html = printed('owner', 'locator', {
      ...SENDER,
      financialGuarantee: 'Galian — 120 000 €',
    });
    expect(legal(html)).toContain('Garantie financière : Galian — 120 000 €.');
    expect(html).not.toContain('aucun fonds');
  });

  it('confrère : la carte professionnelle en pied de page, sans mention sur l’adresse', () => {
    const html = printed('colleague', 'locator');
    expect(html).toContain(`${CARD} · Ne peut recevoir aucun fonds`);
    expect(html).not.toContain('data-testid="legal-mention"');
    expect(html).not.toContain('Votre adresse a été');
  });

  it('le nom sur les documents (M87) est celui qui s’imprime', () => {
    const html = printed('owner', 'locator', { ...SENDER, agencyName: 'Port Immo' });
    expect(legal(html)).toContain('Responsable du traitement : Port Immo, 1 place de la Mairie');
    expect(html).not.toContain('Agence du Port');
  });
});

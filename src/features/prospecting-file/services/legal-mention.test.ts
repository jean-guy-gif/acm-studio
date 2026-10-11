import { describe, expect, it } from 'vitest';

import { ownerLegalMention } from '@/features/prospecting-file/services/legal-mention';

const SENDER = {
  agencyName: 'Agence du Port',
  postalAddress: ' 12 avenue de la Libération, 06600 Antibes ',
  phone: '06 12 34 56 78',
  email: 'conseiller@agence.test',
};

describe('ownerLegalMention — le pied du courrier au propriétaire', () => {
  const mention = ownerLegalMention(SENDER);

  it('nomme le responsable du traitement : l’agence et son adresse', () => {
    expect(mention).toContain(
      'Responsable du traitement : Agence du Port, 12 avenue de la Libération, 06600 Antibes.',
    );
  });

  it('dit comment s’opposer à tout nouveau contact : téléphone ou e-mail du conseiller', () => {
    expect(mention).toContain(
      'Pour vous opposer à tout nouveau contact : 06 12 34 56 78 ou conseiller@agence.test.',
    );
  });

  it('rappelle le droit de saisir la CNIL, et d’où vient l’adresse', () => {
    expect(mention).toContain('Vous pouvez saisir la CNIL (cnil.fr).');
    expect(mention).toContain('Votre adresse provient d’une annonce publiée.');
  });

  it('ne parle jamais de « mandat » (version propriétaire, M84)', () => {
    expect(mention).not.toMatch(/mandat/i);
  });

  it('reste court : deux lignes du pied de page, même avec un nom d’agence de 60 caractères', () => {
    const long = ownerLegalMention({
      ...SENDER,
      agencyName: 'TEST AUTOMATIQUE — ne pas utiliser — agence au nom très long',
    });
    // Environ 170 caractères par ligne à la taille du pied de page (mesuré à l'écran).
    expect(long.length).toBeLessThanOrEqual(340);
  });
});

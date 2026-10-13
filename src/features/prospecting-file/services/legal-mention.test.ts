import { describe, expect, it } from 'vitest';

import {
  ADDRESS_SOURCE_MENTIONS,
  OWNER_ADDRESS_RETENTION_YEARS,
  ownerLegalMention,
} from '@/features/prospecting-file/services/legal-mention';
import { addressSource } from '@/features/prospecting-file/services/prospecting-facts';

const SENDER = {
  agencyName: 'Agence du Port',
  postalAddress: ' 12 avenue de la Libération, 06600 Antibes ',
  phone: '06 12 34 56 78',
  email: 'conseiller@agence.test',
  privacyUrl: 'acm-studio.vercel.app/confidentialite',
};

describe('ownerLegalMention — le pied du courrier au propriétaire', () => {
  const mention = ownerLegalMention(SENDER, 'locator');

  it('nomme le responsable du traitement : l’agence et son adresse', () => {
    expect(mention).toContain(
      'Responsable du traitement : Agence du Port, 12 avenue de la Libération, 06600 Antibes.',
    );
  });

  // Mission 102 — la mention dit VRAI sur l'origine de l'adresse.
  it('adresse du Localisateur : déterminée à partir de données publiques', () => {
    expect(mention).toContain(
      'Votre adresse a été déterminée à partir de données publiques (diagnostic de performance énergétique, registre des copropriétés ou cadastre) et de l’annonce de votre bien.',
    );
    expect(mention).not.toContain('relevée par notre conseiller');
  });

  it('adresse saisie ou corrigée par le conseiller : relevée par lui', () => {
    const typed = ownerLegalMention(SENDER, 'advisor');
    expect(typed).toContain(
      'Votre adresse a été relevée par notre conseiller à partir de l’annonce de votre bien.',
    );
    expect(typed).not.toContain('données publiques');
  });

  it('ne dit plus jamais que l’adresse « provient d’une annonce publiée »', () => {
    for (const source of ['locator', 'advisor', 'verified'] as const) {
      expect(ownerLegalMention(SENDER, source)).not.toContain('provient d’une annonce publiée');
    }
  });

  // Mission 103 — l'ancien cas : une adresse confirmée avant la mission (source « vous », mais
  // position du Localisateur). La formule est vraie que l'adresse vienne de lui ou du conseiller.
  it('source d’origine inconnue : une formule vraie dans les deux cas', () => {
    const verified = ownerLegalMention(SENDER, 'verified');
    expect(verified).toContain(
      'Votre adresse a été déterminée à partir de l’annonce de votre bien et de données publiques, puis vérifiée par notre conseiller.',
    );
    expect(verified).not.toContain('relevée par notre conseiller');
    expect(verified.length).toBeLessThanOrEqual(5 * 170);
  });

  it('la variante suit la source D’ORIGINE : confirmer ne la change pas, saisir ou corriger oui', () => {
    for (const source of [
      'dpe',
      'copropriete',
      'residence',
      'terrain',
      'meme-bien',
      'cercle',
      null,
    ]) {
      // Proposée, confirmée par le Localisateur ou par le conseiller : c'est la même source.
      expect(addressSource(source, true)).toBe('locator');
      expect(addressSource(source, false)).toBe('locator');
    }
    // Saisie ou corrigée : « vous », sans position.
    expect(addressSource('vous', false)).toBe('advisor');
    // Confirmée avant la mission 103 : « vous », avec la position du Localisateur.
    expect(addressSource('vous', true)).toBe('verified');
    expect(Object.keys(ADDRESS_SOURCE_MENTIONS)).toEqual(['locator', 'advisor', 'verified']);
  });

  it('dit la finalité et la durée de conservation : 3 ans', () => {
    expect(OWNER_ADDRESS_RETENTION_YEARS).toBe(3);
    expect(mention).toContain('Finalité : vous proposer nos services pour la vente de votre bien.');
    expect(mention).toContain('Conservation : 3 ans au plus sans contact entre nous.');
  });

  it('dit les droits d’accès, d’opposition et d’effacement, et comment les exercer', () => {
    expect(mention).toContain(
      'Vos droits d’accès, d’opposition et d’effacement : 06 12 34 56 78 ou conseiller@agence.test.',
    );
  });

  it('rappelle le droit de saisir la CNIL et donne la page de confidentialité', () => {
    expect(mention).toContain('Vous pouvez saisir la CNIL (cnil.fr).');
    expect(mention).toContain('Confidentialité : acm-studio.vercel.app/confidentialite.');
  });

  it('ne parle jamais de « mandat » (version propriétaire, M84)', () => {
    expect(mention).not.toMatch(/mandat/i);
  });

  it('tient dans le pied du verso : cinq lignes au plus, même avec un nom d’agence de 60 caractères', () => {
    const long = ownerLegalMention(
      { ...SENDER, agencyName: 'TEST AUTOMATIQUE — ne pas utiliser — agence au nom très long' },
      'locator',
    );
    // Environ 170 caractères par ligne à la taille du pied de page (mesuré à l'écran).
    expect(long.length).toBeLessThanOrEqual(5 * 170);
  });
});

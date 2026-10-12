import { describe, expect, it } from 'vitest';

import {
  FILE_BLOCKER_MESSAGES,
  fileBlocker,
  fileVersions,
  resolveFileVersion,
} from '@/features/prospecting-file/services/file-access';

describe('la version se choisit seule', () => {
  it('exclusivité → confrère ; particulier ou mandat simple → propriétaire', () => {
    expect(fileVersions('colleague')).toEqual(['colleague']);
    expect(fileVersions('owner')).toEqual(['owner']);
    expect(resolveFileVersion('colleague', 'owner')).toBe('colleague');
    expect(resolveFileVersion('owner', undefined)).toBe('owner');
  });

  it('inconnu : le conseiller choisit, et rien tant qu’il n’a pas choisi', () => {
    expect(fileVersions('check')).toEqual(['colleague', 'owner']);
    expect(resolveFileVersion('check', undefined)).toBeNull();
    expect(resolveFileVersion('check', 'autre')).toBeNull();
    expect(resolveFileVersion('check', ['owner'])).toBeNull();
    expect(resolveFileVersion('check', 'owner')).toBe('owner');
  });
});

describe('ce qui retient un dossier', () => {
  const ready = {
    version: 'owner' as const,
    opposed: false,
    addressConfirmed: true,
    advisorPhone: '06 12 34 56 78',
    agencyAddress: '12 avenue de la Libération, 06600 Antibes',
    professionalCard: 'CPI 0605 2018 000 123 456',
    professionalCardIssuer: 'la CCI Nice Côte d’Azur',
  };

  it('rien quand tout est là', () => {
    expect(fileBlocker(ready)).toBeNull();
  });

  it('le dossier s’ouvre dès le mandat signé, sans lien d’annonce à renseigner', () => {
    expect(Object.keys(ready)).toEqual([
      'version',
      'opposed',
      'addressConfirmed',
      'advisorPhone',
      'agencyAddress',
      'professionalCard',
      'professionalCardIssuer',
    ]);
    expect(fileBlocker({ ...ready, version: 'colleague' })).toBeNull();
  });

  // Mission 98 — la liste « Ne plus solliciter » bloque le courrier au propriétaire, avant tout
  // le reste : rien de ce que le conseiller renseigne ne lève ce refus.
  it('aucun courrier à un propriétaire qui a demandé à ne plus être sollicité', () => {
    expect(fileBlocker({ ...ready, opposed: true })).toBe('opposed');
    expect(
      fileBlocker({ ...ready, opposed: true, addressConfirmed: false, advisorPhone: null }),
    ).toBe('opposed');
    expect(FILE_BLOCKER_MESSAGES.opposed).toBe(
      'Ce propriétaire a demandé à ne plus être sollicité',
    );
  });

  it('pas de dossier propriétaire sans adresse confirmée', () => {
    expect(fileBlocker({ ...ready, addressConfirmed: false })).toBe('address_unconfirmed');
  });

  it('pas de dossier propriétaire sans téléphone pour « ne plus être sollicité »', () => {
    expect(fileBlocker({ ...ready, advisorPhone: null })).toBe('phone_missing');
  });

  // Mission 90 — le courrier au propriétaire porte l'adresse de l'agence, responsable du
  // traitement : sans elle, pas de PDF.
  it('PDF propriétaire refusé sans adresse d’agence, avec le message qui dit où la saisir', () => {
    for (const agencyAddress of [null, '', '   ']) {
      expect(fileBlocker({ ...ready, agencyAddress })).toBe('agency_address_missing');
    }
    expect(FILE_BLOCKER_MESSAGES.agency_address_missing).toBe(
      'Ajoutez l’adresse de l’agence dans Administration → Identité pour préparer ce courrier.',
    );
  });

  it('ce qui se lève en premier se dit en premier : adresse du bien, téléphone, adresse d’agence', () => {
    const nothing = { ...ready, addressConfirmed: false, advisorPhone: null, agencyAddress: null };
    expect(fileBlocker(nothing)).toBe('address_unconfirmed');
    expect(fileBlocker({ ...nothing, addressConfirmed: true })).toBe('phone_missing');
    expect(fileBlocker({ ...nothing, addressConfirmed: true, advisorPhone: '06' })).toBe(
      'agency_address_missing',
    );
  });

  // Mission 102 — tout courrier porte la carte professionnelle et qui l'a délivrée : sans l'une
  // ou l'autre, aucune version ne s'imprime, et le message dit où les saisir.
  it('courrier refusé sans carte professionnelle ou sans l’autorité qui l’a délivrée', () => {
    for (const version of ['owner', 'colleague'] as const) {
      for (const missing of [null, '', '  ']) {
        expect(fileBlocker({ ...ready, version, professionalCard: missing })).toBe(
          'professional_card_missing',
        );
        expect(fileBlocker({ ...ready, version, professionalCardIssuer: missing })).toBe(
          'professional_card_missing',
        );
      }
    }
    expect(FILE_BLOCKER_MESSAGES.professional_card_missing).toBe(
      'Renseignez la carte professionnelle de l’agence (Administration → Identité)',
    );
  });

  it('la carte se dit en dernier : l’opposition, l’adresse, le téléphone passent avant', () => {
    const noCard = { ...ready, professionalCard: null };
    expect(fileBlocker({ ...noCard, opposed: true })).toBe('opposed');
    expect(fileBlocker({ ...noCard, addressConfirmed: false })).toBe('address_unconfirmed');
    expect(fileBlocker({ ...noCard, agencyAddress: null })).toBe('agency_address_missing');
  });

  it('le confrère n’attend ni adresse, ni téléphone, ni adresse d’agence', () => {
    expect(
      fileBlocker({
        ...ready,
        version: 'colleague',
        addressConfirmed: false,
        advisorPhone: null,
        agencyAddress: null,
      }),
    ).toBeNull();
  });
});

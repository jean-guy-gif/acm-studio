import { describe, expect, it } from 'vitest';

import {
  excludedFromBatch,
  CHOOSE_MESSAGE,
  splitBatchLetters,
  type BatchContext,
} from '@/features/prospecting-file/services/batch-letters';
import { fileBlocker } from '@/features/prospecting-file/services/file-access';

// Mission 102 — les courriers en lot appliquent les blocages du courrier unitaire.
describe('courriers en lot : ce qui s’imprime, ce qui est retenu', () => {
  const ready = {
    opposed: false,
    addressConfirmed: true,
    advisorPhone: '06 12 34 56 78',
    agencyAddress: '1 place de la Mairie, 06160 Antibes',
    professionalCard: 'CPI 0605 2018 000 123 456',
    professionalCardIssuer: 'la CCI Nice Côte d’Azur',
  };
  const context = (input: Parameters<typeof fileBlocker>[0]): BatchContext => {
    const blocker = fileBlocker(input);
    return blocker ? { status: 'blocked', blocker } : { status: 'ready' };
  };

  it('sans carte professionnelle, aucun courrier du lot ne s’imprime, et chacun dit pourquoi', () => {
    const { letters, held } = splitBatchLetters([
      {
        row: 'proprietaire',
        context: context({ ...ready, version: 'owner', professionalCard: null }),
      },
      {
        row: 'confrere',
        context: context({ ...ready, version: 'colleague', professionalCardIssuer: '' }),
      },
    ]);
    expect(letters).toEqual([]);
    expect(held).toEqual([
      {
        row: 'proprietaire',
        reason: 'Renseignez la carte professionnelle de l’agence (Administration → Identité)',
      },
      {
        row: 'confrere',
        reason: 'Renseignez la carte professionnelle de l’agence (Administration → Identité)',
      },
    ]);
  });

  it('chaque courrier retenu est listé avec SA raison ; les autres s’impriment', () => {
    const { letters, held } = splitBatchLetters([
      { row: 'pret', context: context({ ...ready, version: 'owner' }) },
      { row: 'oppose', context: context({ ...ready, version: 'owner', opposed: true }) },
      {
        row: 'sans-telephone',
        context: context({ ...ready, version: 'owner', advisorPhone: null }),
      },
      { row: 'sans-agence', context: context({ ...ready, version: 'owner', agencyAddress: null }) },
      { row: 'a-preciser', context: { status: 'choose' } satisfies BatchContext as BatchContext },
      { row: 'ferme', context: { status: 'not_found' } satisfies BatchContext as BatchContext },
    ]);
    expect(letters.map((letter) => letter.row)).toEqual(['pret']);
    expect(held).toEqual([
      { row: 'oppose', reason: 'Ce propriétaire a demandé à ne plus être sollicité' },
      {
        row: 'sans-telephone',
        reason:
          'Renseignez votre téléphone dans « Mon profil » : il figure dans la mention « Pour ne plus être sollicité ».',
      },
      {
        row: 'sans-agence',
        reason:
          'Ajoutez l’adresse de l’agence dans Administration → Identité pour préparer ce courrier.',
      },
      { row: 'a-preciser', reason: CHOOSE_MESSAGE },
      { row: 'ferme', reason: 'Ce dossier ne peut pas être préparé.' },
    ]);
  });
});

// Mission 105 — chaque adresse exclue des courriers en lot est listée en tête, avec sa raison.
describe('les adresses écartées avant la préparation', () => {
  it('« Ne plus solliciter » et « adresse à confirmer » sont dites ; le reste ne l’est pas', () => {
    expect(
      excludedFromBatch([
        { row: 'opposée', status: 'ready', opposed: true },
        { row: 'à confirmer', status: 'to_confirm', opposed: false },
        { row: 'prête', status: 'ready', opposed: false },
        { row: 'remise', status: 'handed', opposed: false },
      ]),
    ).toEqual([
      { row: 'opposée', reason: 'Ce propriétaire a demandé à ne plus être sollicité' },
      { row: 'à confirmer', reason: 'Adresse à confirmer avant d’envoyer' },
    ]);
  });
});

import { describe, expect, it } from 'vitest';

import { addressLines } from '@/features/prospecting-file/services/addressee-lines';
import { buildProspectingFile } from '@/features/prospecting-file/services/build-prospecting-file';
import { makeFacts } from '@/features/prospecting-file/services/test-facts';

describe('addressLines — l’adresse ne se coupe pas au milieu', () => {
  it('met la voie sur une ligne, le code postal et la suite sur la suivante', () => {
    expect(addressLines('8 avenue Docteur Hochet 06160 Antibes · 2e étage')).toEqual([
      '8 avenue Docteur Hochet',
      '06160 Antibes · 2e étage',
    ]);
    expect(addressLines('14 chemin des Oliviers, 06800 Cagnes-sur-Mer')).toEqual([
      '14 chemin des Oliviers',
      '06800 Cagnes-sur-Mer',
    ]);
  });

  it('sans code postal, coupe à la dernière virgule', () => {
    expect(addressLines('12 avenue de Verdun, Antibes')).toEqual([
      '12 avenue de Verdun',
      'Antibes',
    ]);
  });

  it('sans repère, garde l’adresse d’un bloc', () => {
    expect(addressLines('Résidence Les Pins')).toEqual(['Résidence Les Pins']);
    expect(addressLines('   ')).toEqual([]);
  });

  it('un numéro de voie à cinq chiffres n’est pas pris pour un code postal', () => {
    expect(addressLines('12345 route des Crêtes 06140 Vence')).toEqual([
      '12345 route des Crêtes',
      '06140 Vence',
    ]);
  });
});

describe('destinataire de la version propriétaire', () => {
  it('« Aux copropriétaires du », puis la voie, puis le code postal et la commune', () => {
    const file = buildProspectingFile(
      makeFacts({
        kind: 'apartment',
        theirAddress: '8 avenue Docteur Hochet 06160 Antibes · 2e étage',
      }),
      'owner',
      { showPrices: true },
    );
    expect(file.addressee).toEqual({
      lead: 'Aux copropriétaires du',
      nameLines: ['8 avenue Docteur Hochet', '06160 Antibes · 2e étage'],
      detail: null,
    });
  });
});

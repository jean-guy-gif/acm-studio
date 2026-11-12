import { describe, expect, it } from 'vitest';

import {
  readOutsideTitle,
  titleDay,
  voucherOutsideLine,
  withBuyer,
} from '@/features/visit-voucher/services/outside-mandate';

// Mission 153 — le titre auquel l'Agence intervient sur un bien hors mandat.
describe('le titre hors mandat', () => {
  it('se relit par liste d’autorisation : un titre incomplet n’existe pas', () => {
    expect(readOutsideTitle({ kind: 'search', number: 'R-1', signedOn: '2026-11-04' })).toEqual({
      kind: 'search',
      number: 'R-1',
      signedOn: '2026-11-04',
    });
    expect(readOutsideTitle({ kind: 'search', number: '', signedOn: '2026-11-04' })).toBeNull();
    expect(readOutsideTitle({ kind: 'colleague', agency: 'A', number: '1' })).toBeNull();
    expect(readOutsideTitle({ kind: 'sale', number: '1' })).toBeNull();
    expect(readOutsideTitle(null)).toBeNull();
    // Une date qui n'existe pas n'est pas un mandat (relecteur).
    expect(readOutsideTitle({ kind: 'search', number: 'R-1', signedOn: '2026-02-31' })).toBeNull();
  });

  it('la ligne du bien et le nom de la fiche', () => {
    expect(titleDay('2026-11-04')).toBe('04/11/2026');
    expect(
      voucherOutsideLine(
        { kind: 'colleague', agency: 'Agence Littoral & Pins', number: 'V-4471' },
        { price: '1 720 000', address: '8 allée des Cistes Blancs' },
      ),
    ).toBe(
      'En collaboration avec Agence Littoral & Pins, mandat de vente n° V-4471 · Prix affiché : 1 720 000 € · Adresse du bien : 8 allée des Cistes Blancs',
    );
    expect(withBuyer('Famille Keller')).toBe('la famille Keller');
    expect(withBuyer('M. et Mme Lambert')).toBe('M. et Mme Lambert');
  });
});

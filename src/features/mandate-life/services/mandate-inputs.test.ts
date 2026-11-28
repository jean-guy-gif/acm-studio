import { describe, expect, it } from 'vitest';

import {
  gestureAllowed,
  MANDATE_INPUT_ERRORS,
  parseAmendmentDay,
  parseCompromise,
  parseEndedOn,
  parseMandateEnd,
  parseSale,
} from '@/features/mandate-life/services/mandate-inputs';

// Lot C — ce que le conseiller saisit dans « Son mandat », relu au serveur : des jours valables,
// jamais avant la signature, jamais dans l'avenir pour ce qui a eu lieu ; l'acte jamais avant le
// compromis ; un prix en euros entiers ; et chaque geste à son étape.
const SIGNED = '2026-10-28';
const TODAY = '2026-11-28';

describe('la fin du mandat', () => {
  it('en mois : la date se calcule depuis la signature ; la reconduction tacite se garde', () => {
    expect(parseMandateEnd({ months: 3, tacit: true }, SIGNED)).toEqual({
      ok: true,
      endsOn: '2027-01-28',
      tacit: true,
    });
    expect(parseMandateEnd({ months: '3' }, SIGNED)).toMatchObject({ ok: true, tacit: false });
    expect(parseMandateEnd({ months: 0 }, SIGNED)).toEqual({
      ok: false,
      error: MANDATE_INPUT_ERRORS.months,
    });
  });

  it('en date : jamais avant la signature', () => {
    expect(parseMandateEnd({ endsOn: '2027-02-15' }, SIGNED)).toMatchObject({
      endsOn: '2027-02-15',
    });
    expect(parseMandateEnd({ endsOn: '2026-10-01' }, SIGNED)).toEqual({
      ok: false,
      error: MANDATE_INPUT_ERRORS.beforeSignature,
    });
    expect(parseMandateEnd({ endsOn: '31/01/2027' }, SIGNED)).toEqual({
      ok: false,
      error: MANDATE_INPUT_ERRORS.day,
    });
  });
});

describe('les dates de ce qui a eu lieu', () => {
  it('un avenant : de la signature à aujourd’hui', () => {
    expect(parseAmendmentDay('2026-11-14', SIGNED, TODAY)).toEqual({
      ok: true,
      amendedOn: '2026-11-14',
    });
    expect(parseAmendmentDay('2026-10-01', SIGNED, TODAY).ok).toBe(false);
    expect(parseAmendmentDay('2026-12-01', SIGNED, TODAY)).toEqual({
      ok: false,
      error: MANDATE_INPUT_ERRORS.future,
    });
  });

  it('le compromis : passé ; l’acte prévu au plus tôt le même jour, même dans l’avenir', () => {
    expect(
      parseCompromise(
        { compromiseSignedOn: '2026-11-25', deedPlannedOn: '2027-01-15' },
        SIGNED,
        TODAY,
      ),
    ).toEqual({ ok: true, compromiseSignedOn: '2026-11-25', deedPlannedOn: '2027-01-15' });
    expect(
      parseCompromise(
        { compromiseSignedOn: '2026-11-25', deedPlannedOn: '2026-11-20' },
        SIGNED,
        TODAY,
      ),
    ).toEqual({ ok: false, error: MANDATE_INPUT_ERRORS.deedBeforeCompromise });
    expect(
      parseCompromise(
        { compromiseSignedOn: '2026-12-05', deedPlannedOn: '2027-01-15' },
        SIGNED,
        TODAY,
      ),
    ).toEqual({ ok: false, error: MANDATE_INPUT_ERRORS.future });
  });

  it('la vente : l’acte entre le compromis et aujourd’hui, un prix en euros entiers', () => {
    expect(
      parseSale({ deedSignedOn: '2026-11-27', salePrice: 1_560_000 }, '2026-11-02', TODAY),
    ).toEqual({
      ok: true,
      deedSignedOn: '2026-11-27',
      salePrice: 1_560_000,
    });
    expect(
      parseSale({ deedSignedOn: '2026-11-01', salePrice: 1_560_000 }, '2026-11-02', TODAY).ok,
    ).toBe(false);
    expect(
      parseSale({ deedSignedOn: '2026-11-27', salePrice: 1_560_000.5 }, '2026-11-02', TODAY),
    ).toEqual({
      ok: false,
      error: MANDATE_INPUT_ERRORS.price,
    });
    expect(
      parseSale({ deedSignedOn: '2026-11-27', salePrice: '1560000' }, '2026-11-02', TODAY).ok,
    ).toBe(false);
  });

  it('la fin sans vente : de la signature à aujourd’hui', () => {
    expect(parseEndedOn('2026-11-28', SIGNED, TODAY)).toEqual({ ok: true, endedOn: '2026-11-28' });
    expect(parseEndedOn('2026-11-29', SIGNED, TODAY).ok).toBe(false);
  });
});

describe('chaque geste à son étape', () => {
  it('le compromis depuis « Mandat signé » ou « Offre acceptée », la vente sous compromis', () => {
    expect(gestureAllowed('compromise', 'signed')).toBe(true);
    expect(gestureAllowed('compromise', 'offer_accepted')).toBe(true);
    expect(gestureAllowed('compromise', 'sold')).toBe(false);
    expect(gestureAllowed('sale', 'under_compromise')).toBe(true);
    expect(gestureAllowed('sale', 'offer_accepted')).toBe(false);
  });

  it('la fin sans vente : seulement sans offre acceptée ; une étape inconnue n’autorise rien', () => {
    expect(gestureAllowed('ended', 'signed')).toBe(true);
    expect(gestureAllowed('ended', 'offer_accepted')).toBe(false);
    expect(gestureAllowed('amendment', 'unknown')).toBe(false);
    expect(gestureAllowed('end', null)).toBe(false);
  });
});

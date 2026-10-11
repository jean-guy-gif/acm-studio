import { describe, expect, it } from 'vitest';

import { readDecisionForm } from '@/features/meeting-conclusion/schemas/conclusion-input';
import {
  MANDATE_TYPE_REQUIRED_MESSAGE,
  OUTCOME_REQUIRED_MESSAGE,
  PRICE_REQUIRED_MESSAGE,
  checkDecision,
} from '@/features/meeting-conclusion/services/conclusion-requirements';

// Le formulaire tel qu'il arrive au serveur, puis ce que l'issue exige.
function decide(
  fields: Record<string, string>,
  known: { commercializationPrice: number | null; mandateType: 'exclusive' | 'simple' | null } = {
    commercializationPrice: null,
    mandateType: null,
  },
) {
  const formData = new FormData();
  Object.entries(fields).forEach(([name, value]) => formData.set(name, value));
  const parsed = readDecisionForm(formData);
  if (!parsed.success) {
    return { ok: false as const, error: 'forme', parsed };
  }
  return checkDecision(parsed.data, known);
}

describe('« Mandat signé » exige exclusif ou simple (mission 90)', () => {
  it('conclusion refusée sans exclusif ni simple', () => {
    const result = decide({ outcome: 'signed', commercialization_price: '315000' });
    expect(result).toEqual({ ok: false, error: MANDATE_TYPE_REQUIRED_MESSAGE });
  });

  it('refusée aussi quand un prix est déjà enregistré : le type manque toujours', () => {
    expect(
      decide({ outcome: 'signed' }, { commercializationPrice: 315000, mandateType: null }),
    ).toEqual({ ok: false, error: MANDATE_TYPE_REQUIRED_MESSAGE });
  });

  it('acceptée en exclusif comme en simple', () => {
    for (const type of ['exclusive', 'simple'] as const) {
      const result = decide({
        outcome: 'signed',
        mandate_type: type,
        commercialization_price: '315000',
      });
      expect(result).toEqual({
        ok: true,
        value: { outcome: 'signed', reason: null, mandateType: type, price: 315000 },
      });
    }
  });

  it('un type hors liste n’est pas un type', () => {
    expect(decide({ outcome: 'signed', mandate_type: 'co-exclusif' }).ok).toBe(false);
  });
});

describe('« Mandat signé » exige un prix quand il manque', () => {
  it('conclusion refusée sans prix quand aucun n’est enregistré', () => {
    expect(decide({ outcome: 'signed', mandate_type: 'exclusive' })).toEqual({
      ok: false,
      error: PRICE_REQUIRED_MESSAGE,
    });
    expect(
      decide({ outcome: 'signed', mandate_type: 'exclusive', commercialization_price: '  ' }),
    ).toEqual({ ok: false, error: PRICE_REQUIRED_MESSAGE });
  });

  it('acceptée sans prix saisi quand un prix est déjà enregistré : il est gardé', () => {
    expect(
      decide(
        { outcome: 'signed', mandate_type: 'simple' },
        { commercializationPrice: 315000, mandateType: null },
      ),
    ).toEqual({
      ok: true,
      value: { outcome: 'signed', reason: null, mandateType: 'simple', price: null },
    });
  });

  it('un prix saisi remplace celui qui est enregistré', () => {
    const result = decide(
      { outcome: 'signed', mandate_type: 'exclusive', commercialization_price: '320 000' },
      { commercializationPrice: 315000, mandateType: 'simple' },
    );
    expect(result.ok && result.value.price).toBe(320000);
  });

  it('un prix mal formé est refusé à la lecture du formulaire', () => {
    for (const price of ['abc', '-5', '0']) {
      expect(
        decide({ outcome: 'signed', mandate_type: 'simple', commercialization_price: price }).ok,
      ).toBe(false);
    }
  });
});

describe('les trois autres issues', () => {
  it('« À relancer » : prix facultatif, motif gardé', () => {
    expect(decide({ outcome: 'follow_up', follow_up_reason: ' le délai ' })).toEqual({
      ok: true,
      value: { outcome: 'follow_up', reason: 'le délai', mandateType: null, price: null },
    });
    const withPrice = decide({ outcome: 'follow_up', commercialization_price: '300000' });
    expect(withPrice.ok && withPrice.value.price).toBe(300000);
  });

  it('« Vendu ailleurs » et « Retiré » acceptent un motif, comme « À relancer »', () => {
    for (const outcome of ['sold_elsewhere', 'withdrawn']) {
      expect(decide({ outcome, follow_up_reason: 'chez un confrère' })).toEqual({
        ok: true,
        value: { outcome, reason: 'chez un confrère', mandateType: null, price: null },
      });
      expect(decide({ outcome }).ok).toBe(true);
    }
  });

  it('un type de mandat envoyé pour une autre issue est ignoré', () => {
    const result = decide({ outcome: 'withdrawn', mandate_type: 'exclusive' });
    expect(result.ok && result.value.mandateType).toBeNull();
  });

  it('un mandat signé ne porte pas de motif', () => {
    const result = decide({
      outcome: 'signed',
      mandate_type: 'simple',
      commercialization_price: '1',
      follow_up_reason: 'reste d’un ancien « à relancer »',
    });
    expect(result.ok && result.value.reason).toBeNull();
  });
});

describe('le message d’erreur cite les quatre issues', () => {
  it('sans issue, ou avec une issue inconnue', () => {
    expect(decide({}).ok).toBe(false);
    expect(decide({ outcome: 'perdu' }).ok).toBe(false);
    for (const label of ['Mandat signé', 'À relancer', 'Vendu ailleurs', 'Retiré de la vente']) {
      expect(OUTCOME_REQUIRED_MESSAGE).toContain(label);
    }
  });
});

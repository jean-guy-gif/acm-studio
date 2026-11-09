import { describe, expect, it } from 'vitest';

import {
  buyerFilterCounts,
  matchesBuyerFilter,
  parseBuyerFilter,
} from '@/features/buyers/services/buyer-filters';
import {
  buyerUrgency,
  compareBuyerUrgency,
  urgencyLabel,
  type BuyerUrgencyInput,
} from '@/features/buyers/services/buyer-urgency';

// Mission 146 (partie B, I4) — la liste des acquéreurs triée par urgence, et ses filtres.
const TODAY = '2026-11-09';
const base: BuyerUrgencyInput = {
  sale: false,
  relaunchDueOn: null,
  recontactOn: null,
  since: null,
  updatedAt: '2026-11-01T10:00:00Z',
};
const row = (name: string, input: Partial<BuyerUrgencyInput>) => {
  const full = { ...base, ...input };
  return { name, ...full, urgency: buyerUrgency(full, TODAY) };
};
const order = (rows: ReturnType<typeof row>[]) =>
  [...rows].sort(compareBuyerUrgency).map((entry) => entry.name);

describe('buyerUrgency', () => {
  it('la vente en cours d’abord, puis le retard, puis la prochaine étape la plus ancienne', () => {
    expect(
      order([
        row('ancienne', { since: '2026-09-20T10:00:00Z' }),
        row('récente', { since: '2026-11-05T10:00:00Z' }),
        row('sans date', {}),
        row('relance du jour', { relaunchDueOn: TODAY }),
        row('relance en retard', { relaunchDueOn: '2026-11-07' }),
        row('contact en retard', { recontactOn: '2026-11-08' }),
        row('vente', { sale: true, relaunchDueOn: '2026-10-01' }),
      ]),
    ).toEqual([
      'vente',
      'relance en retard',
      'contact en retard',
      'relance du jour',
      'ancienne',
      'récente',
      'sans date',
    ]);
  });

  it('une échéance à venir n’est pas un retard', () => {
    expect(buyerUrgency({ ...base, relaunchDueOn: '2026-11-12' }, TODAY)).toEqual({
      rank: 2,
      due: null,
    });
  });

  it('la relance l’emporte sur « Reprendre contact », comme dans « Aujourd’hui »', () => {
    const urgency = buyerUrgency(
      { ...base, relaunchDueOn: '2026-11-08', recontactOn: '2026-11-01' },
      TODAY,
    );
    expect(urgency.due).toEqual({ reason: 'relaunch', dueOn: '2026-11-08', lateDays: 1 });
  });

  it('dit le retard en orange, et le contact à reprendre par son nom', () => {
    const late = buyerUrgency({ ...base, relaunchDueOn: '2026-11-08' }, TODAY).due;
    expect(urgencyLabel(late, 'Relancer sa réponse')).toBe('en retard d’un jour');
    expect(urgencyLabel(late, 'Organiser la visite')).toBe('relance en retard d’un jour');
    const contact = buyerUrgency({ ...base, recontactOn: '2026-11-06' }, TODAY).due;
    expect(urgencyLabel(contact, 'Trouver ses biens idéaux')).toBe(
      'contact à reprendre en retard de 3 jours',
    );
    const today = buyerUrgency({ ...base, recontactOn: TODAY }, TODAY).due;
    expect(urgencyLabel(today, 'Trouver ses biens idéaux')).toBe('contact à reprendre aujourd’hui');
    expect(urgencyLabel(null, 'Trouver ses biens idéaux')).toBeNull();
  });
});

describe('les filtres d’état', () => {
  const rows = [
    { readiness: 'ready' as const, status: 'searching' },
    { readiness: 'ready' as const, status: 'visiting' },
    { readiness: 'recontact' as const, status: 'searching' },
    { readiness: null, status: 'under_offer' },
  ];

  it('se comptent dans la vue', () => {
    expect(buyerFilterCounts(rows)).toEqual({ all: 4, ready: 2, recontact: 1, under_offer: 1 });
    expect(buyerFilterCounts([])).toEqual({ all: 0, ready: 0, recontact: 0, under_offer: 0 });
  });

  it('chacun garde ses fiches', () => {
    expect(rows.filter((entry) => matchesBuyerFilter(entry, 'under_offer'))).toHaveLength(1);
    expect(parseBuyerFilter('ready')).toBe('ready');
    expect(parseBuyerFilter('n’importe quoi')).toBe('all');
    expect(parseBuyerFilter(null)).toBe('all');
  });
});

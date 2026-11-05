import { describe, expect, it } from 'vitest';

import { parseQuickBuyerInput, QUICK_STARS_ERROR } from '@/features/buyers/schemas/buyer-input';
import { budgetStepLabel } from '@/features/buyers/services/budget-steps';
import { suggestedCities } from '@/features/buyers/services/buyer-criteria';
import { NO_PROGRESS, type BuyerProgressFacts } from '@/features/buyers/services/buyer-progress';
import {
  buyerReadiness,
  lastActivityAt,
  type BuyerReadinessInput,
} from '@/features/buyers/services/buyer-readiness';
import {
  buildSuiviTaskList,
  type SuiviTask,
} from '@/features/meeting-conclusion/services/suivi-tasks';
import { taskLine } from '@/features/meeting-conclusion/services/suivi-step-labels';

// Mission 132 — « Prêt à visiter » = financement validé + un échange il y a moins de 30 jours + un
// budget plafond ; « À recontacter » au-delà ; pas de condition de délai d'achat (05/11).
const NOW = new Date('2026-11-05T10:00:00Z');
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();
const buyer = (over: Partial<BuyerReadinessInput> = {}): BuyerReadinessInput => ({
  status: 'searching',
  financing: 'validated',
  budgetMax: 750_000,
  createdAt: daysAgo(60),
  statusChangedAt: daysAgo(60),
  contactedAt: daysAgo(5),
  ...over,
});
const facts = (over: Partial<BuyerProgressFacts> = {}): BuyerProgressFacts => ({
  ...NO_PROGRESS,
  ...over,
});

describe('prêt à visiter', () => {
  it('financement validé, un échange récent, un budget : prêt', () => {
    expect(buyerReadiness(buyer(), facts(), NOW).state).toBe('ready');
  });

  it('les bornes : 29 jours, encore prêt ; 30 jours, à recontacter', () => {
    expect(buyerReadiness(buyer({ contactedAt: daysAgo(29) }), facts(), NOW)).toMatchObject({
      state: 'ready',
      sinceDays: 29,
    });
    expect(buyerReadiness(buyer({ contactedAt: daysAgo(30) }), facts(), NOW)).toMatchObject({
      state: 'recontact',
      sinceDays: 30,
    });
  });

  it('financement en cours ou inconnu : jamais prêt', () => {
    expect(buyerReadiness(buyer({ financing: 'in_progress' }), facts(), NOW).state).toBeNull();
    expect(buyerReadiness(buyer({ financing: 'unknown' }), facts(), NOW).state).toBeNull();
  });

  it('sans budget plafond : pas prêt', () => {
    expect(buyerReadiness(buyer({ budgetMax: null }), facts(), NOW).state).toBeNull();
  });

  it('a acheté ou abandonné : ni prêt ni à recontacter', () => {
    for (const status of ['bought', 'abandoned'] as const) {
      expect(buyerReadiness(buyer({ status, contactedAt: daysAgo(90) }), facts(), NOW)).toEqual({
        state: null,
        recontactOn: null,
        sinceDays: null,
      });
    }
  });

  it('une fiche neuve compte comme un échange ; une présentation ou une visite aussi', () => {
    const fresh = buyer({ createdAt: daysAgo(1), statusChangedAt: daysAgo(1), contactedAt: null });
    expect(buyerReadiness(fresh, facts(), NOW).state).toBe('ready');
    const old = buyer({ contactedAt: null });
    expect(buyerReadiness(old, facts(), NOW).state).toBe('recontact');
    expect(buyerReadiness(old, facts({ presentedAt: daysAgo(3) }), NOW).state).toBe('ready');
    expect(buyerReadiness(old, facts({ lastVisitAt: daysAgo(10) }), NOW).state).toBe('ready');
    expect(lastActivityAt(old, facts({ answeredAt: daysAgo(2) }))).toBe(daysAgo(2));
  });

  it('une lecture en échec ne fabrique ni prêt ni relance', () => {
    expect(buyerReadiness(buyer(), facts({ unread: true }), NOW).state).toBeNull();
  });
});

describe('« Reprendre contact » dans « À faire aujourd’hui »', () => {
  const recontact: SuiviTask = {
    kind: 'buyer_recontact',
    projectId: '',
    sellerName: '',
    dueOn: '2026-11-01',
    buyerId: 'b-1',
    buyerName: 'Famille Keller',
    sinceDays: 34,
  };

  it('due 30 jours après le dernier échange ; « la famille Keller » ; mène à sa fiche', () => {
    const list = buildSuiviTaskList([], NOW, [recontact]);
    expect(list.dues).toEqual([recontact]);
    const line = taskLine(
      recontact,
      { motiveLabel: null, lastContactDays: null, signedOn: null, propertyLabel: null },
      '2026-11-05',
    );
    expect(line.title).toBe('Reprendre contact avec la famille Keller');
    expect(line.detail).toMatch(/aucun échange depuis 34 jours/);
    expect(line.late).toBe('en retard de 4 jours');
    expect(line.href).toBe('/acquereurs/b-1');
  });

  it('à venir, elle ne fait pas partie de « À faire aujourd’hui »', () => {
    const list = buildSuiviTaskList([], NOW, [{ ...recontact, dueOn: '2026-11-20' }]);
    expect(list.dues).toEqual([]);
    expect(list.next?.kind).toBe('buyer_recontact');
  });
});

describe('la saisie rapide', () => {
  const quick = (fields: Record<string, unknown>) =>
    parseQuickBuyerInput({ name: 'Famille Test', cities: 'Vence', ...fields });

  it('deux ★ au plus, parmi le secteur, le budget et quatre équipements', () => {
    expect(quick({ must_have: ['cities', 'budget'] }).ok).toBe(true);
    const tooMany = quick({ must_have: ['cities', 'budget', 'pool'] });
    expect(tooMany).toMatchObject({ ok: false, errors: { must_have: QUICK_STARS_ERROR } });
    expect(quick({ must_have: ['rooms'] }).ok).toBe(false);
  });

  it('une ★ sur un équipement le met à « oui » ; le reste reste vide', () => {
    const parsed = quick({ must_have: ['pool'], budget_max: '750000', phone: '06 39 98 00 00' });
    expect(parsed.ok && parsed.input).toMatchObject({
      pool: true,
      outdoor: null,
      budgetMax: 750_000,
      roomsMin: null,
      phone: '06 39 98 00 00',
    });
  });

  it('le nom et une commune restent obligatoires', () => {
    expect(parseQuickBuyerInput({ name: '', cities: 'Vence' }).ok).toBe(false);
    expect(parseQuickBuyerInput({ name: 'Famille Test', cities: '' }).ok).toBe(false);
  });

  it('les villes de l’agence, la plus fréquente d’abord, sans doublon', () => {
    expect(
      suggestedCities(['Vence', 'Antibes', 'vence', 'Mougins', 'Antibes', ' Vence ', null]),
    ).toEqual(['Vence', 'Antibes', 'Mougins']);
  });

  it('les paliers de budget se lisent d’un coup d’œil', () => {
    expect(budgetStepLabel(750_000)).toBe('750 k€');
    expect(budgetStepLabel(1_500_000)).toBe('1,5 M€');
  });
});

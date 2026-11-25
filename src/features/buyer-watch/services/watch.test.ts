import { describe, expect, it } from 'vitest';

import type { CompetitorCandidate } from '@/features/competitor-search/types';
import { findsForBuyer } from '@/features/buyer-watch/services/watch-criteria';
import {
  filterWatchFinds,
  findAsCandidate,
  readWatchFinds,
  toWatchFind,
  watchKey,
  watchPropertyKey,
  watchReasonsOf,
  withSoftReasons,
} from '@/features/buyer-watch/services/watch-finds';
import {
  dueWatchBuyers,
  effectiveWatchCapCents,
  isWatchDue,
  parseWatchCapEuros,
  watchBudgetState,
  watchLine,
  watchSeenSince,
} from '@/features/buyer-watch/services/watch-schedule';
import { watchTasks } from '@/features/buyer-watch/services/watch-tasks';
import { taskLine } from '@/features/meeting-conclusion/services/suivi-step-labels';
import { buildSuiviTaskList } from '@/features/meeting-conclusion/services/suivi-tasks';

// Mission 136 — la veille des acquéreurs : qui est veillé, quand, ce qu'elle garde, ce qu'elle dit.
const NOW = new Date('2026-11-06T02:17:00Z');
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

describe('qui est veillé, et quand', () => {
  const candidate = (over: Record<string, unknown> = {}) => ({
    buyerId: 'b1',
    ready: true,
    lastActivityAt: daysAgo(3),
    lastRunAt: null as string | null,
    ...over,
  });

  it('seul un acquéreur prêt à visiter ; jamais cherché, il est dû', () => {
    expect(isWatchDue(candidate(), NOW)).toBe(true);
    expect(isWatchDue(candidate({ ready: false }), NOW)).toBe(false);
  });

  it('une recherche par semaine : à 6 jours rien, à 7 jours de Paris il repart', () => {
    expect(isWatchDue(candidate({ lastRunAt: daysAgo(6) }), NOW)).toBe(false);
    expect(isWatchDue(candidate({ lastRunAt: daysAgo(7) }), NOW)).toBe(true);
    // Le passage de la semaine dernière, un peu plus tard dans la nuit : toujours dû.
    expect(
      isWatchDue(candidate({ lastRunAt: new Date('2026-10-30T02:40:00Z').toISOString() }), NOW),
    ).toBe(true);
  });

  it('les plus récemment actifs d’abord', () => {
    const due = dueWatchBuyers(
      [
        candidate({ buyerId: 'ancien', lastActivityAt: daysAgo(20) }),
        candidate({ buyerId: 'pas-prêt', ready: false, lastActivityAt: daysAgo(1) }),
        candidate({ buyerId: 'récent', lastActivityAt: daysAgo(2) }),
      ],
      NOW,
    );
    expect(due.map((entry) => entry.buyerId)).toEqual(['récent', 'ancien']);
  });

  it('les biens gardés : depuis le passage précédent, sinon depuis 7 jours', () => {
    expect(watchSeenSince(daysAgo(7), NOW)).toBe(daysAgo(7));
    expect(watchSeenSince(null, NOW)).toBe(daysAgo(7));
  });

  it('la ligne de la fiche', () => {
    expect(watchLine({ ready: false, lastRunAt: daysAgo(2), now: NOW })).toBe(
      'Veille arrêtée : pas prêt à visiter',
    );
    expect(watchLine({ ready: true, lastRunAt: daysAgo(2), now: NOW })).toBe(
      'Veille : dernière recherche le 04/11, prochaine le 11/11',
    );
    expect(watchLine({ ready: true, lastRunAt: null, now: NOW })).toBe(
      'Veille : première recherche la nuit prochaine',
    );
  });
});

describe('le plafond de la veille', () => {
  it('jamais plus de la moitié du budget de l’agence', () => {
    expect(effectiveWatchCapCents(1000, 3000)).toBe(1000);
    expect(effectiveWatchCapCents(3000, 3000)).toBe(1500);
    expect(effectiveWatchCapCents(1000, 0)).toBe(0);
  });

  it('coupée à 0 €, en pause au plafond de la veille ou de l’agence, active sinon', () => {
    const base = {
      watchCapCents: 1000,
      agencyCapCents: 3000,
      watchSpentCents: 0,
      agencySpentCents: 0,
    };
    expect(watchBudgetState({ ...base, watchCapCents: 0 })).toBe('off');
    expect(watchBudgetState({ ...base, watchSpentCents: 1000, agencySpentCents: 1000 })).toBe(
      'paused',
    );
    // Les conseillers ont tout dépensé : la veille ne part plus.
    expect(watchBudgetState({ ...base, agencySpentCents: 3000 })).toBe('paused');
    expect(watchBudgetState({ ...base, watchSpentCents: 200, agencySpentCents: 900 })).toBe(
      'active',
    );
  });

  it('le manager règle en euros entiers, de 0 à la moitié du budget de l’agence', () => {
    expect(parseWatchCapEuros('10', 3000)).toEqual({ ok: true, cents: 1000 });
    expect(parseWatchCapEuros('0', 3000)).toEqual({ ok: true, cents: 0 });
    expect(parseWatchCapEuros('15', 3000)).toEqual({ ok: true, cents: 1500 });
    const over = parseWatchCapEuros('16', 3000);
    expect(over.ok).toBe(false);
    expect(over.ok ? '' : over.error).toMatch(/moitié/);
    expect(parseWatchCapEuros('-1', 3000).ok).toBe(false);
    expect(parseWatchCapEuros('dix', 3000).ok).toBe(false);
  });
});

const candidate = (id: string, over: Partial<CompetitorCandidate> = {}): CompetitorCandidate => ({
  key: id,
  url: `https://www.seloger.com/annonces/achat/maison/mougins-06/${id}.htm`,
  title: 'EXCLUSIVITÉ Agence Dupont 12 rue des Lilas',
  price: 1_600_000,
  surfaceArea: 210,
  roomsCount: 7,
  propertyType: 'house',
  pricePerSqm: 7619,
  landArea: 2000,
  city: 'Mougins',
  photoUrls: ['https://photos.example.com/a.jpg', 'http://photos.example.com/b.jpg'],
  isNewBuild: false,
  energyClass: 'C',
  streamEstate: {
    propertyId: `se-${id}`,
    originSite: 'SeLoger',
    onlineSince: daysAgo(2),
    firstKnownAt: daysAgo(2),
    lastSeenAt: daysAgo(0),
    priceDrops: [],
  },
  ...over,
});

describe('ce que la veille garde', () => {
  it('les biens vus depuis le passage précédent, jamais avant, jamais sans date', () => {
    const outcome = filterWatchFinds(
      [
        candidate('100000001'),
        candidate('100000002', {
          streamEstate: { ...candidate('x').streamEstate!, firstKnownAt: daysAgo(30) },
        }),
        candidate('100000003', {
          streamEstate: { ...candidate('x').streamEstate!, firstKnownAt: null, onlineSince: null },
        }),
      ],
      { seenSince: daysAgo(7), knownKeys: [] },
    );
    expect(outcome.finds.map((find) => find.key)).toEqual(['100000001']);
    expect(outcome.excludedBefore).toBe(1);
    expect(outcome.excludedNoDate).toBe(1);
  });

  it('la plus ancienne date connue décide (M129) : un bien recréé n’est pas nouveau', () => {
    const recreated = candidate('100000004', {
      streamEstate: {
        ...candidate('x').streamEstate!,
        onlineSince: daysAgo(1),
        firstKnownAt: daysAgo(200),
      },
    });
    expect(filterWatchFinds([recreated], { seenSince: daysAgo(7), knownKeys: [] }).finds).toEqual(
      [],
    );
  });

  it('ni ses sélections, refus compris, ni ses propositions, ni ce que l’agence connaît', () => {
    const known = candidate('100000005');
    const outcome = filterWatchFinds([known, candidate('100000006')], {
      seenSince: daysAgo(7),
      knownKeys: [watchKey(known.url)],
    });
    expect(outcome.finds.map((find) => find.key)).toEqual(['100000006']);
    expect(outcome.excludedKnown).toBe(1);
  });

  // Lancement, mission 3 (suite, 25/11) — le même bien rendu sous une autre annonce : reconnu par
  // son identifiant chez le fournisseur, gardé avec la sélection.
  it('ni un bien de ses sélections revenu sous une autre annonce', () => {
    const again = candidate('100000008');
    const outcome = filterWatchFinds([again, candidate('100000009')], {
      seenSince: daysAgo(7),
      knownKeys: [watchPropertyKey(again.key!)],
    });
    expect(outcome.finds.map((find) => find.key)).toEqual(['100000009']);
    expect(outcome.excludedKnown).toBe(1);
  });

  it('par liste d’autorisation : jamais le titre, seules les photos https', () => {
    const find = toWatchFind(candidate('100000007'))!;
    expect(JSON.stringify(find)).not.toMatch(/Dupont|Lilas|EXCLUSIVIT/);
    expect(find.photoUrls).toEqual(['https://photos.example.com/a.jpg']);
    // Relu à la lecture : une entrée hors liste est ignorée.
    expect(readWatchFinds([find, { url: 'http://x' }, 'n’importe quoi'])).toHaveLength(1);
    expect(readWatchFinds({})).toEqual([]);
    expect(findAsCandidate(find).title).toBeNull();
  });

  // Mission 151 (partie B) — la veille garde le jugement et ses citations, jamais le texte.
  it('garde le jugement de ce qui compte pour lui, jamais le texte de l’annonce', () => {
    const find = toWatchFind({
      ...candidate('100000008'),
      streamEstate: {
        ...candidate('100000008').streamEstate!,
        description: 'Au calme absolu, aucun passage. Texte complet de l’annonce.',
      },
    })!;
    expect(JSON.stringify(find)).not.toContain('Texte complet');
    const judged = withSoftReasons([find], {
      [find.url]: {
        judgments: [
          {
            key: 'calme',
            verdict: 'clearly',
            quote: 'Au calme absolu',
            counterQuote: null,
            toVerify: false,
          },
        ],
      },
    });
    const reread = readWatchFinds(JSON.parse(JSON.stringify(judged)));
    expect(watchReasonsOf(reread)).toEqual({ [find.url]: judged[0]!.soft });
    // Une forme hors liste n'est pas gardée.
    expect(
      withSoftReasons([find], { [find.url]: { judgments: [{ key: 'inconnu' }] } } as never)[0],
    ).not.toHaveProperty('soft');
  });
});

describe('ce qu’elle fait naître dans « À faire aujourd’hui »', () => {
  const find = (id: string) => toWatchFind(candidate(id))!;
  const names = new Map([
    ['keller', 'Famille Keller'],
    ['lambert', 'M. et Mme Lambert'],
  ]);

  it('une tâche par acquéreur : « 2 nouveaux biens pour la famille Keller »', () => {
    const tasks = watchTasks(
      [{ buyerId: 'keller', ranAt: daysAgo(0), finds: [find('100000010'), find('100000011')] }],
      names,
    );
    expect(tasks).toHaveLength(1);
    const line = taskLine(
      tasks[0]!,
      { motiveLabel: null, lastContactDays: null, signedOn: null, propertyLabel: null },
      '2026-11-06',
    );
    expect(line.title).toBe('2 nouveaux biens pour la famille Keller');
    expect(line.href).toBe('/acquereurs/keller/biens-ideaux#nouveau');
    expect(line.late).toBeNull();
    expect(line.title + line.detail).not.toMatch(/disponible|estimation/i);
  });

  it('un bien trouvé pour deux acquéreurs : une seule tâche « 2 acquéreurs pour … »', () => {
    const shared = find('100000012');
    const tasks = watchTasks(
      [
        { buyerId: 'keller', ranAt: daysAgo(0), finds: [shared, find('100000013')] },
        { buyerId: 'lambert', ranAt: daysAgo(0), finds: [shared] },
      ],
      names,
    );
    const sharedTask = tasks.find((task) => !task.buyerId)!;
    expect(sharedTask.watchBuyers?.map((buyer) => buyer.id)).toEqual(['keller', 'lambert']);
    const line = taskLine(
      sharedTask,
      { motiveLabel: null, lastContactDays: null, signedOn: null, propertyLabel: null },
      '2026-11-06',
    );
    expect(line.title.replace(/\s/g, ' ')).toBe(
      '2 acquéreurs pour la maison de Mougins (210 m², 1 600 000 €)',
    );
    // Les Keller gardent leur autre bien ; les Lambert n'ont plus de tâche à eux.
    expect(tasks.filter((task) => task.buyerId).map((task) => [task.buyerId, task.count])).toEqual([
      ['keller', 1],
    ]);
  });

  it('rangée après « Proposer » et avant les relances ; jamais en retard', () => {
    const tasks = watchTasks(
      [{ buyerId: 'keller', ranAt: daysAgo(3), finds: [find('100000014')] }],
      names,
    );
    const list = buildSuiviTaskList([], NOW, [
      ...tasks,
      {
        kind: 'buyer_relaunch',
        projectId: '',
        sellerName: '',
        dueOn: '2026-11-01',
        buyerId: 'lambert',
        buyerName: 'M. et Mme Lambert',
        count: 1,
        sentOn: '2026-10-30',
      },
    ]);
    expect(list.dues.map((task) => task.kind)).toEqual(['buyer_watch', 'buyer_relaunch']);
  });
});

describe('un bien qui contredit un indispensable ne compte pas', () => {
  const buyer = (over: Record<string, unknown> = {}) =>
    ({
      id: 'keller',
      name: 'Famille Keller',
      propertyTypes: ['house'],
      cities: ['Mougins'],
      budgetIdeal: null,
      budgetMax: 1_500_000,
      roomsMin: null,
      bedroomsMin: null,
      surfaceMin: null,
      outdoor: null,
      parking: null,
      pool: null,
      floorMin: null,
      elevator: null,
      energyRatingMax: null,
      worksAccepted: null,
      mustHave: ['budget'],
      dealBreakers: null,
      ...over,
    }) as never;

  it('le budget ★ dépassé (la requête cherche jusqu’à +5 %) : écarté, comme sur la page', () => {
    const within = toWatchFind(candidate('100000020', { price: 1_480_000 }))!;
    const over = toWatchFind(candidate('100000021', { price: 1_560_000 }))!;
    expect(findsForBuyer(buyer(), [within, over]).map((find) => find.key)).toEqual(['100000020']);
    // En préférence, le même bien reste (« à négocier »).
    expect(findsForBuyer(buyer({ mustHave: [] }), [within, over])).toHaveLength(2);
  });
});

describe('la veille coupée par l’agence', () => {
  it('la fiche le dit, prête ou non', () => {
    expect(watchLine({ ready: true, lastRunAt: null, now: NOW, off: true })).toBe(
      'Veille arrêtée : coupée par l’agence',
    );
  });
});

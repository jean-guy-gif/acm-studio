import { describe, expect, it } from 'vitest';

import {
  alreadyContacted,
  budgetGapLabel,
  isNewProperty,
  loopBuyers,
  mergeLoopProperties,
  proposalMessage,
  propertyPhrase,
  readyToPropose,
  type LoopContacts,
  type LoopProperty,
} from '@/features/buyers/services/loop-properties';
import type { Buyer } from '@/features/buyers/types';
import {
  buildSuiviTaskList,
  type SuiviTask,
} from '@/features/meeting-conclusion/services/suivi-tasks';
import { taskLine } from '@/features/meeting-conclusion/services/suivi-step-labels';

// Mission 134 — « Personne n'est oublié » : chaque nouveau bien appelle ses acquéreurs, une tâche
// par bien, jamais recréée pour un acquéreur déjà contacté.
const NOW = new Date('2026-11-06T10:00:00Z');
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

const item = (over: Partial<LoopProperty> = {}): LoopProperty => ({
  key: 'listing:seloger:123',
  source: 'competitor',
  reference: 'c1',
  projectId: 'p1',
  sellerName: 'M. et Mme Bernard',
  origin: 'competitor',
  label: 'Maison · 5 pièces · 140 m² · Vence',
  property: {
    propertyType: 'house',
    roomsCount: 5,
    surfaceArea: 140,
    city: 'Vence',
    bedroomsCount: 4,
    floor: null,
    hasElevator: null,
    hasPool: true,
    outdoorSpaces: ['garden'],
    parkingTypes: [],
    energyRating: null,
    generalCondition: null,
  },
  price: 779_000,
  bornAt: daysAgo(1),
  selectionRefs: ['competitor:c1', 'listing:https://x/annonce/123'],
  originBuyerIds: [],
  ...over,
});

let seq = 0;
function buyer(over: Partial<Buyer> = {}): Buyer {
  seq += 1;
  return {
    language: 'fr',
    id: `b-${seq}`,
    agencyId: 'a',
    advisorId: 'adv',
    createdAt: daysAgo(21),
    updatedAt: daysAgo(2),
    archivedAt: null,
    status: 'searching',
    statusChangedAt: daysAgo(21),
    demo: false,
    ignoredSuggestions: [],
    financing: 'validated',
    financingChangedAt: daysAgo(10),
    contactedAt: daysAgo(3),
    condominiumAccepted: null,
    condominiumMustHave: false,
    softCriteria: [],
    fieldsToVerify: [],
    name: `M. et Mme Test ${seq}`,
    phone: '06 39 98 00 00',
    email: 'test@example.com',
    purpose: null,
    timeline: null,
    notes: null,
    propertyTypes: ['house'],
    cities: ['Vence'],
    budgetIdeal: null,
    budgetMax: 790_000,
    roomsMin: 4,
    bedroomsMin: null,
    surfaceMin: 110,
    outdoor: null,
    parking: null,
    pool: true,
    floorMin: null,
    elevator: null,
    energyRatingMax: null,
    worksAccepted: null,
    mustHave: ['cities', 'pool'],
    dealBreakers: null,
    ...over,
  };
}

const NONE: LoopContacts = { proposals: new Map() };

describe('un nouveau bien', () => {
  it('un bien du marché, dans ses 14 premiers jours ; un bien de l’agence, tant qu’il a un prix', () => {
    expect(isNewProperty(item({ bornAt: daysAgo(13) }), NOW)).toBe(true);
    expect(isNewProperty(item({ bornAt: daysAgo(14) }), NOW)).toBe(false);
    for (const origin of ['newcomer', 'prospect'] as const) {
      expect(isNewProperty(item({ origin, bornAt: daysAgo(30) }), NOW)).toBe(false);
    }
    expect(isNewProperty(item({ origin: 'mandate', bornAt: daysAgo(90) }), NOW)).toBe(true);
    expect(isNewProperty(item({ origin: 'follow_up', bornAt: daysAgo(90) }), NOW)).toBe(true);
    // Un vendeur à relancer sans prix ne se propose pas.
    expect(isNewProperty(item({ origin: 'follow_up', price: null }), NOW)).toBe(false);
  });

  it('un bien retenu sur deux dossiers est un seul bien ; le dossier de l’agence l’emporte', () => {
    const merged = mergeLoopProperties([
      item({ reference: 'c1', selectionRefs: ['competitor:c1'] }),
      item({ reference: 'c2', projectId: 'p2', selectionRefs: ['competitor:c2'] }),
      item({ key: 'project:p9', source: 'project', origin: 'mandate', reference: 'p9' }),
    ]);
    expect(merged).toHaveLength(2);
    const bien = merged.find((entry) => entry.key === 'listing:seloger:123')!;
    expect(bien.selectionRefs.sort()).toEqual(['competitor:c1', 'competitor:c2']);
  });
});

describe('les acquéreurs d’un bien', () => {
  it('un acquéreur déjà contacté n’y figure plus : envoyé, ou à l’origine ; une sélection seule ne compte pas', () => {
    const first = buyer();
    const second = buyer();
    const third = buyer();
    const fourth = buyer();
    const contacts: LoopContacts = {
      proposals: new Map([[item().key, new Map([[first.id, daysAgo(0)]])]]),
    };
    const bien = item({ originBuyerIds: [third.id] });
    expect(alreadyContacted(bien, first.id, contacts)).toBe(true);
    // Préparer un lien (« Copier » puis « Passer ») ne note rien : il reste à proposer.
    expect(alreadyContacted(bien, second.id, contacts)).toBe(false);
    expect(alreadyContacted(bien, third.id, contacts)).toBe(true);
    const loop = loopBuyers(bien, [first, second, third, fourth], new Map(), contacts, NOW);
    expect(loop.toPropose.map((entry) => entry.buyer.id)).toEqual([second.id, fourth.id]);
    expect(loop.proposed.find((entry) => entry.entry.buyer.id === first.id)?.sentAt).toBe(
      daysAgo(0),
    );
    expect(readyToPropose(loop)).toBe(2);
  });

  // Mission 139 — un bien écarté pour un acquéreur ne lui correspond plus : ni à proposer, ni
  // compté, ni « déjà proposé ».
  it('un bien écarté pour un acquéreur ne lui est plus proposé, ni compté', () => {
    const kept = buyer();
    const dismissed = buyer();
    const contacts: LoopContacts = {
      proposals: new Map(),
      dismissals: new Map([[item().key, new Set([dismissed.id])]]),
    };
    const loop = loopBuyers(item(), [kept, dismissed], new Map(), contacts, NOW);
    expect(loop.toPropose.map((entry) => entry.buyer.id)).toEqual([kept.id]);
    expect(loop.proposed).toEqual([]);
    expect(readyToPropose(loop)).toBe(1);
    // Écarté pour un autre bien : il reste.
    const other = loopBuyers(
      item({ key: 'listing:seloger:999' }),
      [kept, dismissed],
      new Map(),
      contacts,
      NOW,
    );
    expect(other.toPropose).toHaveLength(2);
  });

  it('la tâche compte les PRÊTS à qui le bien n’a pas été proposé', () => {
    const loop = loopBuyers(
      item(),
      [buyer(), buyer(), buyer({ financing: 'in_progress' })],
      new Map(),
      NONE,
      NOW,
    );
    expect(loop.toPropose).toHaveLength(3);
    expect(readyToPropose(loop)).toBe(2);
  });
});

describe('ce que la tâche et le message disent', () => {
  it('« 4 acquéreurs pour la maison de Vence (140 m², 779 000 €) », une tâche par bien', () => {
    const task: SuiviTask = {
      kind: 'propose_buyers',
      projectId: 'p1',
      sellerName: '',
      dueOn: '2026-11-05',
      count: 4,
      propertyKey: 'listing:seloger:123',
      origin: 'competitor',
      property: { propertyType: 'house', city: 'Vence' },
      figures: { surfaceArea: 140, price: 779_000 },
    };
    const list = buildSuiviTaskList([], NOW, [task]);
    expect(list.dues).toHaveLength(1);
    const line = taskLine(
      list.dues[0]!,
      { motiveLabel: null, lastContactDays: null, signedOn: null, propertyLabel: null },
      '2026-11-06',
    );
    expect(line.title).toMatch(/^4 acquéreurs pour la maison de Vence \(140\sm², 779\s000\s€\)$/);
    expect(line.detail).toMatch(/bien du marché : à vérifier avant d’envoyer/);
    expect(line.late).toBeNull();
    expect(line.href).toBe('/acquereurs/proposer?bien=listing%3Aseloger%3A123');
  });

  it('l’origine se dit : vendeur à relancer, nouveau venu', () => {
    const base = { projectId: '', sellerName: '', dueOn: '2026-11-06', count: 1 } as const;
    const line = (origin: SuiviTask['origin']) =>
      taskLine(
        { ...base, kind: 'propose_buyers', origin },
        { motiveLabel: null, lastContactDays: null, signedOn: null, propertyLabel: null },
        '2026-11-06',
      ).detail;
    expect(line('follow_up')).toMatch(/vendeur à relancer : à proposer après son accord/);
    expect(line('newcomer')).toMatch(/nouveau sur le marché depuis le rendez-vous/);
  });

  it('« la maison de Vence », « l’appartement d’Antibes »', () => {
    expect(propertyPhrase({ propertyType: 'house', city: 'Vence' })).toBe('la maison de Vence');
    expect(propertyPhrase({ propertyType: 'Appartement', city: 'Antibes' })).toBe(
      'l’appartement d’Antibes',
    );
  });

  it('le message : son nom, ce que le bien a de ce qu’il cherche, la marge, le lien', () => {
    const text = proposalMessage({
      buyer: buyer({ name: 'M. et Mme Lambert', outdoor: true }),
      item: item(),
      url: 'https://acm/dossier/abc',
      advisorFirstName: 'Carl',
    });
    expect(text).toMatch(/^Bonjour M\. et Mme Lambert,/);
    expect(text).toMatch(/maison à Vence avec la piscine que vous vouliez, un extérieur/);
    expect(text).toMatch(/11\s000\s€ sous votre budget/);
    expect(text).toContain('https://acm/dossier/abc');
    expect(text.trim().endsWith('Carl')).toBe(true);
  });

  it('un bien de type inconnu ne se dit pas « bien à Vence »', () => {
    const text = proposalMessage({
      buyer: buyer({ pool: null }),
      item: item({ property: { ...item().property, propertyType: null } }),
      url: 'u',
      advisorFirstName: null,
    });
    expect(text).toMatch(/J’ai un bien pour vous : à Vence/);
    expect(text).not.toMatch(/bien à Vence/);
  });

  it('un vendeur à relancer : ni prix, ni marge dans le message (M119)', () => {
    const text = proposalMessage({
      buyer: buyer(),
      item: item({ origin: 'follow_up' }),
      url: 'https://acm/dossier/abc',
      advisorFirstName: null,
    });
    expect(text).not.toMatch(/budget|€/);
  });

  it('l’écart au budget, pour le conseiller', () => {
    expect(budgetGapLabel(779_000, 790_000)).toMatch(/^11\s000\s€ sous le budget$/);
    expect(budgetGapLabel(800_000, 790_000)).toMatch(/au-dessus du budget, à négocier$/);
    expect(budgetGapLabel(null, 790_000)).toBeNull();
  });
});

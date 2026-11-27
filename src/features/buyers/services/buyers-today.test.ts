import { describe, expect, it } from 'vitest';

import {
  BUYER_TASK_KINDS,
  buyersToday,
  buyerOthersNote,
  buyersTodayCount,
  buyersTodayDetail,
  buyersTodayTaskCount,
  buyersTodayThings,
  buyerTaskKey,
  buyerTaskTone,
  buyerTaskWhat,
  buyerTodayHref,
  tasksByBuyer,
  watchDeckHref,
  watchDetailHref,
} from '@/features/buyers/services/buyers-today';
import type { SuiviTask } from '@/features/meeting-conclusion/services/suivi-tasks';

const TODAY = '2026-11-26';

const task = (partial: Partial<SuiviTask> & Pick<SuiviTask, 'kind'>): SuiviTask => ({
  projectId: '',
  sellerName: '',
  dueOn: TODAY,
  ...partial,
});

const watch = task({
  kind: 'buyer_watch',
  buyerId: 'mercier',
  buyerName: 'M. et Mme Mercier',
  count: 4,
});
const visit = task({
  kind: 'visit',
  projectId: 'p-mougins',
  sellerName: 'M. Lefebvre',
  count: 3,
  buyerName: 'Mme Rossi',
  property: { propertyType: 'Maison', city: 'Mougins' },
  visitBuyers: [
    { id: 'rossi', name: 'Mme Rossi' },
    { id: 'keller', name: 'Famille Keller' },
    { id: 'rossi', name: 'Mme Rossi' },
  ],
});
const recontact = task({
  kind: 'buyer_recontact',
  buyerId: 'fontaine',
  buyerName: 'M. Fontaine',
  dueOn: '2026-11-23',
  sinceDays: 33,
});

// La refonte, lot B — « à faire aujourd'hui », une carte par personne (maquettes REFONTE-1, 5, 6).
describe('une tâche par acquéreur', () => {
  it('une tâche qui tient à un acquéreur reste telle quelle', () => {
    expect(tasksByBuyer(watch)).toEqual([watch]);
  });

  it('les visites à organiser d’un mandat : une tâche par acquéreur, avec son nombre', () => {
    const own = tasksByBuyer(visit);
    expect(own.map((t) => [t.buyerId, t.buyerName, t.count])).toEqual([
      ['rossi', 'Mme Rossi', 2],
      ['keller', 'Famille Keller', 1],
    ]);
    // Le mandat reste dit : le geste est celui d'« Aujourd'hui ».
    for (const t of own) {
      expect(t.kind).toBe('visit');
      expect(t.projectId).toBe('p-mougins');
      expect(t.visitBuyers).toBeUndefined();
    }
  });

  it('un bien à proposer, un bien de la veille pour plusieurs : une tâche par acquéreur', () => {
    const propose = task({
      kind: 'propose_buyers',
      propertyKey: 'project:p-vence',
      count: 2,
      proposeBuyers: [
        { id: 'moreau', name: 'Famille Moreau' },
        { id: 'roux', name: 'M. et Mme Roux' },
      ],
    });
    expect(tasksByBuyer(propose).map((t) => [t.buyerId, t.propertyKey, t.count])).toEqual([
      ['moreau', 'project:p-vence', 1],
      ['roux', 'project:p-vence', 1],
    ]);
    const shared = task({
      kind: 'buyer_watch',
      count: 2,
      watchBuyers: [
        { id: 'keller', name: 'Famille Keller' },
        { id: 'lambert', name: 'M. et Mme Lambert' },
      ],
    });
    expect(tasksByBuyer(shared).map((t) => [t.buyerId, t.count, t.watchBuyers])).toEqual([
      ['keller', 1, undefined],
      ['lambert', 1, undefined],
    ]);
  });

  it('sans acquéreur connu, aucune carte : rien n’est deviné', () => {
    expect(tasksByBuyer(task({ kind: 'visit', count: 1, buyerName: 'Mme Rossi' }))).toEqual([]);
    expect(tasksByBuyer(task({ kind: 'propose_buyers', count: 3 }))).toEqual([]);
  });
});

describe('ce qu’il y a à faire, sans redire son nom', () => {
  const cases: [SuiviTask, string][] = [
    [watch, '4 nouveaux biens trouvés par la veille'],
    [task({ ...watch, count: 1 }), '1 nouveau bien trouvé par la veille'],
    [tasksByBuyer(visit)[1]!, 'Visite demandée : la maison de Mougins'],
    [tasksByBuyer(visit)[0]!, '2 visites demandées : la maison de Mougins'],
    [
      task({ kind: 'visit', buyerId: 'x', sellerName: 'M. Lefebvre', count: 1 }),
      'Visite demandée : le bien de M. Lefebvre',
    ],
    // Relecture du lot B — un bien sans type ni commune : « le bien », seul, ne dit pas lequel.
    [
      task({
        kind: 'visit',
        buyerId: 'x',
        sellerName: 'M. Lefebvre',
        property: { propertyType: null, city: null },
      }),
      'Visite demandée : le bien de M. Lefebvre',
    ],
    [
      task({ kind: 'visit', buyerId: 'x', property: { propertyType: null, city: ' ' } }),
      'Visite demandée : un bien de l’agence',
    ],
    // La commune seule, ou le type seul, suffit à le dire.
    [
      task({
        kind: 'visit',
        buyerId: 'x',
        sellerName: 'M. Lefebvre',
        property: { propertyType: null, city: 'Mougins' },
      }),
      'Visite demandée : le bien de Mougins',
    ],
    [
      task({
        kind: 'propose_buyers',
        buyerId: 'x',
        sellerName: 'Mme Navarro',
        property: { propertyType: 'Autre', city: null },
        figures: { surfaceArea: 118, price: 705_000 },
      }),
      'Un bien à proposer : le bien de Mme Navarro (118 m², 705 000 €)',
    ],
    [recontact, 'Aucun échange depuis 33 jours'],
    [
      task({
        kind: 'buyer_relaunch',
        buyerId: 'x',
        sentOn: '2026-11-22',
        count: 2,
        linkExpired: true,
      }),
      'Sélection envoyée le 22/11, pas de réponse · 2e relance · lien expiré',
    ],
    [
      task({
        kind: 'propose_buyers',
        buyerId: 'x',
        property: { propertyType: 'Maison', city: 'Vence' },
        figures: { surfaceArea: 135, price: 713_000 },
      }),
      'Un bien à proposer : la maison de Vence (135 m², 713 000 €)',
    ],
    [
      task({ kind: 'offer_answer', buyerId: 'x', decision: 'accepted', dueOn: '2026-11-25' }),
      'Offre acceptée par le vendeur le 25/11',
    ],
    [
      task({ kind: 'offer_answer', buyerId: 'x', decision: 'refused', dueOn: '2026-11-25' }),
      'Offre refusée par le vendeur le 25/11',
    ],
    [
      task({ kind: 'offer_expiry', buyerId: 'x', validUntil: '2026-11-27' }),
      'L’offre expire demain : le vendeur n’a pas répondu',
    ],
    [
      task({ kind: 'visit_report', buyerId: 'x', propertyLabel: 'Maison · 135 m² · Vence' }),
      'Compte rendu de visite à saisir · Maison · 135 m² · Vence',
    ],
    [
      task({ kind: 'buyer_meeting', buyerId: 'x' }),
      'Prêt à visiter : un point à proposer, à l’agence ou en visio',
    ],
    [
      task({ kind: 'buyer_weekly_report', buyerId: 'x', weekStart: '2026-11-16' }),
      'Point de la semaine du 16/11 au 22/11 à envoyer',
    ],
  ];

  it.each(cases)('%#', (input, expected) => {
    // Les espaces insécables du formateur (« 135 m² », « 713 000 € ») se lisent comme des espaces.
    expect(buyerTaskWhat(input, TODAY).replace(/[  ]/g, ' ')).toBe(expected);
  });

  it('chaque sorte de tâche d’un acquéreur a sa phrase, jamais son nom', () => {
    for (const kind of BUYER_TASK_KINDS) {
      const what = buyerTaskWhat(
        task({ kind, buyerId: 'x', buyerName: 'M. et Mme Mercier' }),
        TODAY,
      );
      expect(what, kind).not.toBe('');
      expect(what, kind).not.toContain('Mercier');
      // Ni « eux », ni « lui », ni « elle » : le nom de la fiche ne dit ni genre ni nombre.
      expect(what, kind).not.toMatch(/\b(eux|lui|elle|leur|son|sa|ses)\b/i);
    }
  });
});

describe('la teinte suit la tâche', () => {
  it('orange : à regarder avant d’agir ; verte : une bonne nouvelle ; sinon la couleur de l’agence', () => {
    expect(buyerTaskTone(task({ kind: 'offer_answer', decision: 'accepted' }), 0)).toBe('good');
    expect(buyerTaskTone(task({ kind: 'offer_answer', decision: 'refused' }), 0)).toBe('watch');
    expect(buyerTaskTone(task({ kind: 'offer_expiry' }), 0)).toBe('watch');
    expect(buyerTaskTone(recontact, 3)).toBe('watch');
    expect(buyerTaskTone(task({ kind: 'visit' }), 0)).toBe('good');
    expect(buyerTaskTone(watch, 0)).toBe('plain');
    expect(buyerTaskTone(task({ kind: 'buyer_relaunch' }), 0)).toBe('plain');
    // Un retard se regarde, quelle que soit la tâche.
    expect(buyerTaskTone(task({ kind: 'buyer_relaunch' }), 2)).toBe('watch');
    expect(buyerTaskTone(task({ kind: 'visit_report' }), 1)).toBe('watch');
  });
});

describe('une carte par personne', () => {
  it('la tâche la plus utile de chacun fait sa carte ; ses autres tâches suivent', () => {
    const relaunch = task({
      kind: 'buyer_relaunch',
      buyerId: 'mercier',
      buyerName: 'M. et Mme Mercier',
      sentOn: '2026-11-22',
      dueOn: '2026-11-24',
    });
    const seller = task({ kind: 'follow_up', projectId: 'p-antibes', sellerName: 'M. Martin' });
    const items = buyersToday([recontact, relaunch, seller, visit, watch], TODAY);
    // L'ordre d'« Aujourd'hui » : la visite, puis la veille, puis « Reprendre contact ».
    expect(items.map((item) => item.name)).toEqual([
      'Mme Rossi',
      'Famille Keller',
      'M. et Mme Mercier',
      'M. Fontaine',
    ]);
    const mercier = items.find((item) => item.buyerId === 'mercier')!;
    expect(mercier.task.kind).toBe('buyer_watch');
    expect(mercier.what).toBe('4 nouveaux biens trouvés par la veille');
    expect(mercier.tone).toBe('plain');
    expect(mercier.others.map((other) => [other.task.kind, other.late])).toEqual([
      ['buyer_relaunch', 'en retard de 2 jours'],
    ]);
    const fontaine = items.find((item) => item.buyerId === 'fontaine')!;
    expect(fontaine.late).toBe('en retard de 3 jours');
    expect(fontaine.tone).toBe('watch');
    expect(items.find((item) => item.buyerId === 'rossi')!.tone).toBe('good');
    // Une tâche de vendeur n'y entre jamais.
    expect(items.flatMap((item) => [item.task, ...item.others.map((o) => o.task)])).not.toContain(
      seller,
    );
  });

  // Relecture du lot B — la clé d'une ligne à l'écran : jamais le rang de la tâche.
  it('deux tâches d’une même personne ne partagent pas leur clé', () => {
    const relaunch = task({ kind: 'buyer_relaunch', buyerId: 'mercier', dueOn: '2026-11-24' });
    const propose = (key: string) =>
      task({ kind: 'propose_buyers', buyerId: 'mercier', propertyKey: key, projectId: key });
    const keys = [
      watch,
      relaunch,
      propose('project:p-vence'),
      propose('project:p-mougins'),
      task({ kind: 'visit', buyerId: 'mercier', projectId: 'p-vence' }),
      task({ kind: 'visit', buyerId: 'mercier', projectId: 'p-mougins' }),
      task({ kind: 'offer_answer', buyerId: 'mercier', offerId: 'o1' }),
      task({ kind: 'offer_answer', buyerId: 'mercier', offerId: 'o2' }),
    ].map(buyerTaskKey);
    expect(new Set(keys).size).toBe(keys.length);
    // La même tâche, relue : la même clé.
    expect(buyerTaskKey({ ...relaunch })).toBe(buyerTaskKey(relaunch));
  });

  it('personne ne paraît deux fois', () => {
    const items = buyersToday([watch, { ...watch, count: 1 }, recontact, recontact], TODAY);
    expect(items.map((item) => item.buyerId)).toEqual(['mercier', 'fontaine']);
    expect(items[0]!.others).toHaveLength(1);
  });

  it('« 3 choses à faire aujourd’hui » : toutes les tâches, pas seulement la première de chacun', () => {
    expect(buyersTodayCount(0)).toBe('Rien à faire aujourd’hui');
    expect(buyersTodayCount(1)).toBe('1 chose à faire aujourd’hui');
    expect(buyersTodayCount(3)).toBe('3 choses à faire aujourd’hui');
    const relaunch = task({ kind: 'buyer_relaunch', buyerId: 'mercier', dueOn: '2026-11-24' });
    const items = buyersToday([watch, relaunch, recontact], TODAY);
    expect(items).toHaveLength(2);
    expect(buyersTodayThings(items)).toBe(3);
    expect(buyersTodayThings([])).toBe(0);
  });

  // La refonte, lot F (Jean-Guy, 26/11) — un même chiffre partout : « N choses à faire » est la
  // part d'Acquéreurs des tâches d'« Aujourd'hui », comptée comme elle.
  it('une tâche qui concerne deux acquéreurs a deux cartes, mais compte une fois', () => {
    const shared = task({
      kind: 'buyer_watch',
      watchBuyers: [
        { id: 'keller', name: 'Famille Keller' },
        { id: 'rossi', name: 'M. et Mme Rossi' },
      ],
      count: 1,
    });
    const seller = task({ kind: 'follow_up', projectId: 'p1', sellerName: 'M. Lambert' });
    const prospect = task({ kind: 'prospect', projectId: 'p2', count: 2 });
    const tasks = [shared, recontact, seller, prospect];
    expect(buyersToday(tasks, TODAY)).toHaveLength(3);
    expect(buyersTodayTaskCount(tasks)).toBe(2);
  });

  // Relecture du lot B — dans la liste, une ligne par personne : ses autres tâches se disent en
  // une ligne, leur retard compris. Rien de dû n'est caché derrière la première.
  it('« + 2 autres choses à faire », et leur retard', () => {
    const on = { late: null };
    const late = { late: 'en retard de 2 jours' };
    expect(buyerOthersNote([])).toBeNull();
    expect(buyerOthersNote([on])).toEqual({ text: '+ 1 autre chose à faire', late: null });
    expect(buyerOthersNote([late])).toEqual({ text: '+ 1 autre chose à faire', late: 'en retard' });
    expect(buyerOthersNote([on, on])).toEqual({ text: '+ 2 autres choses à faire', late: null });
    expect(buyerOthersNote([on, late, on])).toEqual({
      text: '+ 3 autres choses à faire',
      late: 'dont 1 en retard',
    });
    expect(buyerOthersNote([late, late])).toEqual({
      text: '+ 2 autres choses à faire',
      late: 'toutes en retard',
    });
  });
});

// La refonte, lot C — « un bien à la fois », dans le détail (tablette, ordinateur).
describe('le détail : la personne choisie, et ses nouveaux biens un par un', () => {
  const relaunch = task({
    kind: 'buyer_relaunch',
    buyerId: 'mercier',
    buyerName: 'M. et Mme Mercier',
    dueOn: '2026-11-24',
  });
  const known = (id: string) => ['mercier', 'fontaine', 'sans-tache'].includes(id);

  it('la tâche de la veille mène à ses biens, et à eux seuls', () => {
    expect(watchDeckHref(watch)).toBe('/acquereurs/mercier/biens-ideaux?un=veille');
    // Une autre tâche garde son propre geste ; une veille sans acquéreur ne mène nulle part.
    expect(watchDeckHref(relaunch)).toBeNull();
    expect(watchDeckHref(task({ kind: 'buyer_watch' }))).toBeNull();
    // Dans le détail (tablette, ordinateur), les mêmes biens se voient sur place.
    expect(watchDetailHref(watch)).toBe('/acquereurs?personne=mercier&biens=1');
    expect(watchDetailHref(relaunch)).toBeNull();
    expect(watchDetailHref(task({ kind: 'buyer_watch' }))).toBeNull();
  });

  it('la ligne d’une personne dont la première tâche est la veille tient l’adresse sur ses biens', () => {
    const [mercier, fontaine] = buyersToday([watch, recontact], TODAY);
    expect(buyerTodayHref(mercier!)).toBe('/acquereurs?personne=mercier&biens=1');
    expect(buyerTodayHref(fontaine!)).toBe('/acquereurs?personne=fontaine');
  });

  it('sans adresse : la première personne ; ses biens si sa première tâche est la veille', () => {
    const items = buyersToday([watch, relaunch, recontact], TODAY);
    const detail = buyersTodayDetail(items, {}, known);
    expect(detail.selected?.buyerId).toBe('mercier');
    expect(detail.deckBuyerId).toBe('mercier');
    // Sous ses biens : ses autres choses à faire, jamais la veille (c'est le parcours lui-même).
    expect(detail.beside.map((entry) => entry.task.kind)).toEqual(['buyer_relaunch']);
    const other = buyersTodayDetail(items, { personne: 'fontaine' }, known);
    expect(other.selected?.buyerId).toBe('fontaine');
    expect(other.deckBuyerId).toBeNull();
    expect(other.beside).toEqual([]);
  });

  // Relecture du lot C (bloquant) — écarter le dernier bien de la veille fait disparaître la tâche
  // à la relecture de la page : l'adresse tient la personne sur ses biens.
  it('l’adresse tient la personne sur ses biens quand la veille n’est plus sa première tâche', () => {
    const items = buyersToday([relaunch, recontact], TODAY);
    const detail = buyersTodayDetail(items, { personne: 'mercier', biens: true }, known);
    expect(detail.selected?.buyerId).toBe('mercier');
    expect(detail.deckBuyerId).toBe('mercier');
    // Sa tâche du jour n'est plus la veille : elle suit ses biens, avec les autres.
    expect(detail.beside.map((entry) => entry.task.kind)).toEqual(['buyer_relaunch']);
    // Sans `biens=1`, son détail est celui de sa tâche.
    expect(buyersTodayDetail(items, { personne: 'mercier' }, known).deckBuyerId).toBeNull();
  });

  it('l’adresse la tient encore quand elle n’a plus rien à faire : jamais une autre personne à sa place', () => {
    const items = buyersToday([recontact], TODAY);
    const detail = buyersTodayDetail(items, { personne: 'sans-tache', biens: true }, known);
    expect(detail.deckBuyerId).toBe('sans-tache');
    // Personne n'est surligné dans la liste ; rien d'autre à faire sous ses biens.
    expect(detail.selected).toBeNull();
    expect(detail.beside).toEqual([]);
  });

  it('une fiche inconnue de l’agence n’est jamais tenue : la première personne', () => {
    const items = buyersToday([recontact], TODAY);
    const detail = buyersTodayDetail(items, { personne: 'inconnue', biens: true }, known);
    expect(detail.selected?.buyerId).toBe('fontaine');
    expect(detail.deckBuyerId).toBeNull();
    // Rien à faire, personne dans l'adresse : aucun détail.
    expect(buyersTodayDetail([], {}, known)).toEqual({
      selected: null,
      deckBuyerId: null,
      beside: [],
    });
  });

  it('deux tâches de veille (ses biens, un bien trouvé pour plusieurs) : un seul parcours', () => {
    const shared = task({
      kind: 'buyer_watch',
      projectId: '',
      propertyKey: 'listing:x',
      watchBuyers: [
        { id: 'mercier', name: 'M. et Mme Mercier' },
        { id: 'fontaine', name: 'M. Fontaine' },
      ],
    });
    const items = buyersToday([watch, shared, relaunch], TODAY);
    const detail = buyersTodayDetail(items, { personne: 'mercier', biens: true }, known);
    expect(detail.beside.map((entry) => entry.task.kind)).toEqual(['buyer_relaunch']);
  });
});

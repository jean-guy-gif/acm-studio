import { describe, expect, it } from 'vitest';

import {
  everythingLine,
  everythingOpen,
  editSearchHref,
  otherActions,
  readinessLine,
  readinessOpen,
  searchFoldLine,
  searchFoldOpen,
  selectionShown,
  statusHref,
  suiviLastVisit,
  suiviLineGist,
  suiviLineGroups,
  suiviLineOpen,
  timelineLine,
} from '@/features/buyers/services/buyer-sheet-layout';

// Lancement, mission 10 (Jean-Guy, 23/11 ; maquette `L10-fiche-acquereur-simplifiee.png`) — la fiche
// acquéreur simplifiée : une seule prochaine étape, comme côté vendeur ; ce qui ne sert pas à la
// prochaine étape se replie ou devient un lien. Rien n'est retiré.

describe('« Sa sélection » : tant qu’elle est à présenter', () => {
  const base = { hasSelection: true, sale: false, sent: false, followUpRead: true };

  it('pas encore présentée ni envoyée : son bloc reste, elle n’est nulle part ailleurs', () => {
    expect(selectionShown(base)).toBe(true);
  });

  it('présentée ou envoyée : ses biens se lisent dans « Son suivi », une seule fois', () => {
    expect(selectionShown({ ...base, sent: true })).toBe(false);
  });

  it('le suivi illisible : la sélection reste affichée, rien ne disparaît (M98)', () => {
    expect(selectionShown({ ...base, sent: true, followUpRead: false })).toBe(true);
  });

  it('sans sélection, ou pendant une vente : rien', () => {
    expect(selectionShown({ ...base, hasSelection: false })).toBe(false);
    expect(selectionShown({ ...base, sale: true })).toBe(false);
  });
});

describe('« Prêt à visiter ? », replié', () => {
  it('s’ouvre seul quand il manque quelque chose à un acquéreur qui cherche', () => {
    expect(readinessOpen('ready', true)).toBe(false);
    expect(readinessOpen('recontact', true)).toBe(true);
    expect(readinessOpen(null, true)).toBe(true);
  });

  it('reste replié pour un acquéreur qui a acheté ou abandonné : rien ne lui manque', () => {
    expect(readinessOpen(null, false)).toBe(false);
    expect(readinessOpen('recontact', false)).toBe(false);
  });

  it('sa ligne dit la veille, lisible sans ouvrir le bloc (M136)', () => {
    expect(
      readinessLine({
        financing: 'validated',
        lastExchange: 'dernier échange il y a 3 j',
        watch: 'Veille : dernière recherche le 21/11, prochaine le 28/11',
      }),
    ).toBe(
      'financement validé · dernier échange il y a 3 j · veille : dernière recherche le 21/11, prochaine le 28/11',
    );
    expect(readinessLine({ financing: 'validated', lastExchange: null, watch: null })).toBe(
      'financement validé',
    );
  });

  it('sa ligne dit l’essentiel : le financement, puis le dernier échange', () => {
    expect(
      readinessLine({ financing: 'validated', lastExchange: 'dernier échange aujourd’hui' }),
    ).toBe('financement validé · dernier échange aujourd’hui');
    expect(readinessLine({ financing: 'in_progress', lastExchange: null })).toBe(
      'financement en cours',
    );
    expect(readinessLine({ financing: 'unknown', lastExchange: null })).toBe(
      'financement à confirmer',
    );
  });
});

describe('« Ce qui s’est passé », replié', () => {
  it('dit combien d’événements, et de quand date le dernier', () => {
    expect(timelineLine(8, 'aujourd’hui')).toBe('8 événements, le dernier aujourd’hui');
    expect(timelineLine(8)).toBe('8 événements');
    expect(timelineLine(1)).toBe('1 événement');
    expect(timelineLine(0)).toBe('rien pour l’instant');
  });
});

describe('« Autres actions » : des liens discrets', () => {
  const base = { buyerId: 'b1', sale: false, matches: 8 as number | null, hasVisits: true };

  it('rapprocher, le bon de visite, l’offre — dans cet ordre, jamais un bouton', () => {
    expect(otherActions(base)).toEqual([
      {
        key: 'matches',
        label: 'Rapprocher · 8 correspondances',
        href: '/acquereurs/rapprochement?acquereur=b1#rapprochement',
      },
      { key: 'voucher', label: 'Bon de visite', href: '/acquereurs/b1/bon-de-visite' },
      { key: 'offer', label: 'Offre d’achat', href: '/acquereurs/b1/offre' },
    ]);
  });

  it('« Modifier sa recherche » n’y est plus : il n’apparaît qu’une fois, sous ses critères (10 bis)', () => {
    expect(otherActions(base).map((action) => action.label)).not.toContain('Modifier sa recherche');
    expect(editSearchHref('b1')).toBe('/acquereurs/b1?modifier=1#recherche');
  });

  it('une seule correspondance s’écrit au singulier ; aucune se dit', () => {
    expect(otherActions({ ...base, matches: 1 })[0]!.label).toBe('Rapprocher · 1 correspondance');
    expect(otherActions({ ...base, matches: 0 })[0]!.label).toBe(
      'Rapprocher · aucune correspondance',
    );
  });

  it('des correspondances illisibles ne se lisent jamais « aucune » (M98)', () => {
    const [first] = otherActions({ ...base, matches: null });
    expect(first).toEqual({
      key: 'matches',
      label: 'Rapprocher',
      href: '/acquereurs/rapprochement?acquereur=b1#rapprochement',
      unread: 'Correspondances illisibles pour l’instant : rechargez la page.',
    });
  });

  it('sans visite, ni bon ni offre à préparer ; pendant une vente, pas de rapprochement (M143)', () => {
    expect(otherActions({ ...base, hasVisits: false }).map((action) => action.key)).toEqual([
      'matches',
    ]);
    expect(otherActions({ ...base, sale: true }).map((action) => action.key)).toEqual([
      'voucher',
      'offer',
    ]);
  });
});

// Mission 10 bis (Jean-Guy, 25/11 ; maquette `M10bis-fiche-acquereur-repliee.png`) — la même fiche,
// repliée : à l'ouverture, qui il est, la prochaine étape, son suivi en lignes ; le reste sous
// « Tout le dossier ». Affichage seulement.
describe('la fiche repliée : les lignes de « Son suivi »', () => {
  it('trois lignes, toujours : visités, envoyés en attente, refusés', () => {
    expect(suiviLineGroups(0)).toEqual(['visited', 'waiting', 'refused']);
  });

  it('« Visites à organiser » : une quatrième ligne, seulement quand il y en a une', () => {
    expect(suiviLineGroups(2)).toEqual(['visited', 'to_visit', 'waiting', 'refused']);
  });

  it('fermées à l’ouverture ; s’ouvrent seules la visite à organiser, et la visite dont on sort', () => {
    const closed = { messages: false, pendingVisit: false, sale: false };
    expect(suiviLineOpen(closed)).toBe(false);
    // Une visite à organiser : c'est là qu'on la confirme.
    expect(suiviLineOpen({ ...closed, pendingVisit: true })).toBe(true);
    // Juste après « Visite faite » : ses messages sont sur sa ligne, elle s'ouvre.
    expect(suiviLineOpen({ ...closed, messages: true })).toBe(true);
  });

  it('pendant une vente, sa recherche est en pause : une visite à organiser n’ouvre plus sa ligne', () => {
    expect(suiviLineOpen({ messages: false, pendingVisit: true, sale: true })).toBe(false);
    // … sauf si l'on vient d'y noter une visite.
    expect(suiviLineOpen({ messages: true, pendingVisit: true, sale: true })).toBe(true);
    expect(suiviLineOpen({ messages: true, pendingVisit: false, sale: true })).toBe(true);
  });

  it('la visite que dit la ligne « Visités » : la plus récente de ses biens visités, eux seuls', () => {
    const entries = [
      { group: 'visited' as const, visitIds: ['v1', 'v2'] },
      { group: 'refused' as const, visitIds: ['v3'] },
      { group: 'to_visit' as const, visitIds: ['v4'] },
    ];
    const visits = [
      { id: 'v1', visitedAt: '2026-11-10T10:00:00Z', outcome: 'visited' },
      { id: 'v2', visitedAt: '2026-11-13T10:00:00Z', outcome: 'offer' },
      // Plus récente, mais le bien a été refusé depuis : elle n'est pas sur cette ligne.
      { id: 'v3', visitedAt: '2026-11-20T10:00:00Z', outcome: 'declined' },
      { id: 'v4', visitedAt: null, outcome: 'to_plan' },
    ];
    expect(suiviLastVisit(entries, visits)?.id).toBe('v2');
    expect(suiviLastVisit([{ group: 'refused', visitIds: ['v3'] }], visits)).toBeNull();
    expect(suiviLastVisit(entries, [])).toBeNull();
  });

  it('les envoyés en attente : ce qu’il en a dit, compté, dans l’ordre de ses réponses', () => {
    expect(
      suiviLineGist({ group: 'waiting', count: 2, pills: ['Sans réponse', 'Sans réponse'] }),
    ).toBe('2 sans réponse');
    expect(
      suiviLineGist({
        group: 'waiting',
        count: 3,
        pills: ['Sans réponse', 'Peut-être', 'Veut le visiter'],
      }),
    ).toBe('1 veut le visiter · 1 peut-être · 1 sans réponse');
    expect(
      suiviLineGist({ group: 'waiting', count: 2, pills: ['Veut le visiter', 'Veut le visiter'] }),
    ).toBe('2 veulent le visiter');
  });

  it('une ligne à zéro dit « aucun » ; les refusés et les visites à organiser, leur seul nombre', () => {
    expect(suiviLineGist({ group: 'refused', count: 0 })).toBe('aucun');
    expect(suiviLineGist({ group: 'visited', count: 0, lastVisit: null })).toBe('aucun');
    expect(suiviLineGist({ group: 'waiting', count: 0, pills: [] })).toBe('aucun');
    expect(suiviLineGist({ group: 'refused', count: 2 })).toBeNull();
    expect(suiviLineGist({ group: 'to_visit', count: 1 })).toBeNull();
  });
});

describe('la fiche repliée : ses critères, sur une ligne', () => {
  it('le nombre de critères, les indispensables, les souhaits', () => {
    expect(searchFoldLine({ criteria: 8, mustHave: 1, soft: 5 })).toBe(
      '8 critères, dont 1 indispensable · 5 souhaits',
    );
    expect(searchFoldLine({ criteria: 5, mustHave: 2, soft: 1 })).toBe(
      '5 critères, dont 2 indispensables · 1 souhait',
    );
  });

  it('fermé à l’ouverture ; ouvert seul tant qu’il reste des champs « À vérifier »', () => {
    expect(searchFoldOpen(0)).toBe(false);
    expect(searchFoldOpen(3)).toBe(true);
  });

  it('sans indispensable ni souhait, rien de trop ; sans critère, on le dit', () => {
    expect(searchFoldLine({ criteria: 1, mustHave: 0, soft: 0 })).toBe('1 critère');
    expect(searchFoldLine({ criteria: 0, mustHave: 0, soft: 2 })).toBe(
      'aucun critère · 2 souhaits',
    );
  });
});

describe('la fiche repliée : « Tout le dossier »', () => {
  const base = { selection: false, vouchers: false, offers: false, dismissed: 0, readiness: true };

  it('sa ligne dit ce qu’il contient, sans l’ouvrir', () => {
    expect(everythingLine(base)).toBe(
      'les cinq étapes · autres actions · prêt à visiter ? · ce qui s’est passé · statut',
    );
    expect(
      everythingLine({
        selection: true,
        vouchers: true,
        offers: true,
        dismissed: 2,
        readiness: false,
      }),
    ).toBe(
      'les cinq étapes · sa sélection · autres actions · bons de visite · offres d’achat · 2 écartés pour lui · ce qui s’est passé · statut',
    );
    expect(everythingLine({ ...base, dismissed: 1 })).toContain('1 écarté pour lui');
  });

  it('replié à l’ouverture ; il s’ouvre quand on y mène, ou quand une lecture y a échoué (M98)', () => {
    expect(everythingOpen({ asked: false, unread: false })).toBe(false);
    expect(everythingOpen({ asked: true, unread: false })).toBe(true);
    expect(everythingOpen({ asked: false, unread: true })).toBe(true);
  });

  it('il s’ouvre aussi quand il range une visite à organiser (un bien écarté pour lui)', () => {
    expect(everythingOpen({ asked: false, unread: false, pendingVisit: true })).toBe(true);
    expect(everythingOpen({ asked: false, unread: false, pendingVisit: false })).toBe(false);
  });

  it('le statut se change dans « Tout le dossier » : son lien l’ouvre sur « Son statut »', () => {
    expect(statusHref('b1')).toBe('/acquereurs/b1?tout=1#statut');
  });
});

import { describe, expect, it } from 'vitest';

import {
  otherActions,
  readinessLine,
  readinessOpen,
  selectionShown,
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
  it('s’ouvre seul quand il manque quelque chose', () => {
    expect(readinessOpen('ready')).toBe(false);
    expect(readinessOpen('recontact')).toBe(true);
    expect(readinessOpen(null)).toBe(true);
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
  it('dit combien d’événements', () => {
    expect(timelineLine(8)).toBe('8 événements');
    expect(timelineLine(1)).toBe('1 événement');
    expect(timelineLine(0)).toBe('rien pour l’instant');
  });
});

describe('« Autres actions » : des liens discrets', () => {
  const base = { buyerId: 'b1', sale: false, matches: 8 as number | null, hasVisits: true };

  it('rapprocher, le bon de visite, l’offre, sa recherche — dans cet ordre, jamais un bouton', () => {
    expect(otherActions(base)).toEqual([
      {
        key: 'matches',
        label: 'Rapprocher · 8 correspondances',
        href: '/acquereurs/rapprochement?acquereur=b1#rapprochement',
      },
      { key: 'voucher', label: 'Bon de visite', href: '/acquereurs/b1/bon-de-visite' },
      { key: 'offer', label: 'Offre d’achat', href: '/acquereurs/b1/offre' },
      {
        key: 'search',
        label: 'Modifier sa recherche',
        href: '/acquereurs/b1?modifier=1#recherche',
      },
    ]);
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
      'search',
    ]);
    expect(otherActions({ ...base, sale: true }).map((action) => action.key)).toEqual([
      'voucher',
      'offer',
      'search',
    ]);
  });
});

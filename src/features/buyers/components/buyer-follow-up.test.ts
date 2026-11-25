import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { buyerFollowUp, followUpSummary } from '@/features/buyers/services/buyer-follow-up';

// La fiche complète d'un bien s'ouvre par une action du serveur : ici, un simple bouton.
vi.mock('@/features/property-sheet/components/property-sheet-button', () => ({
  PropertySheetButton: ({ children }: { children: unknown }) =>
    createElement('button', { 'data-testid': 'open-property-sheet' }, children as string),
}));

const { BuyerDismissed, BuyerFollowUp } =
  await import('@/features/buyers/components/buyer-follow-up');

// Lancement, mission 6 — « Son suivi », tel qu'il s'affiche : une lecture en échec se dit, ce que
// le conseiller a écarté est replié, les lignes de visite sont celles qu'on lui donne.
// Mission 10 bis — en lignes fermées avec leur nombre ; ce qui a été écarté pour lui se lit dans
// « Tout le dossier ».
const NOW = new Date('2026-11-24T10:00:00Z');
const entries = buyerFollowUp({
  selections: [{ id: 's1', presented_at: '2026-11-14T09:30:00Z' }],
  shares: [],
  items: [
    {
      id: 'i1',
      selection_id: 's1',
      source: 'project',
      reference: 'p1',
      label: 'Appartement · 3 pièces · 65 m² · Antibes',
      listed_price: 395_000,
      removed_at: null,
    },
    {
      id: 'i2',
      selection_id: 's1',
      source: 'competitor',
      reference: 'c1',
      label: 'Appartement · 3 pièces · 71 m² · Antibes',
      listed_price: 398_000,
      removed_at: null,
    },
  ],
  proposals: [],
  responses: [
    {
      selection_item_id: 'i2',
      answer: 'no',
      reasons: ['district'],
      answered_at: '2026-11-14T09:15:00Z',
      answered_during: 'presentation',
    },
  ],
  dismissals: [
    {
      property_key: 'listing:seloger:ABC',
      label: 'Maison · 5 pièces · 140 m² · Vence',
      reason: 'over_budget',
      dismissed_at: '2026-11-20T08:00:00Z',
    },
  ],
  visits: [
    {
      id: 'v1',
      itemId: 'i1',
      requestedAt: '2026-11-14T09:10:00Z',
      visitedAt: '2026-11-22T15:00:00Z',
      opinion: 'love',
      outcome: 'visited',
    },
  ],
  competitorUrls: new Map(),
});

const visitRows = {
  v1: createElement('li', { key: 'v1', 'data-testid': 'visit-line' }, 'La visite du 22/11'),
};

const render = (
  over: {
    unread?: boolean;
    list?: typeof entries;
    messagesGroup?: 'visited' | 'refused';
    lastVisit?: { day: string; outcome: string };
  } = {},
) =>
  renderToStaticMarkup(
    createElement(BuyerFollowUp, {
      entries: over.list ?? entries,
      summary: followUpSummary(over.list ?? entries, 0),
      unread: over.unread ?? false,
      now: NOW,
      visitRows,
      lastVisit: over.lastVisit ?? null,
      messagesGroup: over.messagesGroup ?? null,
    }),
  );

// La ligne d'un groupe, de son ouverture à la suivante.
const line = (html: string, group: string): string => {
  const from = html.indexOf(`data-group="${group}"`);
  const next = html.indexOf('data-testid="buyer-follow-up-group"', from);
  return from < 0 ? '' : html.slice(from, next < 0 ? undefined : next);
};

describe('« Son suivi », à l’écran', () => {
  it('un bloc, la ligne du haut, et trois lignes dans l’ordre : visités, en attente, refusés', () => {
    const html = render();
    expect(html).toContain('Son suivi');
    expect(html).toContain('2 biens envoyés · 1 visité · 1 refusé · 1 écarté pour lui');
    const order = ['Visités', 'Envoyés, en attente', 'Refusés'].map((title) => html.indexOf(title));
    expect(order.every((at) => at > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // « Visites à organiser » : seulement quand il y en a une.
    expect(html).not.toContain('Visites à organiser');
    // Ce que le conseiller a écarté pour lui n'est plus ici : « Tout le dossier ».
    expect(html).not.toContain('Écartés pour lui, sans lui en parler');
  });

  it('chaque ligne dit son nombre ; une ligne à zéro dit « aucun » et ne s’ouvre pas', () => {
    const html = render({ lastVisit: { day: 'le 22/11', outcome: 'Offre envisagée' } });
    expect(line(html, 'visited')).toMatch(/data-testid="buyer-follow-up-count"[^>]*>1</);
    expect(line(html, 'visited')).toContain('le 22/11 · offre envisagée');
    expect(line(html, 'refused')).toMatch(/data-testid="buyer-follow-up-count"[^>]*>1</);
    const waiting = line(html, 'waiting');
    expect(waiting).toMatch(/data-testid="buyer-follow-up-count"[^>]*>0</);
    expect(waiting).toContain('aucun');
    expect(html).toMatch(/<div[^>]*data-group="waiting"[^>]*data-empty="true"/);
    expect(html).not.toMatch(/<details[^>]*data-group="waiting"/);
  });

  it('les lignes sont fermées à l’ouverture de la fiche', () => {
    const html = render();
    expect(html).toMatch(/<details[^>]*data-group="visited"/);
    expect(html).toMatch(/<details[^>]*data-group="refused"/);
    expect(html).not.toMatch(/<details[^>]*open=""/);
  });

  it('la ligne de la visite dont on vient de noter le compte rendu s’ouvre seule', () => {
    const html = render({ messagesGroup: 'visited' });
    expect(html).toMatch(/<details[^>]*data-group="visited"[^>]*open=""/);
    expect(html).not.toMatch(/<details[^>]*data-group="refused"[^>]*open=""/);
  });

  it('« Visites à organiser » : une quatrième ligne quand il y en a une, ouverte d’elle-même', () => {
    const list = buyerFollowUp({
      selections: [{ id: 's1', presented_at: '2026-11-14T09:30:00Z' }],
      shares: [],
      items: [
        {
          id: 'i1',
          selection_id: 's1',
          source: 'project',
          reference: 'p1',
          label: 'Appartement · 3 pièces · 65 m² · Antibes',
          listed_price: 395_000,
          removed_at: null,
        },
      ],
      proposals: [],
      responses: [],
      dismissals: [],
      visits: [
        {
          id: 'v1',
          itemId: 'i1',
          requestedAt: '2026-11-14T09:10:00Z',
          visitedAt: null,
          opinion: null,
          outcome: 'to_plan',
        },
      ],
      competitorUrls: new Map(),
    });
    const html = render({ list });
    const order = ['Visités', 'Visites à organiser', 'Envoyés, en attente', 'Refusés'].map(
      (title) => html.indexOf(title),
    );
    expect(order.every((at) => at > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(html).toMatch(/<details[^>]*data-group="to_visit"[^>]*open=""/);
    // Sa visite, avec ses gestes, est sur sa ligne.
    expect(line(html, 'to_visit')).toContain('La visite du 22/11');
  });

  it('un bien visité : la ligne de sa visite, ce qui l’a précédée, et sa fiche à un toucher', () => {
    const html = line(render(), 'visited');
    expect(html).toContain('La visite du 22/11');
    expect(html).toContain('Envoyé le 14/11, en présentation');
    expect(html).toContain('Voir la fiche du bien');
  });

  it('un concurrent refusé : sa raison, « Concurrent à prospecter », jamais « Dans l’agence »', () => {
    const html = render();
    expect(html).toContain('Pas pour lui : Le quartier');
    expect(html).toContain('Concurrent à prospecter');
    expect(html).not.toContain('Dans l’agence');
    expect(html).toContain('>Refusé<');
  });

  it('ce que le conseiller a écarté pour lui : à part, replié, avec son nombre et sa raison', () => {
    const html = renderToStaticMarkup(
      createElement(BuyerDismissed, {
        entries,
        visitRows,
        now: NOW,
        titleClassName: 'titre',
        lineClassName: 'ligne',
      }),
    );
    expect(html).toMatch(/<details[^>]*data-group="dismissed"/);
    expect(html).not.toMatch(/<details[^>]*open/);
    expect(html).toContain('Écartés pour lui, sans lui en parler');
    expect(html).toMatch(/data-testid="buyer-follow-up-count"[^>]*>· 1</);
    expect(html).toContain('Prix au-dessus du budget');
    // Rien d'écarté : pas de pli.
    expect(
      renderToStaticMarkup(
        createElement(BuyerDismissed, {
          entries: entries.filter((entry) => entry.group !== 'dismissed'),
          visitRows,
          titleClassName: 'titre',
          lineClassName: 'ligne',
        }),
      ),
    ).toBe('');
  });

  it('ce que ses refus suggèrent se lit sous les lignes, dans le même bloc', () => {
    const html = renderToStaticMarkup(
      createElement(
        BuyerFollowUp,
        { entries, summary: null, unread: false, now: NOW, visitRows },
        createElement('p', { 'data-testid': 'suggestions' }, 'Le prix a été refusé deux fois.'),
      ),
    );
    expect(html.indexOf('data-testid="suggestions"')).toBeGreaterThan(html.indexOf('Refusés'));
    expect(html.indexOf('data-testid="suggestions"')).toBeLessThan(html.lastIndexOf('</section>'));
  });

  it('une lecture en échec le dit, même sans rien à montrer ; sans rien ni échec, pas de bloc', () => {
    expect(render({ unread: true, list: [] })).toContain(
      'Son suivi n’a pas pu être lu en entier : rechargez la page.',
    );
    expect(render({ list: [] })).toBe('');
  });

  it('aucun bouton plein', () => {
    expect(render()).not.toContain('btn-filled');
  });
});

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// La carte est isolée des Server Actions de ses lignes (chaîne server-only) : le test ne porte
// que sur ce que l'écran propose.
vi.mock('@/features/competitor-mandate/actions/set-competitor-mandate', () => ({
  setCompetitorMandate: async () => ({ ok: true }),
}));

import { makeComparable } from '@/features/comparable-analysis/services/test-helpers';
import {
  ComparableCard,
  DELETE_COMPETITOR_TITLE,
  WITHDRAWN_REINTEGRATE_WARNING,
  competitorMenuItems,
  deleteCompetitorText,
  WithdrawnReintegrateWarning,
} from '@/features/comparables/components/comparable-card';

const noop = () => {};

const card = (overrides: Parameters<typeof makeComparable>[0]) =>
  renderToStaticMarkup(
    createElement(ComparableCard, {
      comparable: makeComparable({ id: 'c1', ...overrides }),
      editHref: '/builder/p1/comparables/c1/edit',
      subjectSurfaceArea: null,
      toggleAction: noop,
      deleteAction: noop,
    }),
  );

// Le formulaire qui bascule « retenu / écarté » d'un seul clic.
const DIRECT_TOGGLE =
  /<form[^>]*><input type="hidden" name="comparableId" value="c1"\/><button type="submit"[^>]*>(Réintégrer|Écarter)<\/button><\/form>/;

// Mission 103 — recocher une annonce retirée reste le choix du conseiller, mais pas d'un clic.
describe('réintégrer une annonce retirée', () => {
  it('ne part pas d’un seul clic : « Réintégrer » ouvre d’abord l’avertissement', () => {
    const html = card({ is_selected: false, listing_withdrawn: true });
    expect(html).toContain('Annonce retirée');
    expect(html).toContain('<button type="button"');
    expect(html).toMatch(/<button type="button"[^>]*>Réintégrer<\/button>/);
    expect(html).not.toMatch(DIRECT_TOGGLE);
  });

  it('l’avertissement dit ce que verra le vendeur, et laisse le choix', () => {
    const html = renderToStaticMarkup(
      createElement(WithdrawnReintegrateWarning, {
        comparableId: 'c1',
        toggleAction: noop,
        onCancel: noop,
      }),
    );
    expect(WITHDRAWN_REINTEGRATE_WARNING).toBe(
      'Cette annonce n’est plus en ligne : elle sera présentée au vendeur comme un bien en vente. Continuer ?',
    );
    expect(html).toContain(WITHDRAWN_REINTEGRATE_WARNING);
    expect(html).toContain('name="comparableId" value="c1"');
    expect(html).toMatch(/<button type="button"[^>]*>Annuler<\/button>/);
    expect(html).toMatch(/<button type="submit"[^>]*>Continuer<\/button>/);
  });

  it('un bien en ligne se réintègre et s’écarte d’un clic, comme avant', () => {
    expect(card({ is_selected: false, listing_withdrawn: false })).toMatch(DIRECT_TOGGLE);
    expect(card({ is_selected: true, listing_withdrawn: false })).toMatch(DIRECT_TOGGLE);
    // Écarter une annonce retirée déjà retenue ne demande rien.
    expect(card({ is_selected: true, listing_withdrawn: true })).toMatch(DIRECT_TOGGLE);
  });
});

// Mission 110 — une fois le Live commencé, l'ordre est figé : Monter et Descendre sont désactivés.
// Mission 146 — ils sont dans le menu « … » de la carte.
describe('l’ordre, dans le menu « … »', () => {
  const items = (orderFrozen: boolean, isFirst = false, isLast = false) =>
    competitorMenuItems({
      editHref: '/builder/p1/comparables/c1/edit',
      movable: true,
      isFirst,
      isLast,
      orderFrozen,
      onUp: noop,
      onDown: noop,
      onDelete: noop,
    });
  const find = (list: ReturnType<typeof items>, key: string) =>
    list.find((item) => item.key === key);

  it('actifs tant que le Live n’a pas commencé', () => {
    expect(find(items(false), 'up')?.disabled).toBe(false);
    expect(find(items(false), 'down')?.disabled).toBe(false);
  });

  it('désactivés une fois le Live commencé', () => {
    expect(find(items(true), 'up')?.disabled).toBe(true);
    expect(find(items(true), 'down')?.disabled).toBe(true);
  });

  it('le premier ne monte pas, le dernier ne descend pas', () => {
    expect(find(items(false, true, false), 'up')?.disabled).toBe(true);
    expect(find(items(false, false, true), 'down')?.disabled).toBe(true);
  });

  it('Modifier la fiche, puis Supprimer… en rouge, en dernier', () => {
    const list = items(false);
    expect(list.map((item) => item.label)).toEqual([
      'Modifier la fiche',
      'Monter',
      'Descendre',
      'Supprimer…',
    ]);
    expect(list.at(-1)?.danger).toBe(true);
  });
});

// Mission 146 (I5) — par carte, « Écarter » visible et « … » ; ni Supprimer ni flèches à côté.
describe('une carte de concurrent retenu', () => {
  const html = renderToStaticMarkup(
    createElement(ComparableCard, {
      comparable: makeComparable({ id: 'c1', is_selected: true }),
      editHref: '/builder/p1/comparables/c1/edit',
      subjectSurfaceArea: null,
      toggleAction: noop,
      deleteAction: noop,
      moveAction: noop,
    }),
  );

  it('montre « Écarter » et « Plus d’actions », rien d’autre', () => {
    expect(html).toMatch(/>Écarter<\/button>/);
    expect(html).toContain('aria-label="Plus d’actions"');
    expect(html).not.toContain('>Supprimer<');
    expect(html).not.toContain('Monter');
    expect(html).not.toContain('>Modifier<');
  });

  it('la suppression se confirme dans l’écran : aucune boîte du navigateur', () => {
    expect(DELETE_COMPETITOR_TITLE).toBe('Supprimer ce concurrent ?');
    expect(deleteCompetitorText('Maison 5 pièces')).toContain('écartez-le');
  });
});

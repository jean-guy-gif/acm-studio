import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  DeckCardView,
  DeckHeader,
  GESTURE_GUARD_MS,
  retainedLabel,
  type DeckCard,
  type DeckNote,
} from '@/features/ideal-properties/components/ideal-deck';

// La refonte, lot C (maquettes REFONTE-3, 5 et 6) — « un bien à la fois », à l'écran.
const card = (over: Partial<DeckCard> = {}): DeckCard => ({
  key: 'listing:https://x/annonce/1',
  label: 'Maison · 8 pièces · 200 m² · Mougins',
  photo: 'https://photos.example/1.jpg',
  price: 1_590_000,
  origin: 'affiché le 24/11/2026',
  criteria: { label: '8 critères sur 8', allMet: true },
  budget: { tone: 'good', label: '110 000 € sous le budget' },
  why: [
    { tone: 'must', label: 'Piscine' },
    { tone: 'said', label: '« au calme » dans l’annonce' },
    { tone: 'plain', label: 'Mougins' },
    { tone: 'plain', label: '2 pièces de plus' },
  ],
  notes: [],
  listing: true,
  ...over,
});
const noop = () => {};
const FULL_NOTE: DeckNote = {
  text: 'Sélection complète : pour proposer ce bien, retirez-en un dans toute la liste.',
  retain: null,
};
const unsaved = (text: string, label: string, saving = false): DeckNote => ({
  text,
  retain: { label, saving, onRetain: noop },
});
const render = (
  over: Partial<DeckCard> = {},
  props: { full?: boolean; note?: DeckNote | null; status?: string | null } = {},
) =>
  renderToStaticMarkup(
    createElement(DeckCardView, {
      card: card(over),
      full: props.full ?? false,
      pending: false,
      error: null,
      keyboard: false,
      onOpen: noop,
      onPropose: noop,
      onDismiss: noop,
      onSkip: noop,
      note: props.note ?? null,
      status: props.status ?? null,
    }),
  );
const tag = (html: string, testId: string) =>
  new RegExp(`<[a-z0-9]+[^>]*data-testid="${testId}"[^>]*>`).exec(html)?.[0] ?? '';

describe('l’en-tête : « Bien 1 sur 4 », « 0 retenu sur 3 »', () => {
  const header = (position: number, total: number, retained: number) =>
    renderToStaticMarkup(
      createElement(DeckHeader, { lead: 'Mercier', position, total, retained, max: 3 }),
    );

  it('le rang, ce qui est retenu, et un trait par bien', () => {
    const html = header(1, 4, 0);
    expect(html).toContain('>Bien 1 sur 4<');
    expect(html).toContain('>0 retenu sur 3<');
    expect(html.match(/data-reached="true"/g)).toHaveLength(1);
    expect(html.match(/data-reached="false"/g)).toHaveLength(3);
  });

  it('s’accorde, et se dit court sur tablette', () => {
    expect(retainedLabel(2, 3)).toEqual({ long: '2 retenus sur 3', short: '2 sur 3' });
    expect(retainedLabel(1, 3).long).toBe('1 retenu sur 3');
    expect(header(3, 4, 2)).toContain('>2 retenus sur 3<');
    expect(header(3, 4, 2).match(/data-reached="true"/g)).toHaveLength(3);
  });

  it('au-delà de douze biens, douze traits ; tout vu, le dernier rang', () => {
    const many = header(10, 20, 0);
    expect(many).toContain('>Bien 10 sur 20<');
    expect(many.match(/data-reached=/g)).toHaveLength(12);
    expect(many.match(/data-reached="true"/g)).toHaveLength(6);
    expect(header(5, 4, 1)).toContain('>Bien 4 sur 4<');
    expect(header(1, 0, 0)).toContain('>Aucun bien<');
  });
});

describe('un bien à la fois', () => {
  it('la photo et « 8 critères sur 8 », le prix et sa pastille, le libellé, ses raisons', () => {
    const html = render().replace(/[\u00a0\u202f]/g, ' ');
    // Chaque texte à sa place à l'écran (le libellé se lit aussi dans le nom du bouton de la photo).
    const order = [
      '8 critères sur 8',
      '1 590 000 €',
      '110 000 € sous le budget',
      'Maison · 8 pièces · 200 m² · Mougins',
      'Pourquoi celui-ci pour eux',
      'Piscine',
      '« au calme » dans l’annonce',
      'Mougins',
      '2 pièces de plus',
    ].map((text) => html.indexOf(`>${text}<`));
    expect(order.every((at) => at > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // Jamais un pourcentage.
    expect(html).not.toContain('%');
  });

  it('les raisons gardent leur teinte : l’indispensable, ce que dit l’annonce, le reste', () => {
    const html = render();
    expect(html.match(/data-testid="deck-why-pill"/g)).toHaveLength(4);
    expect(html).toMatch(/data-tone="must"[^>]*>Piscine</);
    expect(html).toMatch(/data-tone="said"[^>]*>« au calme » dans l’annonce</);
    expect(html).toMatch(/data-tone="plain"[^>]*>Mougins</);
  });

  it('deux gestes, un seul bouton plein : « Proposer »', () => {
    const html = render();
    expect(tag(html, 'deck-propose')).toContain('btn-filled');
    expect(tag(html, 'deck-dismiss')).not.toContain('btn-filled');
    expect(html.match(/(^|[" ])btn-filled( |")/g)).toHaveLength(1);
    expect(html.indexOf('Écarter')).toBeLessThan(html.indexOf('Proposer'));
    // Les raisons d'écarter n'apparaissent qu'après « Écarter ».
    expect(html).not.toContain('data-testid="deck-reasons"');
  });

  // Une sélection déjà complète ne ferme pas le parcours : le bien se voit, s'écarte ou se passe.
  it('sélection complète : « Proposer » ne retient plus rien, le bien se voit quand même', () => {
    const fullCard = render({}, { full: true, note: FULL_NOTE });
    expect(tag(fullCard, 'deck-propose')).toMatch(/ disabled=""/);
    expect(tag(render(), 'deck-propose')).not.toMatch(/ disabled=""/);
    expect(tag(fullCard, 'deck-dismiss')).not.toMatch(/ disabled=""/);
    expect(fullCard).toContain(
      'Sélection complète : pour proposer ce bien, retirez-en un dans toute la liste.',
    );
    expect(fullCard).toContain('data-testid="deck-skip"');
    expect(fullCard).toContain('>Maison · 8 pièces · 200 m² · Mougins<');
    // Avec de la place : ni mention, ni « Passer ».
    expect(render()).not.toContain('data-testid="deck-full"');
    expect(render()).not.toContain('data-testid="deck-skip"');
  });

  // Relecture du lot C (bloquant) — un bien proposé n'est pas encore enregistré : l'écran le dit,
  // et « Retenir la sélection » est là dès le premier, en contour (un seul bouton plein, M146).
  it('des biens proposés, pas encore enregistrés : la ligne le dit, « Retenir la sélection » en contour', () => {
    const html = render(
      {},
      {
        note: unsaved(
          '1 bien dans la sélection, pas encore enregistrée.',
          'Retenir la sélection (1/3)',
        ),
      },
    );
    expect(html).toContain('>1 bien dans la sélection, pas encore enregistrée.<');
    expect(html).toContain('data-testid="deck-unsaved"');
    expect(tag(html, 'deck-retain-now')).not.toContain('btn-filled');
    expect(html).toContain('>Retenir la sélection (1/3)<');
    expect(html.match(/(^|[" ])btn-filled( |")/g)).toHaveLength(1);
    // Il reste de la place : rien à passer.
    expect(html).not.toContain('data-testid="deck-skip"');
    // Sans rien de proposé : ni ligne ni bouton.
    expect(render()).not.toContain('data-testid="deck-note"');
    expect(render()).not.toContain('data-testid="deck-retain-now"');
  });

  it('complète et pas encore enregistrée : « Retenir la sélection » et « Passer ce bien »', () => {
    const html = render(
      {},
      {
        full: true,
        note: unsaved(
          'Sélection complète, pas encore enregistrée.',
          'Retenir la sélection (3/3)',
          true,
        ),
      },
    );
    expect(html).toContain('data-testid="deck-full"');
    expect(html).toContain('data-testid="deck-skip"');
    // Pendant l'enregistrement, le bouton le dit et n'entend plus rien.
    expect(tag(html, 'deck-retain-now')).toMatch(/ disabled=""/);
    expect(html).toContain('>Enregistrement…<');
    expect(html.match(/(^|[" ])btn-filled( |")/g)).toHaveLength(1);
  });

  it('ce qui vient d’être enregistré se dit sur place', () => {
    const html = render({}, { status: 'Sélection retenue : 2 biens.' });
    expect(html).toMatch(
      /role="status"[^>]*data-testid="deck-saved"[^>]*>Sélection retenue : 2 biens\.</,
    );
    expect(render()).not.toContain('data-testid="deck-saved"');
  });

  // Relecture du lot C — un second toucher parti trop vite ne décide pas du bien suivant : à son
  // arrivée, un bien n'entend aucun geste pendant un court instant.
  it('à son arrivée, le bien n’entend pas encore les gestes', () => {
    expect(GESTURE_GUARD_MS).toBeGreaterThanOrEqual(300);
    expect(tag(render(), 'deck-card')).toContain('data-ready="false"');
  });

  it('la photo dit aussi « 8 critères sur 8 » aux lecteurs d’écran', () => {
    expect(tag(render(), 'deck-photo')).toContain(
      'aria-label="Ouvrir la fiche : Maison · 8 pièces · 200 m² · Mougins, 8 critères sur 8"',
    );
    expect(tag(render({ criteria: null }), 'deck-photo')).toContain(
      'aria-label="Ouvrir la fiche : Maison · 8 pièces · 200 m² · Mougins"',
    );
  });

  it('tous les critères ne sont pas satisfaits : le nombre, sans la coche verte', () => {
    const partial = render({ criteria: { label: '6 critères sur 8', allMet: false } });
    expect(tag(partial, 'deck-criteria')).not.toContain('text-[#0B6B4A]');
    expect(tag(render(), 'deck-criteria')).toContain('text-[#0B6B4A]');
    expect(render({ criteria: null })).not.toContain('data-testid="deck-criteria"');
  });

  it('ce qui est à savoir n’est jamais caché ; au-dessus du budget, la pastille est orange', () => {
    const html = render({
      budget: { tone: 'watch', label: '10 000 € au-dessus du budget, à négocier' },
      notes: ['Pas de parking', 'Extérieur : à vérifier'],
    });
    expect(html).toContain('À savoir : Pas de parking · Extérieur : à vérifier');
    expect(tag(html, 'deck-budget')).toContain('bg-[#FDEBDD]');
    expect(tag(html, 'deck-budget')).not.toMatch(/red|rose/);
  });

  it('un bien de l’agence : sans photo ici, sa fiche ; une annonce : « Voir l’annonce complète »', () => {
    const agency = render({ photo: null, criteria: null, listing: false });
    expect(agency).toContain('Voir la fiche du bien');
    expect(agency).not.toContain('<img');
    expect(render()).toContain('Voir l’annonce complète');
  });

  it('sans prix connu : « Prix à confirmer », aucune pastille de budget', () => {
    const html = render({ price: null, budget: null });
    expect(html).toContain('Prix à confirmer');
    expect(html).not.toContain('data-testid="deck-budget"');
  });
});

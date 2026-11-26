import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('@/features/purchase-offer/actions/offer-answer', () => ({
  markOfferAnswerDone: vi.fn(),
  prepareOfferBuyerMessage: vi.fn(),
  prepareOfferNotaryMessage: vi.fn(),
}));

const { OfferAnswerTask } = await import('@/features/purchase-offer/components/offer-answer-task');
const { btnSecondary, taskButtonClass } = await import('@/components/ui/styles');

// La réponse du vendeur à une offre (M138), au repos : quels boutons sont pleins. Le message ouvert
// se joue dans un vrai navigateur (spec `acquereurs-a-faire`).
const render = (props: { primary?: boolean; look?: 'today' | 'socle' }) =>
  renderToStaticMarkup(
    createElement(OfferAnswerTask, {
      offerId: 'o1',
      buyerId: 'b1',
      visitId: null,
      decision: 'accepted',
      offerHref: '/acquereurs/b1/offre/o1',
      ...props,
    }),
  );
const filled = (html: string) =>
  [...html.matchAll(/<(?:button|a)[^>]*class="([^"]*)"[^>]*>([^<]*)</g)]
    .filter(([, className]) => /(^| )btn-filled( |$)/.test(className ?? ''))
    .map(([, , text]) => text);

describe('la réponse du vendeur à une offre, au repos', () => {
  it('sur « Aujourd’hui », comme avant : tout en contour, même sur la première ligne', () => {
    expect(filled(render({}))).toEqual([]);
    expect(filled(render({ primary: true }))).toEqual([]);
    expect(render({})).not.toContain('data-task-open');
  });

  // La refonte, lot B — un seul bouton plein par écran : la carte qui mène l'écran a le sien.
  it('dans la carte « à faire » qui mène l’écran : « Prévenir l’acquéreur » est le bouton plein', () => {
    expect(filled(render({ look: 'socle', primary: true }))).toEqual(['Prévenir l’acquéreur']);
  });

  it('dans une autre carte « à faire » : tout en contour', () => {
    expect(filled(render({ look: 'socle', primary: false }))).toEqual([]);
    expect(filled(render({ look: 'socle' }))).toEqual([]);
  });

  // Dans une carte « à faire », « Prévenir l'acquéreur » est LE bouton de la carte : celui du
  // socle, sur toute la largeur — plein si la carte mène l'écran, en contour sinon.
  it('dans une carte « à faire », le premier geste est le bouton du socle ; sur « Aujourd’hui », non', () => {
    const buyerClass = (html: string) =>
      /<button[^>]*class="([^"]*)"[^>]*data-testid="offer-answer-buyer"|<button[^>]*data-testid="offer-answer-buyer"[^>]*class="([^"]*)"/
        .exec(html)
        ?.slice(1)
        .find(Boolean);
    expect(buyerClass(render({ look: 'socle', primary: true }))).toBe(
      taskButtonClass(true, 'socle'),
    );
    expect(buyerClass(render({ look: 'socle' }))).toBe(taskButtonClass(false, 'socle'));
    expect(buyerClass(render({}))).toBe(btnSecondary);
    expect(buyerClass(render({ primary: true }))).toBe(btnSecondary);
  });

  it('ses quatre gestes restent là, dans l’ordre', () => {
    const html = render({ look: 'socle', primary: true });
    const order = ['Prévenir l’acquéreur', 'Transmettre au notaire', 'Voir l’offre', 'Fait'].map(
      (label) => html.indexOf(label),
    );
    expect(order.every((at) => at > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});

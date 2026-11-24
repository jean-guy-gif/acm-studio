import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { VisitNextStep } from '@/features/buyer-presentation/services/visit-next-step';

// Lancement, mission 7 — depuis « Aujourd'hui », « Visite faite » mène à Visites avec
// `?faite=<visite>` : le compte rendu de cette visite s'y ouvre tout seul.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, refresh: () => undefined }),
  usePathname: () => '/visites',
}));
vi.mock('@/features/buyer-presentation/actions/visit-requests', () => ({
  recordVisitDone: async () => ({ ok: true }),
}));
const none = () => null;
vi.mock('@/features/buyer-messages/components/visit-messages-panel', () => ({
  VisitMessagesPanel: none,
}));
vi.mock('@/features/buyer-presentation/components/visit-next-step-form', () => ({
  VisitNextStepForm: none,
}));
vi.mock('@/features/buyer-presentation/components/visit-confirm-form', () => ({
  VisitConfirmForm: none,
}));
vi.mock('@/features/buyer-prospecting/components/visit-letter-action', () => ({
  VisitLetterAction: none,
}));

const { VisitActions } = await import('@/features/buyer-presentation/components/visit-actions');

const next: VisitNextStep = {
  agency: true,
  track: [{ key: 'visit_done', label: 'Visite faite', status: 'now' }],
  step: 'visit_done',
  links: {
    confirm: 'change',
    visitDone: false,
    proposeToSeller: false,
    voucher: false,
    messages: false,
    write: false,
  },
};
const render = (openDone: boolean) =>
  renderToStaticMarkup(
    createElement(VisitActions, {
      visitId: 'v1',
      buyerId: 'b1',
      next,
      action: { kind: 'none' },
      letterHref: null,
      letterState: { kind: 'none' },
      colleague: false,
      openDone,
    }),
  );

describe('le compte rendu ouvert depuis « Aujourd’hui »', () => {
  it('`openDone` : le formulaire de la visite est ouvert d’emblée', () => {
    expect(render(true)).toContain('data-testid="visit-done-form"');
  });

  it('sans lui, le formulaire reste fermé', () => {
    expect(render(false)).not.toContain('data-testid="visit-done-form"');
  });
});

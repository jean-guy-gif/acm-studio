import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const where = vi.hoisted(() => ({ pathname: '/visites' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, refresh: () => undefined }),
  usePathname: () => where.pathname,
}));
vi.mock('@/features/buyer-presentation/actions/confirm-visit', () => ({
  confirmVisit: async () => ({ ok: false, error: 'non joué' }),
}));

const { VisitConfirmForm } =
  await import('@/features/buyer-presentation/components/visit-confirm-form');

// Lancement, mission 11 — vu sur un vrai dossier : « Confirmer la visite », ouvert sur la fiche
// acquéreur, mettait un second bouton plein à côté de la prochaine étape (M146, Lancement 10).
describe('« Confirmer la visite » : un seul bouton plein par écran', () => {
  const prepare = (markup: string) =>
    markup.match(/<button[^>]*data-testid="visit-confirm-prepare"[^>]*>/)?.[0] ?? '';

  it('sur Visites, le formulaire ouvert porte le plein (M147 A)', () => {
    where.pathname = '/visites';
    const html = renderToStaticMarkup(createElement(VisitConfirmForm, { visitId: 'v1' }));
    expect(prepare(html)).toContain('btn-filled');
  });

  it('sur la fiche acquéreur, « Préparer le message » est en contour : la prochaine étape garde le plein', () => {
    where.pathname = '/acquereurs/3971f875-ac81-4e0a-be73-d9554ffa2987';
    const html = renderToStaticMarkup(createElement(VisitConfirmForm, { visitId: 'v1' }));
    where.pathname = '/visites';
    expect(prepare(html)).not.toBe('');
    expect(prepare(html)).not.toContain('btn-filled');
  });
});

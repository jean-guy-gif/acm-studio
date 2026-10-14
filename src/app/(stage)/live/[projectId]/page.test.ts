import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

// Mission 104 — un Live ouvert sans concurrent retenu (ancien lien, onglet resté ouvert) : le
// vendeur voit l'écran neutre de pause (M92), jamais un message d'erreur.
vi.mock('next/navigation', () => ({
  notFound: () => undefined,
  redirect: (path: string) => {
    throw new Error(`REDIRECT ${path}`);
  },
}));
vi.mock('@/features/live-seller/services/load-live-presentation', () => ({
  loadLivePresentation: async () => ({ live: null, property: null, project: { name: 'x' } }),
}));
vi.mock('@/features/branding/queries/get-agency-branding', () => ({ getAgencyBranding: vi.fn() }));
vi.mock('@/lib/auth/get-agency', () => ({ getAgency: vi.fn() }));
vi.mock('@/lib/auth/get-profile', () => ({ getProfile: vi.fn() }));
vi.mock('@/features/meeting-conclusion/queries/get-conclusion', () => ({ getConclusion: vi.fn() }));
vi.mock('@/features/live-seller/components/live-comparative-shell', () => ({
  LiveComparativeShell: () => null,
}));
vi.mock('@/features/live-seller/services/project-live-for-seller', () => ({
  authorizeAdvisorRange: vi.fn(),
  projectLiveForSeller: vi.fn(),
}));

import LiveProjectPage from '@/app/(stage)/live/[projectId]/page';

describe('un Live sans concurrent retenu', () => {
  it('ouvre l’écran neutre de pause, pas la scène', async () => {
    await expect(
      LiveProjectPage({
        params: Promise.resolve({ projectId: 'p1' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('REDIRECT /live/p1/pause');
  });

  it('aucun texte technique ne peut plus partir vers la scène', () => {
    const deliver = readFileSync(
      join(process.cwd(), 'src/features/live-seller/actions/deliver-live-fragment.ts'),
      'utf8',
    );
    expect(deliver).not.toContain('Dossier indisponible');
    expect(deliver).toContain('redirect(`/live/${projectId}/pause`)');
  });
});

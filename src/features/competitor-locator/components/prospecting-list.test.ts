import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// Les composants sont isolés de leurs Server Actions (chaîne server-only) : le test ne porte
// que sur ce que l'écran propose.
vi.mock('@/features/competitor-locator/actions/confirm-competitor-address', () => ({
  confirmCompetitorAddress: async () => ({ ok: true }),
}));
vi.mock('@/features/competitor-mandate/actions/set-competitor-mandate', () => ({
  setCompetitorMandate: async () => ({ ok: true }),
}));
vi.mock('@/features/prospecting/actions/add-prospecting-opposition', () => ({
  addProspectingOpposition: async () => ({ ok: true }),
}));
vi.mock('@/features/prospecting/actions/set-prospecting-status', () => ({
  setProspectingStatus: async () => ({ ok: true }),
  markLettersHanded: async () => ({ ok: true }),
}));

import { ProspectingList } from '@/features/competitor-locator/components/prospecting-list';
import { ProspectingCard } from '@/features/prospecting/components/prospecting-card';
import { groupProspecting } from '@/features/prospecting/services/group-prospecting';
import { addressed, entry } from '@/features/prospecting/services/test-cards';

const REQUESTED = '2026-10-11T09:00:00.000Z';
const ADDRESS = '8 avenue du Docteur Hochet, 06160 Antibes';

// Mission 102 — à l'écran, un bien « Ne plus solliciter » ne propose plus de corriger son adresse.
describe('« Corriger l’adresse » disparaît d’un bien opposé', () => {
  it('sur la liste d’un dossier', () => {
    const list = (opposedOn: string | null) =>
      renderToStaticMarkup(
        createElement(ProspectingList, {
          rows: [addressed('c1', ADDRESS, { opposedOn })],
          filesProjectId: 'p1',
        }),
      );
    expect(list(null)).toContain('Corriger l’adresse');
    const opposed = list(REQUESTED);
    expect(opposed).toContain('Ne plus solliciter (demandé le 11/10)');
    expect(opposed).not.toContain('Corriger l’adresse');
    expect(opposed).not.toContain('Saisir l’adresse');
    expect(opposed).not.toContain('C’est la bonne adresse');
  });

  it('sur la carte de Prospection', () => {
    const card = (opposedOn: string | null) =>
      renderToStaticMarkup(
        createElement(ProspectingCard, {
          card: groupProspecting([entry('martin', addressed('c1', ADDRESS, { opposedOn }))])[0],
        }),
      );
    expect(card(null)).toContain('Corriger l’adresse');
    const opposed = card(REQUESTED);
    expect(opposed).toContain('Ne plus solliciter (demandé le 11/10)');
    expect(opposed).not.toContain('Corriger l’adresse');
  });
});

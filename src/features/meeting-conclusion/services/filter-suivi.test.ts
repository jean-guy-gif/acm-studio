import { describe, expect, it } from 'vitest';

import type { SuiviDossier } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import { filterSuiviByIssue } from '@/features/meeting-conclusion/services/filter-suivi';
import type { ConclusionOutcome } from '@/features/meeting-conclusion/types';

function dossier(id: string, outcome: ConclusionOutcome): SuiviDossier {
  return {
    project: { id, seller_name: id } as unknown as SuiviDossier['project'],
    property: null,
    conclusion: {
      marketComputed: null,
      advisorAnalysis: null,
      advisorPrice: null,
      commercializationPrice: null,
      outcome,
      followUpReason: null,
      concludedAt: null,
      outcomeChangedAt: null,
    },
  };
}

describe('filterSuiviByIssue (§6.3) — le filtre rend exactement l’issue ; « Tous » rend tout', () => {
  const all = [
    dossier('a', 'signed'),
    dossier('b', 'follow_up'),
    dossier('c', 'sold_elsewhere'),
    dossier('d', 'withdrawn'),
    dossier('e', 'signed'),
  ];

  it('rend exactement les dossiers de l’issue filtrée', () => {
    expect(filterSuiviByIssue(all, 'signed').map((d) => d.project.id)).toEqual(['a', 'e']);
    expect(filterSuiviByIssue(all, 'follow_up').map((d) => d.project.id)).toEqual(['b']);
    expect(filterSuiviByIssue(all, 'sold_elsewhere').map((d) => d.project.id)).toEqual(['c']);
    expect(filterSuiviByIssue(all, 'withdrawn').map((d) => d.project.id)).toEqual(['d']);
  });

  it('« Tous » (null) rend tous les dossiers, aucun masqué', () => {
    expect(filterSuiviByIssue(all, null)).toHaveLength(5);
  });
});

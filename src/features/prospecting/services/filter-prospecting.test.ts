import { describe, expect, it } from 'vitest';

import {
  filterProspecting,
  parseProspectingTarget,
  parseSellerFilter,
  prospectionHref,
} from '@/features/prospecting/services/filter-prospecting';
import type { ProspectingEntry } from '@/features/prospecting/types';

function entry(id: string, sellerId: string, step: 'colleague' | 'owner' | 'check') {
  return {
    seller: { projectId: sellerId, name: sellerId, label: null },
    row: { id, step },
  } as ProspectingEntry;
}

const ENTRIES = [
  entry('a', 'antibes', 'owner'),
  entry('b', 'antibes', 'colleague'),
  entry('c', 'vence', 'check'),
  entry('d', 'vence', 'owner'),
];
const ids = (entries: ProspectingEntry[]) => entries.map((item) => item.row.id);

describe('filterProspecting', () => {
  it('sans filtre, rend tout', () => {
    expect(ids(filterProspecting(ENTRIES, null, 'all'))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('filtre sur un bien vendeur', () => {
    expect(ids(filterProspecting(ENTRIES, 'antibes', 'all'))).toEqual(['a', 'b']);
  });

  it('confrères ou propriétaires ; « à vérifier » reste dans les deux', () => {
    expect(ids(filterProspecting(ENTRIES, null, 'colleagues'))).toEqual(['b', 'c']);
    expect(ids(filterProspecting(ENTRIES, null, 'owners'))).toEqual(['a', 'c', 'd']);
  });

  it('cumule les deux filtres', () => {
    expect(ids(filterProspecting(ENTRIES, 'vence', 'owners'))).toEqual(['c', 'd']);
  });
});

describe('filtres lus dans l’adresse', () => {
  it('un filtre inconnu retombe sur « tout »', () => {
    expect(parseProspectingTarget('owners')).toBe('owners');
    expect(parseProspectingTarget('nimporte')).toBe('all');
    expect(parseProspectingTarget(undefined)).toBe('all');
  });

  it('un bien vendeur qui n’est pas un mandat signé de l’agence n’est pas un filtre', () => {
    const sellers = [{ projectId: 'antibes' }];
    expect(parseSellerFilter('antibes', sellers)).toBe('antibes');
    expect(parseSellerFilter('ailleurs', sellers)).toBeNull();
    expect(parseSellerFilter(undefined, sellers)).toBeNull();
  });

  it('écrit l’adresse de la page filtrée', () => {
    expect(prospectionHref(null, 'all')).toBe('/prospection');
    expect(prospectionHref('antibes', 'all')).toBe('/prospection?bien=antibes');
    expect(prospectionHref('antibes', 'owners')).toBe('/prospection?bien=antibes&cible=owners');
  });
});

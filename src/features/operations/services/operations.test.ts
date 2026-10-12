import { describe, expect, it } from 'vitest';

import {
  errorsBadgeLabel,
  errorSourceLabel,
  groupErrors,
  type AppErrorRow,
} from '@/features/operations/services/group-errors';
import { isOperatorEmail, operatorEmails } from '@/features/operations/services/operators';

describe('comptes autorisés (mission 100)', () => {
  const LIST = ' Laurent@Start-Academy.fr , support@example.org,, pas-une-adresse ';

  it('lit la liste de la variable d’environnement, sans casse ni espaces', () => {
    expect(operatorEmails(LIST)).toEqual(['laurent@start-academy.fr', 'support@example.org']);
  });

  it('reconnaît une adresse de la liste, et elle seule', () => {
    expect(isOperatorEmail('laurent@start-academy.fr', LIST)).toBe(true);
    expect(isOperatorEmail(' LAURENT@start-academy.fr ', LIST)).toBe(true);
    expect(isOperatorEmail('conseiller@agence.fr', LIST)).toBe(false);
    expect(isOperatorEmail('laurent@start-academy.fr.evil.com', LIST)).toBe(false);
    expect(isOperatorEmail('pas-une-adresse', LIST)).toBe(false);
  });

  it('sans variable, personne', () => {
    for (const raw of [undefined, '', ' , ']) {
      expect(operatorEmails(raw)).toEqual([]);
      expect(isOperatorEmail('laurent@start-academy.fr', raw)).toBe(false);
      expect(isOperatorEmail('', raw)).toBe(false);
      expect(isOperatorEmail(null, raw)).toBe(false);
    }
  });
});

describe('groupErrors', () => {
  const row = (overrides: Partial<AppErrorRow>): AppErrorRow => ({
    created_at: '2026-10-12T08:00:00Z',
    agency_id: 'a1',
    source: 'server',
    page: '/builder',
    message: 'fetch failed',
    version: 'abc1234def',
    ...overrides,
  });
  const names = new Map([
    ['a1', 'Agence Martin'],
    ['a2', 'Agence Durand'],
  ]);

  it('regroupe par message : nombre, agences touchées, dernière occurrence', () => {
    const groups = groupErrors(
      [
        row({ created_at: '2026-10-10T08:00:00Z', page: '/suivi', version: 'old' }),
        row({
          created_at: '2026-10-12T09:00:00Z',
          agency_id: 'a2',
          source: 'live',
          page: '/live/[id]',
        }),
        row({ created_at: '2026-10-11T08:00:00Z' }),
        row({ message: 'autre panne', created_at: '2026-10-12T10:00:00Z', agency_id: null }),
      ],
      names,
    );
    expect(groups).toEqual([
      {
        message: 'autre panne',
        count: 1,
        agencies: [],
        unknownAgency: true,
        lastAt: '2026-10-12T10:00:00Z',
        lastPage: '/builder',
        lastVersion: 'abc1234def',
        sources: ['server'],
      },
      {
        message: 'fetch failed',
        count: 3,
        agencies: ['Agence Durand', 'Agence Martin'],
        unknownAgency: false,
        lastAt: '2026-10-12T09:00:00Z',
        lastPage: '/live/[id]',
        lastVersion: 'abc1234def',
        sources: ['live', 'server'],
      },
    ]);
  });

  it('une agence supprimée depuis compte comme inconnue, jamais comme un identifiant affiché', () => {
    const [group] = groupErrors([row({ agency_id: 'disparue' })], names);
    expect(group.agencies).toEqual([]);
    expect(group.unknownAgency).toBe(true);
  });

  it('sans erreur, aucun groupe', () => {
    expect(groupErrors([], names)).toEqual([]);
  });
});

describe('libellés', () => {
  it('la pastille s’accorde', () => {
    expect(errorsBadgeLabel(1)).toBe('1 erreur depuis hier');
    expect(errorsBadgeLabel(12)).toBe('12 erreurs depuis hier');
  });

  it('l’origine se dit en français', () => {
    expect(errorSourceLabel('server')).toBe('Serveur');
    expect(errorSourceLabel('browser')).toBe('Navigateur');
    expect(errorSourceLabel('live')).toBe('Live');
  });
});

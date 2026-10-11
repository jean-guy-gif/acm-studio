import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { archiveProject, type ArchiveClient } from '@/features/projects/services/archive-project';

type Call = { method: string; args: unknown[] };

function fakeClient(error: unknown = null): { client: ArchiveClient; calls: Call[] } {
  const calls: Call[] = [];
  const filter = {
    eq(column: string, value: string) {
      calls.push({ method: 'eq', args: [column, value] });
      return filter;
    },
    neq(column: string, value: string) {
      calls.push({ method: 'neq', args: [column, value] });
      return Promise.resolve({ error });
    },
  };
  const client = {
    from(table: string) {
      calls.push({ method: 'from', args: [table] });
      return {
        update(values: unknown) {
          calls.push({ method: 'update', args: [values] });
          return filter;
        },
        delete() {
          calls.push({ method: 'delete', args: [] });
          return filter;
        },
      };
    },
  };
  return { client: client as unknown as ArchiveClient, calls };
}

describe('« Supprimer » un dossier l’archive (mission 93)', () => {
  it('écrit le statut `archived`, et ne supprime rien', async () => {
    const { client, calls } = fakeClient();
    const result = await archiveProject(
      client,
      'agence',
      'dossier',
      new Date('2026-10-12T08:00:00Z'),
    );
    expect(result).toEqual({ ok: true });
    expect(calls).toEqual([
      { method: 'from', args: ['projects'] },
      { method: 'update', args: [{ status: 'archived', updated_at: '2026-10-12T08:00:00.000Z' }] },
      { method: 'eq', args: ['id', 'dossier'] },
      { method: 'eq', args: ['agency_id', 'agence'] },
      { method: 'neq', args: ['status', 'archived'] },
    ]);
    expect(calls.some((call) => call.method === 'delete')).toBe(false);
  });

  it('dit quand l’écriture a échoué', async () => {
    const { client } = fakeClient({ message: 'refusé' });
    expect(await archiveProject(client, 'agence', 'dossier')).toEqual({ ok: false });
  });

  it('l’action ne supprime plus le dossier ni les photos de prospection', () => {
    const action = readFileSync(
      join(process.cwd(), 'src', 'features', 'projects', 'actions', 'archive-project.ts'),
      'utf8',
    );
    expect(action).toContain('archiveProject(');
    expect(action).not.toMatch(/\.delete\(\)/);
    expect(action).not.toMatch(/removeProjectCompetitorPhotos|\.storage/);
  });

  it('un dossier archivé ne s’ouvre plus par son adresse', () => {
    const query = readFileSync(
      join(process.cwd(), 'src', 'features', 'projects', 'queries', 'get-project.ts'),
      'utf8',
    );
    expect(query).toMatch(/\.neq\('status', ARCHIVED_STATUS\)/);
  });
});

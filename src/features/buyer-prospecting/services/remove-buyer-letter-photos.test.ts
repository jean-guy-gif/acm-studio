import { describe, expect, it } from 'vitest';

import {
  buyerLetterFolder,
  buyerLetterOriginsOf,
  removeBuyerLetterPhotos,
} from '@/features/buyer-prospecting/services/remove-buyer-letter-photos';
import type { PhotoStorage } from '@/features/prospecting-file/services/remove-their-photos';

// Mission 120 — les photos des courriers d'une recherche acquéreur partent du stockage avec leur
// origine, comme celles d'un concurrent (M93).
const ORIGIN = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

function fakeStorage(files: Record<string, string[]>) {
  const removed: string[] = [];
  const storage: PhotoStorage = {
    from: () => ({
      list: async (path: string) => ({
        data: (files[path] ?? []).map((name, index) => ({ name, id: `f${index}` })),
        error: null,
      }),
      remove: async (paths: string[]) => {
        removed.push(...paths);
        return { error: null };
      },
    }),
  };
  return { storage, removed };
}

describe('les photos des courriers d’une recherche acquéreur', () => {
  it('vide le dossier de chaque origine, sous l’agence, et ignore un identifiant douteux', async () => {
    const { storage, removed } = fakeStorage({
      [buyerLetterFolder('agency-a', ORIGIN)]: ['a.jpg', 'b.jpg'],
      [buyerLetterFolder('agency-a', OTHER)]: ['c.jpg'],
    });
    expect(await removeBuyerLetterPhotos(storage, 'agency-a', [ORIGIN, '../x', ORIGIN])).toBe(2);
    expect(removed).toEqual([
      `agency-a/buyer-prospecting/${ORIGIN}/a.jpg`,
      `agency-a/buyer-prospecting/${ORIGIN}/b.jpg`,
    ]);
  });

  it('lit les origines des concurrents ou des fiches, dans l’agence, avant la cascade', async () => {
    const calls: unknown[] = [];
    const reader = {
      from: () => ({
        select: () => ({
          eq: (column: string, value: string) => ({
            in: async (field: string, values: string[]) => {
              calls.push([column, value, field, values]);
              return { data: [{ id: ORIGIN }] };
            },
          }),
        }),
      }),
    };
    expect(
      await buyerLetterOriginsOf(reader as never, 'agency-a', {
        comparableIds: [OTHER, 'pas-un-id'],
      }),
    ).toEqual([ORIGIN]);
    expect(calls).toEqual([['agency_id', 'agency-a', 'comparable_id', [OTHER]]]);
    expect(await buyerLetterOriginsOf(reader as never, 'agency-a', { buyerIds: [] })).toEqual([]);
    expect(calls).toHaveLength(1);
  });
});

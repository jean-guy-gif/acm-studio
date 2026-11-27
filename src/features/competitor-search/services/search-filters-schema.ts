import { z } from 'zod';

import {
  OUTDOOR_CHOICES,
  type ReadFiltersResult,
  type SearchFiltersInput,
} from '@/features/competitor-search/services/search-filters';
import { DPE_CLASSES } from '@/features/dpe/services/dpe';

// Mission 128 B — la validation des critères (M110), seule partie qui a besoin de zod : la forme,
// les nombres et ce que le formulaire envoie, relus ici. Le reste (`search-filters.ts`) est pur et
// se lit dans le navigateur sans zod. Pur.

const nonEmptyUnique = <T extends string>(values: readonly [T, ...T[]]) =>
  z
    .array(z.enum(values))
    .min(1)
    .refine((list) => new Set(list).size === list.length);

export const searchFiltersSchema = z.object({
  dpe: nonEmptyUnique(DPE_CLASSES).nullable(),
  minFloor: z.number().int().min(0).max(60).nullable(),
  outdoor: nonEmptyUnique(OUTDOOR_CHOICES).nullable(),
  minLand: z.number().int().min(1).max(1_000_000).nullable(),
  pool: z.boolean(),
});

const digits = (text: string): string => text.replace(/[\s  m²]/g, '');

function readWhole(text: string, label: string, min: number): number | null | { error: string } {
  const value = digits(text);
  if (value === '') return null;
  if (!/^\d+$/.test(value) || Number(value) < min) {
    return { error: `${label}\u00a0: un nombre entier${min > 0 ? ` d'au moins ${min}` : ''}.` };
  }
  return Number(value);
}

export function readSearchFiltersInput(input: SearchFiltersInput): ReadFiltersResult {
  const minFloor = readWhole(input.minFloor, 'Étage minimum', 0);
  if (typeof minFloor === 'object' && minFloor != null) return { ok: false, error: minFloor.error };
  const minLand = readWhole(input.minLand, 'Terrain minimum', 1);
  if (typeof minLand === 'object' && minLand != null) return { ok: false, error: minLand.error };
  const parsed = searchFiltersSchema.safeParse({
    dpe: input.dpe.length > 0 ? DPE_CLASSES.filter((value) => input.dpe.includes(value)) : null,
    minFloor,
    outdoor:
      input.outdoor.length > 0
        ? OUTDOOR_CHOICES.filter((value) => input.outdoor.includes(value))
        : null,
    minLand,
    pool: input.pool,
  });
  return parsed.success
    ? { ok: true, filters: parsed.data }
    : { ok: false, error: 'Critères non reconnus\u00a0: vérifiez les valeurs saisies.' };
}

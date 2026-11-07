import { z } from 'zod';

import type { SourceBlock } from '@/features/address-dossier/types';
import type { LivingHereBlocks } from '@/features/living-here/types';

// Mission 142 — la fiche « Vivre ici », relue par liste d'autorisation à l'écriture comme à la
// lecture (M101) : un champ inconnu ne passe pas (jamais une adresse), une source illisible se lit
// « en panne », jamais « rien ».

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const instant = z.string().min(10).max(40);
const name = z.string().trim().min(1).max(120);
const minutes = z.number().int().min(1).max(600);

const place = z.object({
  category: z.enum([
    'bakery',
    'supermarket',
    'pharmacy',
    'doctor',
    'nursery_school',
    'primary_school',
    'middle_school',
    'high_school',
    'transit',
    'green_space',
  ]),
  name: name.nullable(),
  walkMinutes: minutes,
});

const daily = z.object({ places: z.array(place).max(12) });
const moves = z.object({
  transit: place.nullable(),
  drives: z
    .array(z.object({ kind: z.enum(['tgv_station', 'airport', 'town_centre']), name, minutes }))
    .max(3),
});
const surroundings = z.object({ green: place.nullable() });
const risks = z.object({
  riskCodes: z.array(z.string().regex(/^\d{2}$/)).max(20),
  seismicZone: z
    .string()
    .regex(/^[1-5]$/)
    .nullable(),
  clay: z.enum(['low', 'medium', 'high']).nullable(),
});

function block<T extends z.ZodType>(data: T) {
  return z.discriminatedUnion('state', [
    z.object({
      state: z.literal('ok'),
      readAt: instant,
      sourceDate: day.nullable(),
      data,
      failedAt: instant.optional(),
    }),
    z.object({ state: z.literal('empty'), readAt: instant, sourceDate: day.nullable() }),
    z.object({ state: z.literal('unavailable'), readAt: instant }),
  ]);
}

const schemas = {
  daily: block(daily),
  schools: block(daily),
  moves: block(moves),
  surroundings: block(surroundings),
  risks: block(risks),
};

export function readLivingHereBlocks(value: unknown, builtAt: string): LivingHereBlocks {
  const record =
    value != null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const one = <K extends keyof LivingHereBlocks>(key: K): LivingHereBlocks[K] => {
    const parsed = schemas[key].safeParse(record[key]);
    return (parsed.success
      ? parsed.data
      : { state: 'unavailable', readAt: builtAt }) as SourceBlock<unknown> as LivingHereBlocks[K];
  };
  return {
    daily: one('daily'),
    schools: one('schools'),
    moves: one('moves'),
    surroundings: one('surroundings'),
    risks: one('risks'),
  };
}

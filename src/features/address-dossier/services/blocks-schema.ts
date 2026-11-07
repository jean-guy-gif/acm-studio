import { z } from 'zod';

import type { DossierBlocks, SourceBlock } from '@/features/address-dossier/types';

// Mission 141 — le contenu du dossier d'adresse, relu par liste d'autorisation, à l'écriture comme
// à la lecture (M101) : un champ inconnu ne passe pas, une source illisible se lit « en panne »,
// jamais « rien trouvé ».

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const instant = z.string().min(10).max(40);
const short = z.string().trim().min(1).max(200);
const positive = z.number().finite().positive();
const count = z.number().int().nonnegative();
const note = z.enum(['street_only', 'parcel_undetermined', 'not_a_house_or_apartment']);

const sale = z.object({
  date: day,
  price: positive,
  surface: positive,
  pricePerM2: positive,
  rooms: count.nullable(),
  distanceM: z.number().finite().nonnegative(),
});

const salesData = z.object({
  propertyType: z.enum(['house', 'apartment']),
  radiusM: z.union([z.literal(500), z.literal(1000)]),
  count,
  stats: z.object({ count, median: positive, q1: positive, q3: positive }).nullable(),
  recent: z.array(sale).max(50),
  latestSaleDate: day.nullable(),
});

const letter = z.string().regex(/^[A-G]$/);
const dpeData = z.object({
  date: day,
  energy: letter,
  ges: letter.nullable(),
  surface: positive.nullable(),
  buildingType: z.enum(['maison', 'appartement', 'immeuble']).nullable(),
  count,
});

const risksData = z.object({
  communeRisks: z.array(short).max(30),
  seismicZone: short.nullable(),
  radonClass: z.enum(['1', '2', '3']).nullable(),
  clayExposure: short.nullable(),
  pollutedSites: count,
  groundMovements: count,
});

const urbanismData = z.object({
  zone: z.object({ code: short, label: short.nullable() }).nullable(),
  servitudes: z.array(z.object({ code: short, label: short, name: short.nullable() })).max(20),
});

const parcelData = z.object({ section: short, number: short, area: positive.nullable() });

const condoData = z.object({
  name: short.nullable(),
  lots: count.nullable(),
  housingLots: count.nullable(),
  period: short.nullable(),
  syndic: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('professional'), name: short.nullable() }),
    z.object({ kind: z.literal('volunteer') }),
    z.object({ kind: z.literal('unknown') }),
  ]),
  updatedOn: day.nullable(),
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
    z.object({
      state: z.literal('empty'),
      readAt: instant,
      sourceDate: day.nullable(),
      note: note.optional(),
    }),
    z.object({ state: z.literal('unavailable'), readAt: instant }),
  ]);
}

const schemas = {
  sales: block(salesData),
  dpe: block(dpeData),
  risks: block(risksData),
  urbanism: block(urbanismData),
  parcel: block(parcelData),
  condo: block(condoData),
};

// Une source que la ligne ne porte pas, ou illisible, se lit « en panne » à la date de construction.
export function readBlocks(value: unknown, builtAt: string): DossierBlocks {
  const record =
    value != null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const one = <K extends keyof DossierBlocks>(key: K): DossierBlocks[K] => {
    const parsed = schemas[key].safeParse(record[key]);
    return (parsed.success
      ? parsed.data
      : { state: 'unavailable', readAt: builtAt }) as SourceBlock<unknown> as DossierBlocks[K];
  };
  return {
    sales: one('sales'),
    dpe: one('dpe'),
    risks: one('risks'),
    urbanism: one('urbanism'),
    parcel: one('parcel'),
    condo: one('condo'),
  };
}

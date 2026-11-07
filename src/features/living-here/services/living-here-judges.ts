import { z } from 'zod';

import { UnexpectedResponse } from '@/features/address-dossier/services/judges';
import type { Candidate } from '@/features/living-here/services/living-here-rules';
import type { PlaceCategory, RisksLine } from '@/features/living-here/types';

// Mission 142 — les réponses des sources publiques, jugées. Partie PURE : ce qui n'a pas la forme
// attendue lève une erreur (la source est dite en panne, jamais lue comme « rien »).

function parse<T>(schema: z.ZodType<T>, json: unknown, source: string): T {
  const result = schema.safeParse(json);
  if (!result.success) throw new UnexpectedResponse(`${source} : réponse inattendue`);
  return result.data;
}

const point = z.object({ lat: z.number(), lon: z.number() });
const overpassSchema = z.object({
  elements: z.array(
    z.object({
      lat: z.number().optional(),
      lon: z.number().optional(),
      center: point.optional(),
      tags: z.record(z.string(), z.string()).optional(),
    }),
  ),
});

// La catégorie d'un lieu d'OpenStreetMap, par ses étiquettes ; null s'il n'en est pas une.
export function osmCategory(tags: Record<string, string>): PlaceCategory | null {
  if (tags.shop === 'bakery') return 'bakery';
  if (tags.shop === 'supermarket') return 'supermarket';
  if (tags.amenity === 'pharmacy') return 'pharmacy';
  if (tags.amenity === 'doctors' || tags.healthcare === 'doctor') return 'doctor';
  if (tags.highway === 'bus_stop' || tags.railway === 'station' || tags.railway === 'tram_stop') {
    return 'transit';
  }
  if (tags.leisure === 'park' || tags.leisure === 'garden') return 'green_space';
  return null;
}

// Un nom public court : jamais une adresse (les étiquettes `addr:*` ne sont jamais lues).
const cleanName = (value: string | undefined): string | null => {
  const trimmed = value?.replace(/\s+/g, ' ').trim();
  return trimmed ? trimmed.slice(0, 120) : null;
};

export function judgeOverpass(json: unknown): Candidate[] {
  const { elements } = parse(overpassSchema, json, 'OpenStreetMap');
  const candidates: Candidate[] = [];
  for (const element of elements) {
    const tags = element.tags ?? {};
    const category = osmCategory(tags);
    const at =
      element.lat != null && element.lon != null
        ? { lat: element.lat, lon: element.lon }
        : (element.center ?? null);
    if (!category || !at) continue;
    candidates.push({ category, name: cleanName(tags.name), point: at });
  }
  return candidates;
}

const schoolsSchema = z.object({
  results: z.array(
    z.object({
      nom_etablissement: z.string().nullable().optional(),
      libelle_nature: z.string().nullable().optional(),
      type_etablissement: z.string().nullable().optional(),
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional(),
    }),
  ),
});

// La catégorie d'un établissement de l'annuaire de l'Éducation nationale, par sa nature.
export function schoolCategory(nature: string | null | undefined): PlaceCategory | null {
  const text = (nature ?? '').toUpperCase();
  if (text.includes('MATERNELLE')) return 'nursery_school';
  if (text.includes('ELEMENTAIRE') || text.includes('PRIMAIRE')) return 'primary_school';
  if (text.startsWith('COLLEGE')) return 'middle_school';
  if (text.startsWith('LYCEE')) return 'high_school';
  return null;
}

export function judgeSchools(json: unknown): Candidate[] {
  const { results } = parse(schoolsSchema, json, 'Annuaire de l’Éducation nationale');
  return results.flatMap((row): Candidate[] => {
    const category = schoolCategory(row.libelle_nature);
    if (!category || row.latitude == null || row.longitude == null) return [];
    return [
      {
        category,
        name: cleanName(row.nom_etablissement ?? undefined),
        point: { lat: row.latitude, lon: row.longitude },
      },
    ];
  });
}

const routeSchema = z.object({
  duration: z.number().nonnegative(),
  timeUnit: z.string().optional(),
});

// La durée d'un itinéraire de l'IGN, en secondes.
export function judgeRoute(json: unknown): number {
  const route = parse(routeSchema, json, 'Itinéraire IGN');
  const unit = route.timeUnit ?? 'second';
  if (unit === 'second') return route.duration;
  if (unit === 'minute') return route.duration * 60;
  if (unit === 'hour') return route.duration * 3600;
  throw new UnexpectedResponse('Itinéraire IGN : unité inattendue');
}

const gasparSchema = z.object({
  data: z.array(z.object({ risques_detail: z.array(z.object({ num_risque: z.string() })) })),
});
const seismicSchema = z.object({
  data: z.array(z.object({ code_zone: z.string().optional(), code_insee: z.string().optional() })),
});
const claySchema = z.object({ codeExposition: z.string().nullable().optional() });

const CLAY: Record<string, RisksLine['clay']> = { '1': 'low', '2': 'medium', '3': 'high' };

// Les risques de la commune en une ligne : leurs codes, la zone sismique de la commune, l'exposition
// aux argiles au point ; le reste du dossier d'adresse (ventes, PLU, parcelle) n'y entre jamais.
export function judgeRisksLine(
  responses: { gaspar: unknown; seismic: unknown; clay: unknown },
  inseeCode: string,
): RisksLine {
  const gaspar = parse(gasparSchema, responses.gaspar, 'Géorisques (risques)');
  const seismic = parse(seismicSchema, responses.seismic, 'Géorisques (sismicité)');
  const clay = parse(claySchema, responses.clay, 'Géorisques (argiles)');
  const codes = [
    ...new Set(
      gaspar.data
        .flatMap((row) => row.risques_detail.map((risk) => risk.num_risque))
        .filter((code) => /^\d{2}$/.test(code)),
    ),
  ];
  const zone = seismic.data.find((row) => row.code_insee === inseeCode)?.code_zone ?? null;
  return {
    riskCodes: codes,
    seismicZone: zone && /^[1-5]$/.test(zone) ? zone : null,
    clay: CLAY[clay.codeExposition ?? ''] ?? null,
  };
}

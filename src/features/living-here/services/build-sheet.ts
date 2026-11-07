import { readSource } from '@/features/address-dossier/services/build-blocks';
import type { GeoPoint } from '@/features/competitor-search/types';
import { distanceMeters } from '@/features/competitor-search/services/proximity';
import { AIRPORTS } from '@/features/living-here/data/airports';
import { TGV_STATIONS } from '@/features/living-here/data/tgv-stations';
import {
  minutesOf,
  nearestByCategory,
  type Candidate,
} from '@/features/living-here/services/living-here-rules';
import {
  DAILY_CATEGORIES,
  SCHOOL_CATEGORIES,
  type DailyData,
  type Drive,
  type LivingHereBlocks,
  type MovesData,
  type NearbyPlace,
  type RisksLine,
  type SchoolsData,
  type SurroundingsData,
} from '@/features/living-here/types';

// Mission 142 — « Vivre ici », source par source, depuis le point de départ. Les lectures sont
// données par l'appelant (les services publics, ou le jeu figé de la démo) ; une source en panne
// n'empêche pas les autres et garde sa dernière lecture datée (le patron de la M141).

export type LivingHereReaders = {
  // Commerces, santé, arrêts, espaces verts (OpenStreetMap), à 2 km au plus.
  places: (from: GeoPoint) => Promise<Candidate[]>;
  // Écoles, collèges, lycées (annuaire de l'Éducation nationale), à 3 km au plus.
  schools: (from: GeoPoint) => Promise<Candidate[]>;
  // Les itinéraires de l'IGN, en secondes (décision du 07/11 : à pied et en voiture).
  walkSeconds: (from: GeoPoint, to: GeoPoint) => Promise<number>;
  driveSeconds: (from: GeoPoint, to: GeoPoint) => Promise<number>;
  risks: (from: GeoPoint, inseeCode: string) => Promise<RisksLine>;
  // La position du lieu de l'acquéreur (texte libre) ; null s'il n'est pas trouvé avec certitude.
  locate: (place: string) => Promise<GeoPoint | null>;
};

export type SheetContext = {
  from: GeoPoint;
  inseeCode: string;
  commune: string;
  communeCentre: GeoPoint | null;
};

const DAILY_REACH_M = 2_000;
const SCHOOL_REACH_M = 3_000;
const TRANSIT_REACH_M = 1_000;
const GREEN_REACH_M = 1_500;
// Le centre-ville n'a de sens qu'à plus de 400 m.
const TOWN_CENTRE_MIN_M = 400;

async function walked(
  from: GeoPoint,
  nearest: Map<string, Candidate & { distanceM: number }>,
  reach: number,
  readers: LivingHereReaders,
): Promise<NearbyPlace[]> {
  const kept = [...nearest.values()].filter((candidate) => candidate.distanceM <= reach);
  return Promise.all(
    kept.map(async (candidate) => ({
      category: candidate.category,
      name: candidate.name,
      walkMinutes: minutesOf(await readers.walkSeconds(from, candidate.point)),
    })),
  );
}

function nearestOf<T extends { lat: number; lon: number }>(
  from: GeoPoint,
  list: readonly T[],
): T | null {
  let best: T | null = null;
  let bestDistance = Infinity;
  for (const item of list) {
    const distance = distanceMeters(from, item);
    if (distance < bestDistance) {
      best = item;
      bestDistance = distance;
    }
  }
  return best;
}

export async function buildSheetBlocks(input: {
  context: SheetContext;
  readers: LivingHereReaders;
  previous: LivingHereBlocks | null;
  now: Date;
}): Promise<{
  blocks: LivingHereBlocks;
  failures: { source: keyof LivingHereBlocks; error: unknown }[];
}> {
  const { context, readers, previous } = input;
  const { from } = context;
  const readAt = input.now.toISOString();
  const failures: { source: keyof LivingHereBlocks; error: unknown }[] = [];
  const failed = (source: keyof LivingHereBlocks) => (error: unknown) =>
    failures.push({ source, error });
  // Une seule lecture d'OpenStreetMap pour les commerces, les arrêts et les espaces verts.
  const places = readers.places(from);
  places.catch(() => undefined);

  const [daily, schools, moves, surroundings, risks] = await Promise.all([
    readSource<DailyData>(
      readAt,
      previous?.daily,
      async () => {
        const nearest = nearestByCategory(from, await places, DAILY_CATEGORIES);
        const found = await walked(from, nearest, DAILY_REACH_M, readers);
        return { data: found.length > 0 ? { places: found } : null, sourceDate: null };
      },
      failed('daily'),
    ),
    readSource<SchoolsData>(
      readAt,
      previous?.schools,
      async () => {
        const nearest = nearestByCategory(from, await readers.schools(from), SCHOOL_CATEGORIES);
        const found = await walked(from, nearest, SCHOOL_REACH_M, readers);
        return { data: found.length > 0 ? { places: found } : null, sourceDate: null };
      },
      failed('schools'),
    ),
    readSource<MovesData>(
      readAt,
      previous?.moves,
      async () => {
        const transitNearest = nearestByCategory(from, await places, ['transit']);
        const [transit] = await walked(from, transitNearest, TRANSIT_REACH_M, readers);
        const station = nearestOf(from, TGV_STATIONS);
        const airport = nearestOf(from, AIRPORTS);
        const targets: { kind: Drive['kind']; name: string; point: GeoPoint }[] = [];
        if (station) targets.push({ kind: 'tgv_station', name: station.name, point: station });
        if (airport) targets.push({ kind: 'airport', name: airport.name, point: airport });
        if (
          context.communeCentre &&
          distanceMeters(from, context.communeCentre) > TOWN_CENTRE_MIN_M
        ) {
          targets.push({
            kind: 'town_centre',
            name: context.commune,
            point: context.communeCentre,
          });
        }
        const drives = await Promise.all(
          targets.map(async (target) => ({
            kind: target.kind,
            name: target.name,
            minutes: minutesOf(await readers.driveSeconds(from, target.point)),
          })),
        );
        return { data: { transit: transit ?? null, drives }, sourceDate: null };
      },
      failed('moves'),
    ),
    readSource<SurroundingsData>(
      readAt,
      previous?.surroundings,
      async () => {
        const nearest = nearestByCategory(from, await places, ['green_space']);
        const [green] = await walked(from, nearest, GREEN_REACH_M, readers);
        return { data: green ? { green } : null, sourceDate: null };
      },
      failed('surroundings'),
    ),
    readSource<RisksLine>(
      readAt,
      previous?.risks,
      async () => ({ data: await readers.risks(from, context.inseeCode), sourceDate: null }),
      failed('risks'),
    ),
  ]);
  return { blocks: { daily, schools, moves, surroundings, risks }, failures };
}

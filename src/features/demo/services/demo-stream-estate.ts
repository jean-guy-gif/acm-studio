import { distanceMeters } from '@/features/competitor-search/services/proximity';
import type { FetchStreamEstatePage } from '@/features/competitor-search/services/stream-estate-tiers';
import type { DemoListing } from '@/features/demo/data/types';
import { demoDelay } from '@/features/demo/services/demo-delay';
import { demoStreamEstateProperty } from '@/features/demo/services/demo-listing-data';

// Mission 114 — Stream Estate SIMULÉ : une page de résultats construite depuis le jeu de données,
// qui répond aux MÊMES paramètres que l'API (le socle, le secteur, les tranches, la page —
// stream-estate-tiers.ts) et dans la MÊME forme (un document « hydra » relu par le schéma zod de
// stream-estate.ts). La recherche par crans, le classement, l'empreinte du résultat gardé et
// « Chercher encore » ne voient aucune différence. Aucun appel, aucun budget : la réponse est
// locale, après le délai fixe de la démo.
//
// Ce que l'API fait, la simulation le fait : le rayon est IGNORÉ dès qu'on donne des codes INSEE
// (mesure du 06/10), les communes exclues sont retirées du cercle, une borne absente ne filtre
// pas, `energyCategories[]` écarte les biens sans classe (M110), tri par dernière mise à jour.

const HOUR_MS = 3_600_000;

const numberParam = (params: URLSearchParams, name: string): number | null => {
  const raw = params.get(name);
  if (raw == null || raw.trim() === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};

const within = (value: number | null, min: number | null, max: number | null): boolean =>
  value != null && (min == null || value >= min) && (max == null || value <= max);

function matches(
  listing: DemoListing,
  point: { lat: number; lon: number },
  params: URLSearchParams,
): boolean {
  const types = params.getAll('propertyTypes[]');
  const streamType = listing.propertyType === 'apartment' ? '0' : '1';
  if (types.length > 0 && !types.includes(streamType)) return false;

  const included = params.getAll('includedInseeCodes[]');
  if (included.length > 0) {
    if (!included.includes(listing.inseeCode)) return false;
  } else {
    const lat = numberParam(params, 'lat');
    const lon = numberParam(params, 'lon');
    const radiusKm = numberParam(params, 'radius');
    if (lat != null && lon != null && radiusKm != null) {
      if (distanceMeters({ lat, lon }, point) > radiusKm * 1000) return false;
      if (params.getAll('excludedInseeCodes[]').includes(listing.inseeCode)) return false;
    }
  }

  if (!within(listing.roomsCount, numberParam(params, 'roomMin'), numberParam(params, 'roomMax')))
    return false;
  if (
    !within(
      listing.surfaceArea,
      numberParam(params, 'surfaceMin'),
      numberParam(params, 'surfaceMax'),
    )
  )
    return false;
  if (!within(listing.price, numberParam(params, 'budgetMin'), numberParam(params, 'budgetMax')))
    return false;

  const energies = params.getAll('energyCategories[]');
  if (
    energies.length > 0 &&
    (listing.energyRating == null || !energies.includes(listing.energyRating))
  )
    return false;

  return true;
}

export type DemoStreamEstateOptions = {
  listings: readonly DemoListing[];
  now: Date;
  // Le délai fixe de la démo ; les tests passent `() => Promise.resolve()`.
  wait?: () => Promise<void>;
};

// Les biens d'une recherche simulée, dans l'ordre que l'API rend (dernière mise à jour d'abord) :
// le i-ème bien du jeu de données a été « revu » il y a i + 1 heures.
export function demoStreamEstatePage(options: DemoStreamEstateOptions): FetchStreamEstatePage {
  const { listings, now } = options;
  const wait = options.wait ?? (() => demoDelay());
  const members = listings.map((listing, index) =>
    demoStreamEstateProperty(
      listing,
      now,
      new Date(now.getTime() - (index + 1) * HOUR_MS).toISOString(),
    ),
  );
  return async (params) => {
    await wait();
    const kept = members.filter((_, index) =>
      matches(listings[index], listings[index].location, params),
    );
    const size = Math.max(1, numberParam(params, 'itemsPerPage') ?? 20);
    const page = Math.max(1, numberParam(params, 'page') ?? 1);
    const slice = kept.slice((page - 1) * size, page * size);
    return {
      ok: true,
      json: { 'hydra:totalItems': kept.length, 'hydra:member': slice },
    };
  };
}

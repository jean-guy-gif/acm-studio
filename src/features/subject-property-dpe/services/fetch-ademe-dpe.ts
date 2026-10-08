import 'server-only';

import { geocodeUrl } from '@/features/competitor-search/services/geocode-subject';
import {
  ademeDpeUrl,
  banHouseNumberId,
  chooseDpe,
} from '@/features/subject-property-dpe/services/ademe-dpe';
import type { DpeReading, DpeRequest } from '@/features/subject-property-dpe/types';

// Géocodage puis ADEME, 5 secondes en tout. Un service injoignable ou lent ne bloque rien et ne
// dit rien : le champ reste vide (mission 79, critère 5).
const TIMEOUT_MS = 5_000;
const ONE_DAY = 86_400;

async function getJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal, next: { revalidate: ONE_DAY } });
  if (!response.ok) throw new Error(`${new URL(url).hostname} ${response.status}`);
  return response.json();
}

export async function fetchOfficialDpe(request: DpeRequest): Promise<DpeReading> {
  const city = request.city.trim();
  const url = city === '' ? null : geocodeUrl(request.address, request.postal_code, city);
  if (url == null) return {};
  const surface = Number(request.surface_area.replace(',', '.'));
  try {
    const signal = AbortSignal.timeout(TIMEOUT_MS);
    const banId = banHouseNumberId(await getJson(url, signal), city);
    if (banId == null) return {};
    return chooseDpe(await getJson(ademeDpeUrl(banId), signal), {
      propertyType: request.property_type,
      surface: Number.isFinite(surface) && surface > 0 ? surface : null,
    });
  } catch (error) {
    console.error('[fetchOfficialDpe]', error instanceof Error ? error.message : error);
    return {};
  }
}

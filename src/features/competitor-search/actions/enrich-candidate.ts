'use server';

import { extractListingData } from '@/features/comparable-import/services/extract-listing-data';
import { fetchListingPage } from '@/features/comparable-import/services/fetch-listing-page';
import { normalizeListingData } from '@/features/comparable-import/services/normalize-listing-data';
import { detectSource } from '@/features/comparable-import/utils/detect-source';
import { isAllowedProtocol, normalizeUrl } from '@/features/comparable-import/utils/normalize-url';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Enrichissement d'une annonce proposée : photos et caractéristiques, pour que
// le conseiller tranche en connaissance de cause.
//
// Pourquoi une annonce à la fois : une page met une à trois secondes à revenir.
// Les enchaîner toutes dans une seule action dépasserait la limite d'exécution
// et l'écran resterait figé. Le navigateur en demande donc quelques-unes en
// parallèle et les fiches se remplissent au fur et à mesure.
//
// Aucune écriture : c'est de la lecture, et le conseiller n'a encore rien
// décidé. Le portail est interrogé par le même service que l'import (robots.txt
// respecté, identité déclarée, délai et taille bornés).

export type EnrichedCandidate = {
  url: string;
  photoUrls: string[];
  district: string | null;
  city: string | null;
  propertyType: string | null;
  surfaceArea: number | null;
  roomsCount: number | null;
  price: number | null;
  energyRating: string | null;
  outdoorSpaces: string[];
  parkingTypes: string[];
  listingFeatures: string[];
  daysOnMarket: number | null;
};

export type EnrichCandidateResult =
  { ok: true; data: EnrichedCandidate } | { ok: false; url: string; error: string };

const GENERIC_ERROR = 'Fiche non récupérée.';

export async function enrichCandidate(
  projectId: string,
  rawUrl: string,
): Promise<EnrichCandidateResult> {
  const url = normalizeUrl(rawUrl);
  if (!url || !isAllowedProtocol(url)) {
    return { ok: false, url: rawUrl, error: 'Adresse invalide.' };
  }

  const profile = await getProfile();
  if (!profile) {
    return { ok: false, url: url.href, error: GENERIC_ERROR };
  }

  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!project) {
    return { ok: false, url: url.href, error: GENERIC_ERROR };
  }

  const page = await fetchListingPage(url.href);
  if (!page.ok) {
    return { ok: false, url: url.href, error: page.error };
  }

  const source = detectSource(url.hostname);
  const { data } = normalizeListingData(
    extractListingData(page.html, page.finalUrl),
    page.finalUrl,
    source,
  );

  return {
    ok: true,
    data: {
      url: url.href,
      photoUrls: data.photoUrls.slice(0, 6),
      district: data.district,
      city: data.city,
      propertyType: null,
      surfaceArea: data.surfaceArea,
      roomsCount: data.roomsCount,
      price: data.price,
      energyRating: data.energyRating,
      outdoorSpaces: data.outdoorSpaces,
      parkingTypes: data.parkingTypes,
      listingFeatures: data.listingFeatures.slice(0, 8),
      daysOnMarket: data.daysOnMarket,
    },
  };
}

'use server';

import { loadSearchCriteria } from '@/features/competitor-search/queries/load-search-criteria';
import {
  geoCommunesUrl,
  pickInseeCode,
  type GeoCommune,
} from '@/features/competitor-search/services/resolve-insee-code';
import {
  buildStreamEstateQuery,
  parseStreamEstateResponse,
  STREAM_ESTATE_ENDPOINT,
} from '@/features/competitor-search/services/stream-estate';
import { streamEstateApiKey } from '@/features/competitor-search/services/stream-estate-config';
import {
  STREAM_ESTATE_LABEL,
  STREAM_ESTATE_SOURCE,
  type PortalSearchResult,
} from '@/features/competitor-search/types';

export type StreamEstateSearchResult =
  | {
      ok: true;
      portal: PortalSearchResult;
      billed: number; // annonces renvoyées = annonces facturées
      totalItems: number | null; // total annoncé par l'API pour ces critères
      unreadable: number;
      communeName: string;
      inseeCode: string;
    }
  | { ok: false; error: string };

const TIMEOUT_MS = 10_000;
const GENERIC_ERROR = 'La recherche Stream Estate a échoué. Réessayez.';

// ESSAI STREAM ESTATE — une recherche, une page, côté serveur. Les critères viennent du bien
// vendeur (jamais du client), la clé reste ici. On renvoie des CANDIDATS (même forme que ceux des
// portails) : le classement, les filtres et la décision restent ceux de l'écran. Rien n'est écrit.
export async function searchStreamEstate(projectId: string): Promise<StreamEstateSearchResult> {
  const apiKey = streamEstateApiKey();
  if (apiKey == null) {
    return { ok: false, error: 'L’essai Stream Estate n’est pas activé.' };
  }

  const loaded = await loadSearchCriteria(projectId);
  if (!loaded.ok) {
    return {
      ok: false,
      error:
        loaded.reason === 'no_city'
          ? 'Renseignez d’abord la ville du bien vendeur : la recherche se base sur sa commune.'
          : GENERIC_ERROR,
    };
  }
  const { criteria } = loaded;

  // 1. Le code INSEE de la commune — sans code fiable, on ne cherche pas.
  let communes: GeoCommune[];
  try {
    const response = await fetch(geoCommunesUrl(criteria.city, criteria.postalCode), {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`geo.api.gouv.fr ${response.status}`);
    communes = (await response.json()) as GeoCommune[];
    if (!Array.isArray(communes)) throw new Error('geo.api.gouv.fr : réponse inattendue');
  } catch (error) {
    console.error(
      '[searchStreamEstate] code INSEE',
      error instanceof Error ? error.message : error,
    );
    return {
      ok: false,
      error: 'Le code INSEE de la commune n’a pas pu être obtenu (geo.api.gouv.fr). Réessayez.',
    };
  }
  const commune = pickInseeCode(communes, criteria.city, criteria.postalCode);
  if (!commune.ok) {
    const where = [criteria.city, criteria.postalCode].filter(Boolean).join(' ');
    return {
      ok: false,
      error:
        commune.reason === 'arrondissements'
          ? `${criteria.city} est découpée en arrondissements chez Stream Estate : l’essai ne sait pas encore chercher par arrondissement. Aucune recherche lancée.`
          : `Pas de code INSEE fiable pour « ${where} » (${commune.reason === 'ambiguous' ? 'plusieurs communes possibles' : 'commune introuvable'}). Vérifiez la ville et le code postal du bien vendeur. Aucune recherche lancée.`,
    };
  }

  // 2. La recherche, une seule page.
  const query = buildStreamEstateQuery(criteria, commune.code, new Date());
  if (!query.ok) {
    return {
      ok: false,
      error:
        'L’essai Stream Estate ne cherche que des appartements et des maisons : précisez le type du bien vendeur.',
    };
  }

  let json: unknown;
  try {
    const response = await fetch(`${STREAM_ESTATE_ENDPOINT}?${query.params}`, {
      headers: { 'X-API-KEY': apiKey, Accept: 'application/ld+json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
    if (response.status === 401 || response.status === 403) {
      console.error('[searchStreamEstate] refus de l’API', response.status);
      return {
        ok: false,
        error:
          'Stream Estate a refusé la recherche (clé invalide ou crédits épuisés). Vérifiez le solde dans la console Stream Estate.',
      };
    }
    if (!response.ok) throw new Error(`Stream Estate ${response.status}`);
    json = await response.json();
  } catch (error) {
    console.error('[searchStreamEstate] appel API', error instanceof Error ? error.message : error);
    return { ok: false, error: GENERIC_ERROR };
  }

  const parsed = parseStreamEstateResponse(json);
  if (parsed == null) {
    console.error('[searchStreamEstate] réponse de forme inattendue');
    return { ok: false, error: GENERIC_ERROR };
  }

  return {
    ok: true,
    portal: {
      portal: STREAM_ESTATE_SOURCE,
      label: STREAM_ESTATE_LABEL,
      searchUrl: '', // pas de page de recherche publique : l'écran n'affiche pas de lien
      status: parsed.candidates.length > 0 ? 'ok' : 'empty',
      message:
        parsed.candidates.length > 0
          ? null
          : 'Stream Estate ne renvoie aucun bien pour ces critères.',
      candidates: parsed.candidates,
    },
    billed: parsed.billed,
    totalItems: parsed.totalItems,
    unreadable: parsed.unreadable,
    communeName: commune.name,
    inseeCode: commune.code,
  };
}

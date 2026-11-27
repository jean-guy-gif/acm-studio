import 'server-only';

import { geoProvider } from '@/features/competitor-search/services/geo-provider';
import { baseStreamEstateQuery } from '@/features/competitor-search/services/stream-estate';
import {
  planTiers,
  runTieredSearch,
  type FetchStreamEstatePage,
  type TierCursor,
  type TieredSearchMemory,
  type TieredSearchOutcome,
  type TierPlan,
} from '@/features/competitor-search/services/stream-estate-tiers';
import {
  IDEAL_CRITERIA_MESSAGES,
  type IdealCriteria,
} from '@/features/ideal-properties/services/ideal-criteria';

// Mission 136 — la recherche du marché d'un acquéreur (M118), partagée par l'écran des biens
// idéaux et la veille de la nuit. Un refactoring de `searchIdealProperties` : aucun comportement ne
// change. Deux temps, pour que le budget ne se réserve qu'une fois les communes résolues :
//   1. `resolveIdealPlans` : les communes de la fiche en codes INSEE (une seule introuvable
//      retient), puis le plan — les réglages de la fiche, sur toutes ses communes à la fois ;
//   2. `runIdealMarketSearch` : la recherche par crans, bornée par ce qui a été réservé.

export type IdealPlans = {
  plans: TierPlan[];
  codes: string[];
  // Les communes telles que le référentiel les nomme, pour le bilan.
  names: string[];
};

export async function resolveIdealPlans(
  deduced: IdealCriteria,
  demo: boolean,
  now: Date,
): Promise<{ ok: true; resolved: IdealPlans } | { ok: false; error: string }> {
  const geo = geoProvider(demo);
  const codes: string[] = [];
  const names: string[] = [];
  for (const city of deduced.cities) {
    const commune = await geo.resolveCommune(city, null);
    if (!commune.ok) {
      const reasons: Record<typeof commune.reason, string> = {
        unavailable:
          'Le service des communes ne répond pas\u00a0: réessayez dans un instant. Aucune recherche lancée.',
        arrondissements: `${city} se cherche par arrondissement\u00a0: écrivez-le sur la fiche («\u00a0Paris 15e\u00a0»). Aucune recherche lancée.`,
        ambiguous: `Plusieurs communes répondent à «\u00a0${city}\u00a0»\u00a0: précisez-la sur la fiche. Aucune recherche lancée.`,
        not_found: `Commune introuvable («\u00a0${city}\u00a0»)\u00a0: vérifiez la fiche. Aucune recherche lancée.`,
      };
      return { ok: false, error: reasons[commune.reason] };
    }
    if (!codes.includes(commune.code)) {
      codes.push(commune.code);
      names.push(commune.display);
    }
  }
  if (!baseStreamEstateQuery(deduced.criteria, now).ok) {
    return { ok: false, error: IDEAL_CRITERIA_MESSAGES.no_type };
  }
  // Le plan : les réglages de la fiche, toute la commune — toutes les communes de la fiche.
  const plans: TierPlan[] = planTiers(
    deduced.criteria,
    { located: false, hasCentre: false, arrondissement: null },
    deduced.settings,
  ).map((plan) => ({ ...plan, area: { kind: 'commune', codes } }));
  return { ok: true, resolved: { plans, codes, names } };
}

export function runIdealMarketSearch(
  deduced: IdealCriteria,
  resolved: IdealPlans,
  options: {
    fetchPage: FetchStreamEstatePage;
    now: Date;
    cap: number;
    resume?: { cursor: TierCursor; memory: TieredSearchMemory } | null;
    newestFirst?: boolean;
  },
): Promise<TieredSearchOutcome> {
  return runTieredSearch({
    criteria: deduced.criteria,
    plans: resolved.plans,
    context: { inseeCode: resolved.codes[0]!, origin: null },
    neighbours: null,
    fetchPage: options.fetchPage,
    now: options.now,
    cap: options.cap,
    filters: deduced.settings.filters,
    ...(options.resume != null ? { resume: options.resume } : {}),
    ...(options.newestFirst ? { newestFirst: true } : {}),
  });
}

import { scoreCandidate } from '@/features/competitor-search/services/score-candidate';
import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';
import { typesConflict } from '@/features/competitor-search/utils/property-type-guard';
import type { ProspectingStep } from '@/features/competitor-mandate/services/mandate-columns';
import type { SuiviDossier } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import {
  referencePrice,
  type BuyerCriteria,
  type SuiviComposition,
} from '@/features/meeting-conclusion/services/buyer-match';
import { buyerRuleGaps, negotiationNote } from '@/features/meeting-conclusion/services/buyer-rules';
import {
  buyerCommuneKey,
  requestedCommuneKeys,
} from '@/features/meeting-conclusion/services/commune-alias';
import type { ProspectingEntry } from '@/features/prospecting/types';

// Mission 86 — le rapprochement acheteur cherche dans TROIS listes et range ce qui correspond
// en trois groupes, chacun avec son action : mes mandats, mes vendeurs à relancer, les
// concurrents à prospecter. Pur, jetable : rien n'est enregistré (M54).

export type BuyerGroup = 'mandate' | 'follow_up' | 'competitor';

export const BUYER_GROUPS: BuyerGroup[] = ['mandate', 'follow_up', 'competitor'];

export const BUYER_GROUP_LABELS: Record<BuyerGroup, string> = {
  mandate: 'Mes mandats',
  follow_up: 'Mes vendeurs à relancer',
  competitor: 'Concurrents à prospecter',
};

export type BuyerCandidate = {
  key: string;
  group: BuyerGroup;
  // Le nom du dossier, ou l'adresse du concurrent (null : adresse non localisée).
  title: string | null;
  propertyType: string | null;
  roomsCount: number | null;
  surfaceArea: number | null;
  city: string | null;
  // Mandat : prix de commercialisation convenu, sinon prix conseillé (M54). Concurrent : le
  // prix affiché de l'annonce.
  price: number | null;
  // Le dossier vendeur : celui du candidat, ou — pour un concurrent — celui pour lequel on le
  // prospecte (« Pour : … »).
  projectId: string;
  sellerName: string;
  sellerPhone: string | null;
  // Concurrent seulement : à qui s'adresser (M83) et l'annonce où figure le contact du confrère.
  step: ProspectingStep | null;
  listingUrl: string | null;
};

// Les dossiers « vendu ailleurs » ou « retiré » ne sont plus à vendre par l'agence : ils
// n'entrent dans aucune des trois listes.
export function buyerCandidates(
  dossiers: SuiviDossier[],
  entries: ProspectingEntry[],
): BuyerCandidate[] {
  const candidates: BuyerCandidate[] = [];
  for (const dossier of dossiers) {
    const outcome = dossier.conclusion?.outcome;
    if (outcome !== 'signed' && outcome !== 'follow_up') {
      continue;
    }
    candidates.push({
      key: `dossier:${dossier.project.id}`,
      group: outcome === 'signed' ? 'mandate' : 'follow_up',
      title: dossier.project.seller_name ?? 'Dossier vendeur',
      propertyType: dossier.property?.propertyType ?? null,
      roomsCount: dossier.property?.roomsCount ?? null,
      surfaceArea: dossier.property?.surfaceArea ?? null,
      city: dossier.property?.city ?? null,
      price: referencePrice(dossier).value,
      projectId: dossier.project.id,
      sellerName: dossier.project.seller_name ?? 'Dossier vendeur',
      sellerPhone: dossier.project.seller_phone?.trim() || null,
      step: null,
      listingUrl: null,
    });
  }
  for (const { row, seller } of entries) {
    candidates.push({
      key: `competitor:${row.id}`,
      group: 'competitor',
      title: row.address,
      propertyType: row.propertyType,
      roomsCount: row.roomsCount,
      surfaceArea: row.surfaceArea,
      city: row.city,
      price: row.price,
      projectId: seller.projectId,
      sellerName: seller.name,
      sellerPhone: null,
      step: row.step,
      listingUrl: row.listingUrl,
    });
  }
  return candidates;
}

export type BuyerHit = {
  candidate: BuyerCandidate;
  // Le score de M54 : il classe à l'intérieur d'un groupe, il ne décide de rien.
  score: number;
  // Écarts aux règles, chiffrés. Vide = correspond.
  gaps: string[];
  // Correspond grâce à la marge de négociation.
  note: string | null;
};

export type BuyerReconciliation = {
  requestedType: string | null;
  matches: Record<BuyerGroup, BuyerHit[]>;
  matchCount: number;
  // Du bon type mais hors règles : ils ne disparaissent pas, ils sont dits « proches ».
  near: BuyerHit[];
  // Type non renseigné ou non reconnu : à part, jamais mêlés (M54).
  unclassified: BuyerHit[];
  // Ce que les trois listes CONTIENNENT, pour dire pourquoi une recherche est vide.
  composition: SuiviComposition;
};

export function candidateComposition(candidates: BuyerCandidate[]): SuiviComposition {
  const counts = new Map<string, number>();
  let unclassifiedCount = 0;
  for (const candidate of candidates) {
    const type = normalizePropertyType(candidate.propertyType);
    if (type == null) {
      unclassifiedCount += 1;
    } else {
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }
  }
  const byType = [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
  return { byType, unclassifiedCount };
}

export function reconcileBuyer(
  criteria: BuyerCriteria,
  candidates: BuyerCandidate[],
): BuyerReconciliation {
  const requestedType = normalizePropertyType(criteria.propertyType);
  const communes = requestedCommuneKeys(criteria.city);

  const hit = (candidate: BuyerCandidate, candidateType: string | null): BuyerHit => {
    const facts = {
      roomsCount: candidate.roomsCount,
      surfaceArea: candidate.surfaceArea,
      city: candidate.city,
      price: candidate.price,
    };
    // Le moteur de M54 compare UNE commune : celle du bien quand elle fait partie des
    // communes demandées (alias compris), sinon la première demandée.
    const commune = buyerCommuneKey(candidate.city);
    const scoringCity =
      communes.length === 0
        ? null
        : commune != null && communes.includes(commune)
          ? candidate.city
          : (criteria.city?.split(/[,;\n]/)[0]?.trim() ?? null);
    const scored = scoreCandidate(
      {
        city: scoringCity,
        district: null,
        propertyType: requestedType,
        surfaceArea: criteria.surfaceArea,
        roomsCount: criteria.roomsCount,
        advisorPriceMin: criteria.budgetMin,
        advisorPriceMax: criteria.budgetMax,
      },
      { ...facts, district: null, propertyType: candidateType },
    );
    return {
      candidate,
      score: scored.score,
      gaps: buyerRuleGaps(criteria, facts).map((gap) => gap.detail),
      note: negotiationNote(criteria, facts),
    };
  };

  const matches: Record<BuyerGroup, BuyerHit[]> = { mandate: [], follow_up: [], competitor: [] };
  const near: BuyerHit[] = [];
  const unclassified: BuyerHit[] = [];

  for (const candidate of candidates) {
    const candidateType = normalizePropertyType(candidate.propertyType);
    if (requestedType != null) {
      // LE TYPE FILTRE, IL NE PONDÈRE PAS (M54) : un autre type connu ne sort nulle part.
      if (typesConflict(requestedType, candidateType)) {
        continue;
      }
      if (candidateType == null) {
        unclassified.push(hit(candidate, candidateType));
        continue;
      }
    }
    const result = hit(candidate, candidateType);
    if (result.gaps.length === 0) {
      matches[candidate.group].push(result);
    } else {
      near.push(result);
    }
  }

  const byScore = (a: BuyerHit, b: BuyerHit) => b.score - a.score;
  for (const group of BUYER_GROUPS) {
    matches[group].sort(byScore);
  }
  near.sort(byScore);
  unclassified.sort(byScore);

  return {
    requestedType,
    matches,
    matchCount: BUYER_GROUPS.reduce((sum, group) => sum + matches[group].length, 0),
    near,
    unclassified,
    composition: candidateComposition(candidates),
  };
}

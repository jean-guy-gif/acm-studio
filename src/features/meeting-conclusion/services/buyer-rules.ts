import type { BuyerCriteria } from '@/features/meeting-conclusion/services/buyer-match';
import {
  buyerCommuneKey,
  requestedCommuneKeys,
} from '@/features/meeting-conclusion/services/commune-alias';
import { formatEuro, formatSquareMeters } from '@/lib/format';

// Mission 86 — ce qui « correspond » à un acheteur, règles validées par Laurent. Pur.
//   • commune identique (plusieurs possibles, alias compris) ;
//   • pièces : au moins le nombre demandé ;
//   • surface : au moins celle demandée, avec 5 % de marge (60 m² demandés → 57 m² acceptés) ;
//   • prix : du budget min au budget max + 5 % (négociation) ;
//   • un champ laissé vide ne filtre pas.
// Le TYPE n'est pas ici : il filtre en amont (M54). Le moteur de M54 (scoreCandidate) ne sert
// plus qu'à classer à l'intérieur d'un groupe ; ces règles décident qui entre.
//
// Une donnée absente du bien alors que l'acheteur la demande EST le critère : le bien ne
// « correspond » pas, il passe dans « proches », et l'écart dit ce qui manque.

export const SURFACE_MARGIN_PERCENT = 5;
export const BUDGET_MARGIN_PERCENT = 5;

export type BuyerFacts = {
  roomsCount: number | null;
  surfaceArea: number | null;
  city: string | null;
  price: number | null;
};

export type BuyerRuleGap = {
  criterion: 'city' | 'rooms' | 'surface' | 'price';
  detail: string;
};

// Bornes en entiers : 60 × 0,95 ne vaut pas 57 en virgule flottante.
const reachesSurface = (surface: number, requested: number): boolean =>
  surface * 100 >= requested * (100 - SURFACE_MARGIN_PERCENT);
const withinBudgetMax = (price: number, budgetMax: number): boolean =>
  price * 100 <= budgetMax * (100 + BUDGET_MARGIN_PERCENT);

// Les écarts aux règles, chiffrés. Liste vide = le bien correspond.
export function buyerRuleGaps(criteria: BuyerCriteria, facts: BuyerFacts): BuyerRuleGap[] {
  const gaps: BuyerRuleGap[] = [];

  const communes = requestedCommuneKeys(criteria.city);
  if (communes.length > 0) {
    const commune = buyerCommuneKey(facts.city);
    if (commune == null) {
      gaps.push({ criterion: 'city', detail: 'Commune non renseignée' });
    } else if (!communes.includes(commune)) {
      gaps.push({ criterion: 'city', detail: `Autre commune : ${facts.city?.trim()}` });
    }
  }

  if (criteria.roomsCount != null) {
    if (facts.roomsCount == null) {
      gaps.push({ criterion: 'rooms', detail: 'Nombre de pièces non renseigné' });
    } else if (facts.roomsCount < criteria.roomsCount) {
      const missing = criteria.roomsCount - facts.roomsCount;
      gaps.push({
        criterion: 'rooms',
        detail: `${missing} pièce${missing > 1 ? 's' : ''} de moins`,
      });
    }
  }

  if (criteria.surfaceArea != null) {
    if (facts.surfaceArea == null) {
      gaps.push({ criterion: 'surface', detail: 'Surface non renseignée' });
    } else if (!reachesSurface(facts.surfaceArea, criteria.surfaceArea)) {
      gaps.push({
        criterion: 'surface',
        detail: `${formatSquareMeters(criteria.surfaceArea - facts.surfaceArea)} de moins`,
      });
    }
  }

  if (criteria.budgetMin != null || criteria.budgetMax != null) {
    if (facts.price == null) {
      gaps.push({ criterion: 'price', detail: 'Prix non renseigné' });
    } else if (criteria.budgetMin != null && facts.price < criteria.budgetMin) {
      gaps.push({
        criterion: 'price',
        detail: `${formatEuro(criteria.budgetMin - facts.price)} sous le budget`,
      });
    } else if (criteria.budgetMax != null && !withinBudgetMax(facts.price, criteria.budgetMax)) {
      gaps.push({
        criterion: 'price',
        detail: `${formatEuro(facts.price - criteria.budgetMax)} au-dessus du budget`,
      });
    }
  }

  return gaps;
}

// Un bien qui correspond grâce à la marge de négociation le dit : le conseiller sait qu'il
// faudra négocier. Null quand le prix tient dans le budget, ou qu'il n'y a rien à dire.
export function negotiationNote(criteria: BuyerCriteria, facts: BuyerFacts): string | null {
  if (
    criteria.budgetMax == null ||
    facts.price == null ||
    facts.price <= criteria.budgetMax ||
    !withinBudgetMax(facts.price, criteria.budgetMax)
  ) {
    return null;
  }
  return `${formatEuro(facts.price - criteria.budgetMax)} au-dessus du budget, à négocier`;
}

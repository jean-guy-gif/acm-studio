import { budgetStepLabel } from '@/features/buyers/services/budget-steps';
import { parisDaysSince } from '@/features/buyers/services/buyer-readiness';
import {
  LIVE_BUYERS_THRESHOLD,
  type PropertyBuyers,
} from '@/features/buyers/services/property-buyers';
import { formatNumber } from '@/lib/format';

// Mission 133 — ce que le Live reçoit des acquéreurs prêts de l'agence : un compte, et jusqu'à
// sept cartes ANONYMES. Une liste d'autorisation : le secteur cherché, le budget en fourchette
// arrondie, depuis quand il cherche. Jamais un nom, un téléphone, un e-mail, une note ni une ligne
// rouge ; le constructeur ne recopie rien d'autre. Sous 5 prêts, rien ne part vers le navigateur
// (une garde de donnée, pas de rendu, M51, M112). Pur.

export const LIVE_BUYERS_CARDS_MAX = 7;
export const LIVE_BUYERS_CITIES_MAX = 3;

export type AnonymousBuyerCard = {
  sector: string;
  budget: string | null;
  since: string;
};

export type LiveBuyersReveal = {
  count: number;
  cards: AnonymousBuyerCard[];
};

// « 700 – 800 k€ » : pas de 50 k€ sous 1 M€, de 100 k€ au-delà ; le bas sur le budget idéal (sinon
// le plafond), arrondi en dessous, le haut sur le plafond, arrondi au-dessus ; jamais un seul
// montant (le bas descend d'un pas).
export function budgetBand(budgetIdeal: number | null, budgetMax: number | null): string | null {
  if (budgetMax == null || budgetMax <= 0) return null;
  const step = (value: number) => (value >= 1_000_000 ? 100_000 : 50_000);
  const lowBase =
    budgetIdeal != null && budgetIdeal > 0 && budgetIdeal <= budgetMax ? budgetIdeal : budgetMax;
  const high = Math.ceil(budgetMax / step(budgetMax)) * step(budgetMax);
  let low = Math.floor(lowBase / step(lowBase)) * step(lowBase);
  if (low >= high) low = high - step(high - 1);
  if (high < 1_000_000) return `${formatNumber(low / 1_000)} – ${formatNumber(high / 1_000)} k€`;
  if (low >= 1_000_000) {
    return `${formatNumber(low / 1_000_000)} – ${formatNumber(high / 1_000_000)} M€`;
  }
  return `${budgetStepLabel(low)} – ${budgetStepLabel(high)}`;
}

// « cherche depuis 3 semaines », depuis la création de sa fiche (jours de Paris).
export function searchingSince(createdAt: string, now: Date): string {
  const days = parisDaysSince(createdAt, now);
  const weeks = Math.floor(days / 7);
  if (weeks < 1) return 'cherche depuis moins d’une semaine';
  return `cherche depuis ${weeks} semaine${weeks > 1 ? 's' : ''}`;
}

export function liveBuyersReveal(
  result: PropertyBuyers | null,
  now: Date,
): LiveBuyersReveal | null {
  if (result == null || result.ready.length < LIVE_BUYERS_THRESHOLD) return null;
  return {
    count: result.ready.length,
    cards: result.ready.slice(0, LIVE_BUYERS_CARDS_MAX).map(({ buyer }) => ({
      sector: buyer.cities.slice(0, LIVE_BUYERS_CITIES_MAX).join(' · '),
      budget: budgetBand(buyer.budgetIdeal, buyer.budgetMax),
      since: searchingSince(buyer.createdAt, now),
    })),
  };
}

export const liveBuyersTitle = (count: number): string =>
  `${count} familles cherchent un bien comme le vôtre et sont prêtes à visiter`;
export const LIVE_BUYERS_FINANCING = 'Financement validé';

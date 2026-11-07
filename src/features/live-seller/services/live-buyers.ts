import { parisDaysSince } from '@/features/buyers/services/buyer-readiness';
import {
  LIVE_BUYERS_THRESHOLD,
  type PropertyBuyers,
} from '@/features/buyers/services/property-buyers';
import { clientTexts, type TextLanguage } from '@/lib/client-texts';
import { FRENCH_TEXTS } from '@/lib/client-texts/fr';

// Mission 133 — ce que le Live reçoit des acquéreurs prêts de l'agence : un compte, et jusqu'à
// sept cartes ANONYMES. Une liste d'autorisation : le secteur cherché, le budget en fourchette
// arrondie, depuis quand il cherche. Jamais un nom, un téléphone, un e-mail, une note ni une ligne
// rouge ; le constructeur ne recopie rien d'autre. Sous 5 prêts, rien ne part vers le navigateur
// (une garde de donnée, pas de rendu, M51, M112). Pur.

export const LIVE_BUYERS_CARDS_MAX = 7;
export const LIVE_BUYERS_CITIES_MAX = 3;

// Mission 140 — des nombres, pas des phrases : la scène les dit dans la langue du vendeur, et
// change de langue sans rien redemander au serveur.
export type AnonymousBuyerCard = {
  sector: string;
  budget: BudgetBand | null;
  weeks: number;
};

export type BudgetBand = { low: number; high: number };

export type LiveBuyersReveal = {
  count: number;
  cards: AnonymousBuyerCard[];
};

// « 700 – 800 k€ » : pas de 50 k€ sous 1 M€, de 100 k€ au-delà ; le bas sur le budget idéal (sinon
// le plafond), arrondi en dessous, le haut sur le plafond, arrondi au-dessus ; jamais un seul
// montant (le bas descend d'un pas).
export function budgetBandRange(
  budgetIdeal: number | null,
  budgetMax: number | null,
): BudgetBand | null {
  if (budgetMax == null || budgetMax <= 0) return null;
  const step = (value: number) => (value >= 1_000_000 ? 100_000 : 50_000);
  const lowBase =
    budgetIdeal != null && budgetIdeal > 0 && budgetIdeal <= budgetMax ? budgetIdeal : budgetMax;
  const high = Math.ceil(budgetMax / step(budgetMax)) * step(budgetMax);
  let low = Math.floor(lowBase / step(lowBase)) * step(lowBase);
  if (low >= high) low = high - step(high - 1);
  return { low, high };
}

export function budgetBandLabel(band: BudgetBand, language: TextLanguage = 'fr'): string {
  return clientTexts(language).live.buyers.budget(band.low, band.high);
}

export function budgetBand(budgetIdeal: number | null, budgetMax: number | null): string | null {
  const band = budgetBandRange(budgetIdeal, budgetMax);
  return band ? budgetBandLabel(band) : null;
}

// Depuis combien de semaines il cherche, depuis la création de sa fiche (jours de Paris).
export function searchingWeeks(createdAt: string, now: Date): number {
  return Math.floor(parisDaysSince(createdAt, now) / 7);
}

// « cherche depuis 3 semaines ».
export function searchingSince(
  createdAt: string,
  now: Date,
  language: TextLanguage = 'fr',
): string {
  return clientTexts(language).live.buyers.since(searchingWeeks(createdAt, now));
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
      budget: budgetBandRange(buyer.budgetIdeal, buyer.budgetMax),
      weeks: searchingWeeks(buyer.createdAt, now),
    })),
  };
}

// L'écran montré au vendeur : le chiffre en très grand, puis la phrase (décision de Jean-Guy, 06/11).
// Les mots vivent dans les textes du client (mission 140) ; ces noms restent pour les tests.
export const LIVE_BUYERS_PHRASE = FRENCH_TEXTS.live.buyers.phrase;
export const LIVE_BUYERS_PROMISE = FRENCH_TEXTS.live.buyers.promise;
export const LIVE_BUYERS_FINANCING = FRENCH_TEXTS.live.buyers.financing;

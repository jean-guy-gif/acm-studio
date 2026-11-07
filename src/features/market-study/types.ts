import type { TextLanguage } from '@/lib/client-texts';
import type { RankingTier } from '@/features/market-update/services/ranking-tiers';
import type { SellerSynthesis, SynthesisFeature } from '@/features/seller-synthesis/types';

// Mission 131 — l'« Étude de marché », remise au vendeur qui ne veut pas jouer, ou sans Live : le
// marché du jour, concurrent par concurrent, puis où en est son prix. LISTE D'AUTORISATION, comme
// la synthèse (M113) et le Point marché (M127) : jamais l'adresse, le titre, le lien d'une annonce,
// ni « Vendu par » ou l'exclusivité d'un concurrent, ni la fourchette du conseiller. Les
// concurrents sont désignés par leur libellé neutre. Une donnée absente n'a pas de case.

export type MarketStudyCompetitor = {
  id: string;
  // Sa place parmi les concurrents retenus, dans l'ordre du dossier (`display_order`).
  position: number;
  label: string;
  // Trois photos au plus, celles de l'annonce telles que le Live les montre (M58) ; vide sans photo
  // ou si le conseiller l'a retirée (« Sans photo », le même choix que la synthèse).
  photoUrls: string[];
  hasPhoto: boolean;
  photoHidden: boolean;
  features: SynthesisFeature[];
  price: number;
  pricePerSquareMeter: number | null;
  // Les jours en vente au jour de l'étude (M47, M127) ; « environ » sans date de publication.
  daysOnMarket: { days: number; approximate: boolean } | null;
  // La baisse de prix connue de l'annonce, si elle en a une.
  priceDrop: { amount: number; percent: number | null } | null;
  // Une annonce disparue sur preuve (M103) : sa fiche le dit, elle sort du classement.
  goneAt: string | null;
};

export type MarketStudyRankingRow = {
  key: string;
  subject: boolean;
  rank: number;
  tier: RankingTier;
  label: string;
  price: number;
  detail: string | null;
};

// « Où en est votre prix » au jour J : le classement de la M129, en une seule étape. `subject` est
// null sans prix de référence : alors ni ligne VOTRE BIEN, ni verdict (décision du 05/11).
export type MarketStudyRanking = {
  subject: {
    price: number;
    // D'où vient le prix : convenu à la conclusion, ou l'analyse du conseiller.
    source: 'agreed' | 'advisor';
    rank: number;
    total: number;
    tier: RankingTier;
    word: string;
    cells: RankingTier[];
  } | null;
  rows: MarketStudyRankingRow[];
};

export type MarketStudyDocument = {
  // Mission 140 — la langue du vendeur, celle de tout le document (les mentions légales mises à part).
  language: TextLanguage;
  // Le jour de l'étude (ISO) : celui où le document est ouvert.
  madeAt: string;
  sellerName: string;
  // « Maison · Biot ».
  propertyLabel: string | null;
  // « Maison · 5 pièces · 113 m² · Biot » : le bien du vendeur dans le classement.
  subjectLabel: string;
  commune: string | null;
  coverPhotoUrl: string | null;
  coverFigures: { label: string; value: string }[];
  competitors: MarketStudyCompetitor[];
  ranking: MarketStudyRanking;
  agency: SellerSynthesis['agency'];
  brandDeclarations: string;
};

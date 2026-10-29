import type { MarketUpdateSummary } from '@/features/market-update/services/market-update-summary';
import type { SellerSynthesis, SynthesisFeature } from '@/features/seller-synthesis/types';

// Mission 127 — le Point marché, document remis au vendeur après un mandat signé. LISTE
// D'AUTORISATION, comme la synthèse (M113) : jamais l'adresse, le titre, le lien d'une annonce,
// ni « Vendu par » ou l'exclusivité d'un concurrent, ni la fourchette du conseiller. Les
// concurrents sont désignés par leur libellé neutre. Les prix et conclusions viennent du point
// daté, relu tel quel ; les photos et la grille sont relues à l'ouverture (« Sans photo », M113).

export type MarketUpdateCompetitorView = {
  id: string;
  position: number;
  label: string;
  // Jusqu'à quatre photos de l'annonce, telles que le Live les montre (M58) ; vide sans photo ou
  // si le conseiller l'a retirée.
  photoUrls: string[];
  hasPhoto: boolean;
  photoHidden: boolean;
  features: SynthesisFeature[];
};

export type MarketUpdateDocument = {
  updateId: string;
  madeAt: string;
  sellerName: string;
  propertyLabel: string | null;
  commune: string | null;
  coverPhotoUrl: string | null;
  summary: MarketUpdateSummary;
  competitors: MarketUpdateCompetitorView[];
  agency: SellerSynthesis['agency'];
  brandDeclarations: string;
};

import type { TextLanguage } from '@/lib/client-texts';
import type { RankingTier } from '@/features/market-update/services/ranking-tiers';
import type { SellerSynthesis, SynthesisFeature } from '@/features/seller-synthesis/types';
import type { NeighbourhoodDocumentLink } from '@/features/neighbourhood-link/services/neighbourhood-link';
import type { NeighbourhoodDocumentContent } from '@/features/neighbourhood-link/components/neighbourhood-document';

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
// null sans prix de commercialisation convenu : alors ni ligne VOTRE BIEN, ni verdict, ni chapitre
// (mission 163 C : jamais l'analyse du conseiller à sa place).
export type MarketStudyRanking = {
  subject: {
    price: number;
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
  // Mission 157 B — le lien « Vivre ici » du bien, relu à chaque ouverture ; null sans lien valable.
  neighbourhood: NeighbourhoodDocumentLink | null;
  // Mission 159 — les blocs du quartier cochés par le conseiller.
  quartier: NeighbourhoodDocumentContent | null;
  // Mission 163 A — les pages de l'Étude, composées depuis ce qui précède.
  story: MarketStudyStory;
};

// ─── Mission 163 A — l'Étude en fil conducteur (maquette M163-fil-conducteur) ─────────────────────
// Tout ce que disent les pages, composé une fois par `study-story.ts` depuis les chiffres du
// dossier : le document ne fait que l'afficher. Une idée par page, la conclusion en titre.

export type StudyChapter = 'competitors' | 'sales' | 'ranking' | 'quartier';

export type StudyBand = { number: string | null; title: string; lead: string };

export type StudyCard = {
  id: string;
  kicker: string;
  label: string;
  photoUrl: string | null;
  price: string;
  perSquareMeter: string | null;
  // « 35 jours », ou la mention d'une annonce retirée.
  since: { label: string; value: string } | null;
  drop: { label: string; value: string } | null;
  // Seulement les lignes qui diffèrent du bien du vendeur, avec leur pastille.
  diffs: { label: string; value: string; status: 'competitor_advantage' | 'competitor_weakness' }[];
  equivalentOn: string | null;
  equivalentAll: string | null;
};

export type StudySaleRow = {
  mark: number;
  month: string;
  street: string | null;
  rooms: string | null;
  surface: string | null;
  distance: string | null;
  price: string;
};

export type StudyTile = {
  title: string;
  headline: string;
  detail: string[];
  source: string | null;
};

export type MarketStudyStory = {
  footer: string;
  advisor: { name: string | null; initials: string; photoUrl: string | null; by: string };
  cover: {
    kicker: string;
    title: string;
    line: string | null;
    preparedFor: string;
    by: string;
    contact: string | null;
  };
  summary: {
    title: string;
    lead: string;
    kpis: { value: string; sup: string | null; rest: string | null; label: string }[];
    items: {
      chapter: StudyChapter;
      number: number;
      title: { text: string; sup?: boolean }[];
      sub: string;
      page: string;
      tier: RankingTier | null;
    }[];
    howTitle: string;
    how: string;
    valueTitle: string;
    value: string;
  };
  competitors: {
    band: StudyBand;
    faceTo: string;
    pages: StudyCard[][];
    avis: string | null;
    source: string;
  } | null;
  sales: {
    band: StudyBand;
    points: { month: string; price: number; mark: number | null }[];
    low: string;
    high: string;
    legendKept: string;
    legendOthers: string | null;
    tableTitle: string;
    columns: {
      month: string;
      street: string;
      rooms: string;
      surface: string;
      distance: string;
      price: string;
    };
    rows: StudySaleRow[];
    readTitle: string;
    read: string[];
    avis: string;
    source: string;
  } | null;
  ranking: { band: StudyBand; verdictNote: string; avis: string; source: string } | null;
  quartier: {
    band: StudyBand;
    planning: StudyTile | null;
    permits: StudyTile | null;
    risks: { title: string; cells: { title: string; text: string }[]; source: string } | null;
    condominium: StudyTile | null;
    talkTitle: string;
    // La page ne tient pas sur une feuille : « Comment en parler », Vivre ici et l'avis passent sur
    // une seconde page.
    split: boolean;
    talk: { lead: string; text: string }[];
    // « Informations publiques telles qu'au … » : le jour du choix des blocs (M159).
    frozen: string;
    avis: string | null;
  } | null;
  next: {
    title: string;
    steps: { title: string; text: string }[];
    papersTitle: string;
    papers: string[];
    questionsTitle: string;
    contact: string;
    isTitle: string;
    is: string;
    sources: { label: string; value: string }[];
  };
};

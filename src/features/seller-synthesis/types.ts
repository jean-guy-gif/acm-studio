import type { DpeClass } from '@/features/dpe/services/dpe';
import type { QrCode } from '@/features/contact-card/services/qr-code';

// Mission 110 — la synthèse laissée au vendeur après le Live. LISTE D'AUTORISATION : ce type ne
// porte que ce que le vendeur peut lire. Jamais l'adresse, le titre, le lien d'une annonce, ni
// « Vendu par » ou l'exclusivité d'un concurrent (M75, M83, M107) ; jamais la fourchette du
// conseiller (M38) ni ses points de vigilance. Les concurrents sont désignés par leur libellé
// neutre.
//
// Mission 113 — elle raconte le rendez-vous, dans l'ordre du Live : ce qui a été montré et ce que
// le vendeur a répondu, rien qui n'ait eu lieu. Une donnée absente n'a pas de case.

// Une ligne de la grille du Live (M40, M80), du point de vue du concurrent.
export type SynthesisFeature = {
  label: string;
  value: string;
  sellerValue: string | null;
  status: 'competitor_advantage' | 'same' | 'competitor_weakness';
};

export type SynthesisCompetitor = {
  id: string;
  // Sa place parmi les concurrents montrés au Live (« Concurrent 2 »).
  position: number;
  label: string;
  surfaceArea: number | null;
  // La photo que montre le Live, telle quelle (M58) ; null sans photo ou si le conseiller l'a
  // retirée (« Sans photo ») — l'adresse de l'image ne part alors pas vers la page.
  photoUrl: string | null;
  // Pour l'écran du conseiller : le concurrent a-t-il une photo, et l'a-t-il retirée ?
  hasPhoto: boolean;
  photoHidden: boolean;
  features: SynthesisFeature[];
  serious: 'yes' | 'unsure' | 'no' | null;
  // Ce qui a été révélé pendant le Live : null pour un « Non » ou une devinette jamais donnée.
  // Mission 131 — un concurrent montré en présentation directe : son prix, sans devinette (null).
  revealed: {
    guess: number | null;
    price: number;
    // L'écart du Live (M96) : prix affiché moins devinette, en % de la devinette.
    gapPercent: number | null;
    pricePerSquareMeter: number | null;
    // Seulement si l'étape « Durée » a eu lieu : la durée devinée, puis la durée révélée.
    duration: { guessDays: number | null; days: number | null } | null;
    // La baisse de prix connue, montrée avec la durée.
    priceDrop: { amount: number; percent: number | null } | null;
  } | null;
};

export type SellerSynthesis = {
  sellerName: string;
  meetingDate: string | null;
  // « Maison · Biot » — le type et la commune du bien vendeur.
  propertyLabel: string | null;
  commune: string | null;
  property: {
    photos: string[];
    // Surface, terrain (maison), pièces · chambres, extérieurs, stationnement, DPE · GES, étage.
    facts: { label: string; value: string }[];
    surfaceArea: number | null;
    roomsCount: number | null;
    bedroomsCount: number | null;
    // « Ses atouts » : les points forts de la fiche (M44).
    strengths: string[];
  } | null;
  perceivedPrice: number | null;
  revisedPrice: number | null;
  // Les concurrents MONTRÉS au Live, dans son ordre (M110 : un concurrent hors Live n'y est pas).
  competitors: SynthesisCompetitor[];
  // « Le DPE face au marché », seulement si l'écran a eu lieu (M80) ; aucun montant.
  dpe: {
    reference: DpeClass;
    subject: DpeClass | null;
    message: string;
    classes: { letter: DpeClass; count: number }[];
  } | null;
  // Le concurrent le plus dangereux désigné par le vendeur, et son motif (jamais son commentaire).
  // Mission 131 — en présentation directe, le bien proposé par le CONSEILLER, « le plus proche de
  // votre bien » (`byAdvisor`), quand le vendeur n'en a pas désigné.
  dangerous: { competitorId: string; reason: string | null; byAdvisor?: boolean } | null;
  // « Vous avez sous-estimé 4 concurrents sur 6, de 6 % en moyenne » (M96).
  guessLines: string[];
  // « Analyse des prix » : les seuls concurrents dont le prix a été révélé (M94).
  analysis: {
    prices: number[];
    lowestPrice: number;
    highestPrice: number;
    medianPrice: number | null;
    revealedCount: number;
    droppedCount: number | null;
    medianDaysOnMarket: number | null;
    perSquareMeter: { label: string; value: number }[];
    medianPerSquareMeter: number | null;
  } | null;
  // Les prix du Live (M89) ; après la conclusion, les montants figés (M111).
  decision: {
    competitorPrice: number | null;
    // « Calculé sur 5 concurrents », « … dont 4 vus ensemble » (M104, M112) ; null sans calcul sûr.
    basisLabel: string | null;
    advisorAnalysis: number | null;
    justification: string | null;
  } | null;
  commercializationPrice: number | null;
  agreedPricePerSquareMeter: number | null;
  // La phrase de position du Live (M94) : « À 309 000 €, votre bien serait … ».
  positionSentence: string | null;
  agency: {
    name: string;
    logoUrl: string | null;
    postalAddress: string | null;
    professionalCard: string | null;
    professionalCardIssuer: string | null;
    financialGuarantee: string | null;
    advisorName: string | null;
    advisorPhone: string | null;
    advisorEmail: string | null;
    advisorPhotoUrl: string | null;
    // La carte de contact du conseiller (M84), tracée sans image ni service extérieur.
    advisorQr: QrCode | null;
  };
  // Les couleurs et la police de l'agence (M55, M57), déjà filtrées : des déclarations CSS sûres.
  brandDeclarations: string;
};

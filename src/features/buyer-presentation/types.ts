import type { AvailabilitySlot } from '@/features/buyer-deck/types';
import type {
  VisitNextStep,
  VisitOpinion,
  VisitTag,
} from '@/features/buyer-messages/templates/types';
import type { Database } from '@/lib/supabase/database.types';
import type { SelectionCategory, SelectionSource } from '@/features/ideal-properties/types';

// Mission 119 (partie A) — la PRÉSENTATION de la sélection à l'acquéreur, en rendez-vous : on
// montre, on explique pourquoi ça correspond, on écoute, on note. Ce n'est pas le Live vendeur :
// ni devinette, ni révélation, ni valeur perçue. Le prix affiché de chaque bien figure toujours.

export const VISIT_REQUEST_DURING = ['presentation', 'dossier', 'conseiller'] as const;
export type VisitRequestDuring = (typeof VISIT_REQUEST_DURING)[number];
export const VISIT_REQUEST_DURING_LABELS: Record<VisitRequestDuring, string> = {
  presentation: 'pendant la présentation',
  dossier: 'depuis le dossier',
  conseiller: 'par le conseiller',
};

export const VISIT_OUTCOMES = ['to_plan', 'visited', 'declined', 'offer'] as const;
export type VisitOutcome = (typeof VISIT_OUTCOMES)[number];
export const VISIT_OUTCOME_LABELS: Record<VisitOutcome, string> = {
  to_plan: 'À planifier',
  visited: 'Visité, à suivre',
  declined: 'Pas pour lui',
  offer: 'Offre envisagée',
};

export type VisitRequestRow = Database['public']['Tables']['buyer_visit_requests']['Row'];

export type VisitRequest = {
  id: string;
  buyerId: string;
  itemId: string;
  requestedAt: string;
  requestedDuring: VisitRequestDuring;
  cancelledAt: string | null;
  visitedAt: string | null;
  feedback: string | null;
  outcome: VisitOutcome;
  // Mission 122 — ses disponibilités, données à la fin de la présentation.
  availability: AvailabilitySlot[];
  // Mission 139 — le compte rendu de la visite (null avant la mission, ou visite pas faite).
  report: {
    opinion: VisitOpinion;
    liked: VisitTag[];
    disliked: VisitTag[];
    nextStep: VisitNextStep | null;
  } | null;
  // Mission 142 — le jour et l'heure posés par « Confirmer la visite », et le temps en voiture
  // jusqu'au lieu de l'acquéreur (en minutes), calculé une fois.
  scheduledAt?: string | null;
  livingPlaceMinutes?: number | null;
};

// Ce qu'un bien a le droit de porter devant l'acquéreur : LISTE D'AUTORISATION. Ni titre, ni
// adresse exacte, ni lien, ni « Vendu par », ni exclusivité, ni nom d'agence concurrente, ni la
// fourchette ou le prix convenu d'un dossier vendeur (M75, M83, M107).
export type PresentedItemInput = {
  itemId: string;
  position: number;
  source: SelectionSource;
  category: SelectionCategory | null;
  label: string;
  city: string | null;
  district: string | null;
  // Le prix affiché, figé à la sélection (M111) ; null pour un bien sans prix public.
  price: number | null;
  priceSeenOn: string | null;
  surfaceArea: number | null;
  roomsCount: number | null;
  bedroomsCount: number | null;
  outdoor: string[];
  parking: string[];
  energyRating: string | null;
  photos: string[];
  // Les écarts nommés par la 118, figés : « À savoir », jamais cachés.
  gaps: string[];
  // Mission 122 — ce que la grille juge et ce qui se date, sans rien de plus : le type de bien,
  // l'étage, la piscine, l'ascenseur, l'état (vocabulaire general_condition), la date de mise en
  // vente publiée par l'annonce, la dernière baisse de prix connue. null : non indiqué.
  propertyType: string | null;
  floor: number | null;
  hasPool: boolean | null;
  hasElevator: boolean | null;
  condition: string | null;
  listedSince: string | null;
  priceDrop: { amount: number; at: string | null } | null;
};

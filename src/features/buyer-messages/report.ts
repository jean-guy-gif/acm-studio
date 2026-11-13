import {
  DISMISS_REASONS,
  VISIT_TAGS,
  type DismissReason,
  type VisitNextStep,
  type VisitOpinion,
  type VisitTag,
} from '@/features/buyer-messages/templates/types';

// Mission 139 — le compte rendu de visite et le bien écarté, côté conseiller : les mots de l'écran,
// et la règle qui en déduit l'issue (lue par l'offre d'achat, M137 B). Sans zod : les écrans
// l'importent (M128 B) ; la relecture au serveur est dans `report-schema.ts`. Pur.

export const OPINION_LABELS: Record<VisitOpinion, string> = {
  love: 'Coup de cœur',
  interested: 'Intéressé',
  mixed: 'Mitigé',
  not_for_me: 'Pas pour moi',
};

// Ce qui a plu se dit au positif (« La vue dégagée », jamais « aimé : vis-à-vis »).
export const LIKED_LABELS: Record<VisitTag, string> = {
  district: 'Le quartier',
  surface: 'La surface',
  outdoor: 'L’extérieur',
  parking: 'Le parking',
  price: 'Le prix',
  works: 'L’état du bien',
  light: 'La luminosité',
  overlooked: 'La vue dégagée',
  noise: 'Le calme',
  pool: 'La piscine',
  other: 'Autre',
};

export const DISLIKED_LABELS: Record<VisitTag, string> = {
  district: 'Le quartier',
  surface: 'La surface',
  outdoor: 'L’extérieur',
  parking: 'Le parking',
  price: 'Le prix',
  works: 'Les travaux',
  light: 'La luminosité',
  overlooked: 'Le vis-à-vis',
  noise: 'Le bruit',
  pool: 'La piscine',
  other: 'Autre',
};

export const NEXT_STEP_LABELS: Record<VisitNextStep, string> = {
  offer: 'Offre envisagée',
  second_visit: 'Deuxième visite',
  keep_searching: 'On continue à chercher',
};

export const DISMISS_REASON_LABELS: Record<DismissReason, string> = {
  terrace: 'Terrasse trop petite',
  parking: 'Stationnement non conforme',
  floor: 'Étage',
  sector: 'Secteur',
  over_budget: 'Prix au-dessus du budget',
  condition: 'État',
  other: 'Autre',
};

// L'issue de la visite (M119), lue par l'offre d'achat (M137 B) : « Offre envisagée » est l'issue
// 'offer' ; « Pas pour moi » est « Pas pour lui » ; sinon « Visité, à suivre ».
export function visitOutcomeOf(report: {
  opinion: VisitOpinion;
  nextStep: VisitNextStep;
}): 'visited' | 'declined' | 'offer' {
  if (report.nextStep === 'offer') return 'offer';
  if (report.opinion === 'not_for_me') return 'declined';
  return 'visited';
}

// Correctif du 13/11 (essai de Jean-Guy) — l'acquéreur change d'avis après la visite : une visite
// FAITE passe en « Offre envisagée », sauf déjà en offre, ou « Pas pour moi » (avant le compte rendu
// de la M139, « Pas pour lui » sans avis) : les deux se contredisent.
export function canTurnIntoOffer(visit: {
  visitedAt: string | null;
  outcome: string;
  opinion: string | null;
}): boolean {
  if (visit.visitedAt == null || visit.outcome === 'offer') return false;
  if (visit.opinion === 'not_for_me') return false;
  return !(visit.opinion == null && visit.outcome === 'declined');
}

// « Intéressé · a aimé : La piscine, L'extérieur · gêné : Le prix », ce que le conseiller relit.
export function visitReportLine(report: {
  opinion: VisitOpinion;
  liked: readonly string[];
  disliked: readonly string[];
}): string {
  const tags = (list: readonly string[], labels: Record<VisitTag, string>) =>
    VISIT_TAGS.filter((tag) => list.includes(tag))
      .map((tag) => labels[tag].toLowerCase())
      .join(', ');
  return [
    OPINION_LABELS[report.opinion],
    report.liked.length > 0 ? `a aimé : ${tags(report.liked, LIKED_LABELS)}` : '',
    report.disliked.length > 0 ? `gêné : ${tags(report.disliked, DISLIKED_LABELS)}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

export function isDismissReason(value: unknown): value is DismissReason {
  return typeof value === 'string' && (DISMISS_REASONS as readonly string[]).includes(value);
}

import { QUICK_STAR_CRITERIA, QUICK_STARS_MAX } from '@/features/buyers/schemas/buyer-input';
import { BUYER_CRITERION_LABELS } from '@/features/buyers/types';

// Mission 151 — les indispensables que la lecture des notes peut proposer : ceux de la saisie
// rapide (M132) et la copropriété refusée (décision de Jean-Guy, 12/11), sept en tout, deux au
// plus. Une seule liste pour la consigne, le schéma de la réponse, la garde et l'écran.
export const NOTE_STAR_CRITERIA = [...QUICK_STAR_CRITERIA, 'condominium'] as const;
export type NoteStar = (typeof NOTE_STAR_CRITERIA)[number];
export const NOTE_STARS_MAX = QUICK_STARS_MAX;

export const NOTE_STAR_LABELS: Record<NoteStar, string> = {
  cities: BUYER_CRITERION_LABELS.cities,
  budget: BUYER_CRITERION_LABELS.budget,
  outdoor: BUYER_CRITERION_LABELS.outdoor,
  parking: BUYER_CRITERION_LABELS.parking,
  pool: BUYER_CRITERION_LABELS.pool,
  elevator: BUYER_CRITERION_LABELS.elevator,
  condominium: 'Pas de copropriété',
};

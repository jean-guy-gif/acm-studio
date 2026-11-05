import { parisDay } from '@/features/meeting-conclusion/services/follow-up-contacts';
import { addDays, daysBetween } from '@/features/meeting-conclusion/services/suivi-tasks';
import type { BuyerProgressFacts } from '@/features/buyers/services/buyer-progress';
import type { Buyer } from '@/features/buyers/types';

// Mission 132 — « Prêt à visiter » et « À recontacter » (décisions de Jean-Guy, 05/11 : pas de
// condition de délai d'achat). Calculés à l'affichage, jamais stockés : aucun statut nouveau
// (même principe que `projects.status`). Pur.
//   • Prêt à visiter = financement validé + un échange il y a moins de 30 jours + un budget
//     plafond renseigné ;
//   • À recontacter = aucun échange depuis 30 jours ;
// seulement pour une fiche en recherche ou en visite (un acquéreur qui a acheté ou abandonné n'est
// ni l'un ni l'autre). Les jours se comptent à Paris, comme le Suivi (M130).
export const ACTIVE_WINDOW_DAYS = 30;

export type BuyerReadinessInput = Pick<
  Buyer,
  'status' | 'financing' | 'budgetMax' | 'createdAt' | 'statusChangedAt' | 'contactedAt'
>;

// Les échanges datés avec l'acquéreur : le contact déclaré, un changement de statut, la
// présentation, sa réponse par le lien, une visite demandée ou faite. Un lien envoyé ou un courrier
// préparé ne sont pas des échanges avec lui (rien ne dit qu'il les a lus).
export function exchangeDates(
  buyer: Pick<Buyer, 'contactedAt' | 'statusChangedAt'>,
  facts: Pick<BuyerProgressFacts, 'presentedAt' | 'answeredAt' | 'lastVisitAt'>,
): (string | null | undefined)[] {
  return [
    buyer.contactedAt,
    buyer.statusChangedAt,
    facts.presentedAt,
    facts.answeredAt,
    facts.lastVisitAt,
  ];
}

// Le dernier signe de vie de la fiche : son plus récent échange, et sa création — une fiche se
// saisit en sortant d'un appel (décision du 05/11, M132).
export function lastActivityAt(buyer: BuyerReadinessInput, facts: BuyerProgressFacts): string {
  const dates = [buyer.createdAt, ...exchangeDates(buyer, facts)].filter(
    (value): value is string => typeof value === 'string' && value !== '',
  );
  return dates.reduce((latest, value) => (value > latest ? value : latest));
}

export type BuyerReadiness = {
  state: 'ready' | 'recontact' | null;
  // Le jour (Paris) où la fiche devient « À recontacter » : 30 jours après son dernier signe de vie.
  recontactOn: string | null;
  // Jours depuis le dernier signe de vie.
  sinceDays: number | null;
};

const ACTIVE = new Set(['searching', 'visiting']);

export function buyerReadiness(
  buyer: BuyerReadinessInput,
  facts: BuyerProgressFacts,
  now: Date,
): BuyerReadiness {
  // Une lecture en échec ne fabrique ni un acquéreur prêt ni une relance (M98).
  if (!ACTIVE.has(buyer.status) || facts.unread) {
    return { state: null, recontactOn: null, sinceDays: null };
  }
  const lastDay = parisDay(new Date(lastActivityAt(buyer, facts)));
  const today = parisDay(now);
  const sinceDays = Math.max(0, daysBetween(lastDay, today));
  const recontactOn = addDays(lastDay, ACTIVE_WINDOW_DAYS);
  if (sinceDays >= ACTIVE_WINDOW_DAYS) {
    return { state: 'recontact', recontactOn, sinceDays };
  }
  const ready = buyer.financing === 'validated' && buyer.budgetMax != null;
  return { state: ready ? 'ready' : null, recontactOn, sinceDays };
}

export const READY_LABEL = 'Prêt à visiter';
export const RECONTACT_LABEL = 'À recontacter';

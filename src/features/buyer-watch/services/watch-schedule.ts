import { parisDay } from '@/features/meeting-conclusion/services/follow-up-contacts';
import { addDays } from '@/features/meeting-conclusion/services/suivi-tasks';
import { formatEuro } from '@/lib/format';

// Mission 136 — qui la veille cherche, quand, et ce que l'écran en dit. Pur.
//   • seuls les acquéreurs « Prêts à visiter » (M132, `buyerReadiness`) : un acquéreur qui en sort
//     n'est plus veillé, il revient dès qu'il y rentre ;
//   • une recherche par acquéreur et par semaine au plus : dû quand son dernier passage date de
//     7 jours de Paris ou plus (jamais cherché : dû) ;
//   • les plus récemment actifs d'abord, jusqu'au plafond de la veille.

export const WATCH_INTERVAL_DAYS = 7;
// Premier passage : les biens vus sur le marché depuis 7 jours.
export const FIRST_WATCH_WINDOW_DAYS = 7;
// Mesuré le 06/11 : l'API ignore `fromCreatedAt` ; une recherche de veille facture 20 annonces au
// plus, les plus récemment arrivées d'abord (décision de Jean-Guy, 06/11).
export const WATCH_ADVERTS = 20;
// La veille ne prend jamais plus de la moitié du plafond de l'agence (décision du 06/11, garantie
// aussi par `start_buyer_watch`).
export const WATCH_SHARE_OF_AGENCY = 0.5;
export const DEFAULT_WATCH_CAP_CENTS = 1000;

export type WatchCandidate = {
  buyerId: string;
  ready: boolean;
  // Le dernier signe de vie de la fiche (ISO).
  lastActivityAt: string;
  // Le dernier passage terminé ou en cours (ISO), null s'il n'y en a pas.
  lastRunAt: string | null;
};

export function nextWatchOn(lastRunAt: string | null, now: Date): string {
  return lastRunAt ? addDays(parisDay(new Date(lastRunAt)), WATCH_INTERVAL_DAYS) : parisDay(now);
}

export function isWatchDue(candidate: WatchCandidate, now: Date): boolean {
  return candidate.ready && nextWatchOn(candidate.lastRunAt, now) <= parisDay(now);
}

// Les acquéreurs à chercher cette nuit, du plus récemment actif au plus ancien.
export function dueWatchBuyers(candidates: WatchCandidate[], now: Date): WatchCandidate[] {
  return candidates
    .filter((candidate) => isWatchDue(candidate, now))
    .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
}

// Les biens gardés sont ceux vus depuis le passage précédent ; le premier, depuis 7 jours.
export function watchSeenSince(lastDoneRunAt: string | null, now: Date): string {
  return (
    lastDoneRunAt ?? new Date(now.getTime() - FIRST_WATCH_WINDOW_DAYS * 86_400_000).toISOString()
  );
}

const dayLabel = (day: string): string => {
  const [, month, date] = day.split('-');
  return `${date}/${month}`;
};

// Sur la fiche : « Veille : dernière recherche le 04/11, prochaine le 11/11 », ou arrêtée.
export function watchLine(input: {
  ready: boolean;
  lastRunAt: string | null;
  now: Date;
  // Le plafond de la veille de l'agence est à 0 € : elle ne cherche pour personne.
  off?: boolean;
}): string {
  if (input.off) return 'Veille arrêtée : coupée par l’agence';
  if (!input.ready) return 'Veille arrêtée : pas prêt à visiter';
  const next = nextWatchOn(input.lastRunAt, input.now);
  const nextLabel = next <= parisDay(input.now) ? 'la nuit prochaine' : `le ${dayLabel(next)}`;
  if (!input.lastRunAt) return `Veille : première recherche ${nextLabel}`;
  return `Veille : dernière recherche le ${dayLabel(parisDay(new Date(input.lastRunAt)))}, prochaine ${nextLabel}`;
}

// Le plafond de la veille effectivement disponible : le sien, jamais plus de la moitié de celui de
// l'agence.
export function effectiveWatchCapCents(watchCapCents: number, agencyCapCents: number): number {
  return Math.max(0, Math.min(watchCapCents, Math.floor(agencyCapCents * WATCH_SHARE_OF_AGENCY)));
}

export type WatchBudgetState = 'off' | 'paused' | 'active';

// Pour le manager : « Veille coupée », « Veille en pause : forfait du mois atteint », sinon
// active ; le conseiller ne le voit pas. Lancement, mission 5 — jamais un montant.
export function watchBudgetState(input: {
  watchCapCents: number;
  agencyCapCents: number;
  watchSpentCents: number;
  agencySpentCents: number;
}): WatchBudgetState {
  const cap = effectiveWatchCapCents(input.watchCapCents, input.agencyCapCents);
  if (cap <= 0) return 'off';
  if (input.watchSpentCents >= cap || input.agencySpentCents >= input.agencyCapCents) {
    return 'paused';
  }
  return 'active';
}

export const WATCH_BUDGET_LABELS: Record<WatchBudgetState, string> = {
  off: 'Veille coupée',
  paused: 'Veille en pause : forfait du mois atteint',
  active: 'Veille active',
};

// Lancement, mission 5 — ce que la veille reprend quand le manager la rallume : son plafond par
// défaut, jamais plus de la moitié de celui de l'agence.
export function resumedWatchCapCents(agencyCapCents: number): number {
  return effectiveWatchCapCents(DEFAULT_WATCH_CAP_CENTS, agencyCapCents);
}

// Ce que l'opérateur peut régler : de 0 à la moitié du plafond de l'agence, en euros entiers.
export function parseWatchCapEuros(
  raw: unknown,
  agencyCapCents: number,
): { ok: true; cents: number } | { ok: false; error: string } {
  const text = typeof raw === 'string' ? raw.trim().replace(',', '.') : '';
  if (!/^\d{1,4}$/.test(text)) {
    return { ok: false, error: 'Indiquez un montant en euros entiers.' };
  }
  const cents = Number(text) * 100;
  const max = Math.floor(agencyCapCents * WATCH_SHARE_OF_AGENCY);
  if (cents > max) {
    return {
      ok: false,
      error: `La veille ne peut pas dépasser la moitié du plafond de recherche de l’agence : ${formatEuro(max / 100)} au plus.`,
    };
  }
  return { ok: true, cents };
}

// Un passage resté « en cours » plus d'une heure est tenu pour échoué (décision du 06/11).
export const STALE_RUN_MS = 60 * 60 * 1000;

// L'ordre de la nuit : les agences jamais servies d'abord, puis la moins récemment servie ; à
// égalité, l'ordre reçu.
export function orderAgenciesForWatch(
  agencyIds: string[],
  lastRunAt: ReadonlyMap<string, string>,
): string[] {
  return agencyIds
    .map((id, index) => ({ id, index, last: lastRunAt.get(id) ?? '' }))
    .sort((a, b) => a.last.localeCompare(b.last) || a.index - b.index)
    .map((entry) => entry.id);
}

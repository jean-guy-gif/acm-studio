import { NO_REASON_LABELS, type NoReason } from '@/features/buyer-deck/types';
import { parisDay } from '@/features/meeting-conclusion/services/follow-up-contacts';

// Mission 135 (§ 6) — « Ce mois-ci » sur la liste des acquéreurs, pour toute l'agence, sans
// classement entre conseillers : les biens proposés, les réponses, les visites du mois (de Paris).
// Pur.

// Le premier instant du mois de Paris (minuit à Paris, heure d'hiver comme d'été).
export function parisMonthStart(now: Date): Date {
  const [year, month] = parisDay(now).split('-').map(Number) as [number, number];
  const utcMidnight = Date.UTC(year, month - 1, 1);
  // L'heure de Paris à ce minuit UTC dit le décalage du jour (+1 ou +2).
  const parisHour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris',
      hour: '2-digit',
      hour12: false,
    }).format(new Date(utcMidnight)),
  );
  return new Date(utcMidnight - parisHour * 3_600_000);
}

export type BuyersMonth = { proposed: number; answers: number; visits: number };

export function buyersMonthLine(month: BuyersMonth): string {
  const plural = (count: number, one: string, many: string) => `${count} ${count > 1 ? many : one}`;
  return `Ce mois-ci : ${plural(month.proposed, 'bien proposé', 'biens proposés')} · ${plural(
    month.answers,
    'réponse',
    'réponses',
  )} · ${plural(month.visits, 'visite', 'visites')}`;
}

const ANSWER_LABELS = { visit: 'Veut le visiter', maybe: 'Peut-être', no: 'Pas pour moi' } as const;

// « Dernière réponse le 04/11 : Pas pour moi · Le prix ».
export function lastAnswerLabel(answer: { at: string; answer: string; reasons: string[] }): string {
  const [, month, day] = parisDay(new Date(answer.at)).split('-');
  const said = ANSWER_LABELS[answer.answer as keyof typeof ANSWER_LABELS] ?? 'Réponse';
  const reasons = answer.reasons
    .filter((reason): reason is NoReason => reason in NO_REASON_LABELS)
    .map((reason) => NO_REASON_LABELS[reason]);
  return `Dernière réponse le ${day}/${month} : ${[said, ...reasons].join(' · ')}`;
}

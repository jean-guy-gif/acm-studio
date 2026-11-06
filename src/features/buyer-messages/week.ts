import { addDays } from '@/features/meeting-conclusion/services/suivi-tasks';
import type { DismissReason } from '@/features/buyer-messages/templates/types';
import type { WeekFigures } from '@/features/buyer-messages/messages';
import { parisMidnightOf, parisMonday } from '@/lib/paris-time';

// Mission 139 — la semaine du point : le lundi, la tâche porte sur la semaine écoulée, du lundi
// 00:00 au dimanche 24:00, à Paris. Les chiffres viennent de ce qui est en base, rien d'inventé :
// les biens que la veille a gardés pour lui, ceux que le conseiller a écartés, ceux entrés dans sa
// sélection ou proposés, ses visites faites. « Étudiés » : l'union sans doublon des trois premiers
// (une recherche faite à la main n'est gardée nulle part : elle ne compte que par ses décisions).
// Pur.

export type CoveredWeek = { start: string; end: string; startAt: Date; endAt: Date };

// La semaine écoulée : du lundi de la semaine dernière au lundi de celle-ci (exclu).
export function coveredWeek(now: Date): CoveredWeek {
  const end = parisMonday(now);
  const start = addDays(end, -7);
  return { start, end, startAt: parisMidnightOf(start), endAt: parisMidnightOf(end) };
}

const within = (iso: string, week: CoveredWeek): boolean => {
  const at = new Date(iso).getTime();
  return at >= week.startAt.getTime() && at < week.endAt.getTime();
};

export type WeekFacts = {
  // Les biens gardés par la veille, par clé, avec le jour du passage.
  finds: { key: string; at: string }[];
  dismissals: { key: string; reason: DismissReason; at: string }[];
  // Entrés dans une sélection pour la première fois, ou proposés (M134).
  retained: { key: string; at: string }[];
  visits: { at: string }[];
};

export function weekFigures(facts: WeekFacts, week: CoveredWeek): WeekFigures {
  const finds = facts.finds.filter((fact) => within(fact.at, week));
  const dismissals = facts.dismissals.filter((fact) => within(fact.at, week));
  const retainedKeys = new Set(
    facts.retained.filter((fact) => within(fact.at, week)).map((fact) => fact.key),
  );
  const dismissed: Partial<Record<DismissReason, number>> = {};
  for (const fact of dismissals) dismissed[fact.reason] = (dismissed[fact.reason] ?? 0) + 1;
  const studied = new Set([
    ...finds.map((fact) => fact.key),
    ...dismissals.map((fact) => fact.key),
    ...retainedKeys,
  ]);
  return {
    studied: studied.size,
    dismissed,
    retained: retainedKeys.size,
    visits: facts.visits.filter((fact) => within(fact.at, week)).length,
  };
}

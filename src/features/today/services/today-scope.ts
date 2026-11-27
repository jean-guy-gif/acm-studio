import type { TodayScope } from '@/features/today/queries/get-today';

// La refonte, remarques de Jean-Guy (26/11) — Vendeurs et Acquéreurs suivent la vue choisie, comme
// « Aujourd'hui » (M145 B) : « Mes dossiers » (les tâches du conseiller, par défaut) ou « Toute
// l'agence » (un manager, et lui seul). Sur Acquéreurs, `?vue=agence` ouvre déjà la liste entière
// des fiches (M146 B, lot B) : la vue des pages « à faire » se dit donc `?agence=1`, sur les deux
// pages, et chaque lien de la page la garde. Pur.

export const AGENCY_SCOPE_PARAM = 'agence';

// La vue demandée par l'adresse ; `getToday` la ramène à « Mes dossiers » pour un conseiller.
export function scopeFromQuery(agence: string | undefined): TodayScope {
  return agence === '1' ? 'agency' : 'mine';
}

// Une adresse de la page, dans la vue où l'on est.
export function withScope(href: string, scope: TodayScope): string {
  if (scope !== 'agency') return href;
  const [path, hash] = href.split('#');
  const joined = `${path}${path!.includes('?') ? '&' : '?'}${AGENCY_SCOPE_PARAM}=1`;
  return hash === undefined ? joined : `${joined}#${hash}`;
}

// « Tous mes vendeurs » ou « Tous les vendeurs de l'agence », selon la vue (de même pour les
// acquéreurs) : le nombre qui suit compte ce que dit le libellé.
export function allPeopleLabel(people: 'vendeurs' | 'acquéreurs', scope: TodayScope): string {
  return scope === 'agency' ? `Tous les ${people} de l’agence` : `Tous mes ${people}`;
}

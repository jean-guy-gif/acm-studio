// Mission 139 — ce qu'un modèle de langue doit dire, champ par champ. Chaque langue écrit ses
// phrases en entier (aucune traduction automatique, aucune IA : décision du 23/10) ; le code ne fait
// qu'assembler, dans l'ordre, ce que le modèle a écrit. Pur.

export const VISIT_TAGS = [
  'district',
  'surface',
  'outdoor',
  'parking',
  'price',
  'works',
  'light',
  'overlooked',
  'noise',
  'pool',
  'other',
] as const;
export type VisitTag = (typeof VISIT_TAGS)[number];

export const VISIT_OPINIONS = ['love', 'interested', 'mixed', 'not_for_me'] as const;
export type VisitOpinion = (typeof VISIT_OPINIONS)[number];

export const VISIT_NEXT_STEPS = ['offer', 'second_visit', 'keep_searching'] as const;
export type VisitNextStep = (typeof VISIT_NEXT_STEPS)[number];

export const DISMISS_REASONS = [
  'terrace',
  'parking',
  'floor',
  'sector',
  'over_budget',
  'condition',
  'other',
] as const;
export type DismissReason = (typeof DISMISS_REASONS)[number];

export type PropertyKind = 'house' | 'apartment' | 'other';

// Les formes d'un nombre, selon les règles de pluriel de la langue (`Intl.PluralRules`) : « {n} »
// est remplacé par le nombre. Le russe a « few » et « many » ; les autres, « one » et « other ».
export type PluralForms = { one: string; other: string; few?: string; many?: string };

export type LanguageTemplates = {
  // La locale des dates et des listes (« 6 novembre », « la piscine et l'extérieur »).
  locale: string;
  greeting: (name: string) => string;
  // « la maison de Mougins » ; sans commune, « la maison ». Dans la forme que la phrase de
  // remerciement attend (le génitif en allemand et en russe).
  property: (kind: PropertyKind, city: string | null) => string;
  visit: {
    thanks: (property: string, day: string) => string;
    liked: (list: string) => string;
    disliked: (list: string) => string;
    next: Record<VisitNextStep, string>;
    // « autre » ne se dit pas dans un message : il est dans la note du conseiller.
    tags: Record<Exclude<VisitTag, 'other'>, { liked: string; disliked: string }>;
  };
  weekly: {
    intro: string;
    // Les chiffres de la semaine : chacun écrit avec ses formes, les raisons des biens écartés
    // entre parenthèses.
    lead: string;
    studied: PluralForms;
    dismissed: PluralForms;
    retained: PluralForms;
    visits: PluralForms;
    reasons: Record<DismissReason, string>;
    empty: string;
    closing: string;
  };
  meeting: { body: string };
};

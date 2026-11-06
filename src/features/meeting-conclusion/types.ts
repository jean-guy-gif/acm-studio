// Mission 53/54 — l'issue d'un rendez-vous et ses montants figés.

// Mission 54 — quatre issues. « Vendu ailleurs » (parti définitivement) et « retiré de la
// vente » (peut revenir) sont deux choses différentes pour un conseiller qui relance : on
// ne les fond pas en un seul « perdu ». Les quatre sont « le rendez-vous a eu lieu, le
// dossier est en Suivi » — projects.status reste meeting_completed dans les quatre cas.
export type ConclusionOutcome = 'signed' | 'follow_up' | 'sold_elsewhere' | 'withdrawn';

export const CONCLUSION_OUTCOMES: ConclusionOutcome[] = [
  'signed',
  'follow_up',
  'sold_elsewhere',
  'withdrawn',
];

export const OUTCOME_LABELS: Record<ConclusionOutcome, string> = {
  signed: 'Mandat signé',
  follow_up: 'À relancer',
  sold_elsewhere: 'Vendu ailleurs',
  withdrawn: 'Retiré de la vente',
};

// Mission 90 — le type de NOTRE mandat, quand l'issue est « mandat signé ». À ne pas confondre
// avec l'exclusivité d'un concurrent (M83). C'est ce qui permet de mesurer la promesse du
// produit : combien de rendez-vous finissent en mandat, dont combien en exclusif.
export const MANDATE_TYPES = ['exclusive', 'simple'] as const;
export type MandateType = (typeof MANDATE_TYPES)[number];

export const MANDATE_TYPE_LABELS: Record<MandateType, string> = {
  exclusive: 'Exclusif',
  simple: 'Simple',
};

export function isMandateType(value: unknown): value is MandateType {
  return (MANDATE_TYPES as readonly unknown[]).includes(value);
}

// Mission 96 — pourquoi relancer : le motif d'un dossier « à relancer », choisi parmi des boutons.
// La note libre du conseiller (`followUpReason`, M90) reste à côté, facultative.
export const FOLLOW_UP_MOTIVES = [
  'price_accepted',
  'thinking_price',
  'consulting_relative',
  'awaiting_estimate',
  'undated_project',
  'other',
] as const;
export type FollowUpMotive = (typeof FOLLOW_UP_MOTIVES)[number];

export const FOLLOW_UP_MOTIVE_LABELS: Record<FollowUpMotive, string> = {
  price_accepted: 'Prix accepté, signature à venir',
  thinking_price: 'Réfléchit au prix',
  consulting_relative: 'Veut en parler à un proche',
  awaiting_estimate: 'Attend un autre avis de valeur',
  undated_project: 'Projet pas encore daté',
  other: 'Autre',
};

export function isFollowUpMotive(value: unknown): value is FollowUpMotive {
  return (FOLLOW_UP_MOTIVES as readonly unknown[]).includes(value);
}

// Mission 110 — ce qui freine le vendeur, coché à la conclusion (plusieurs possibles), avec une
// ligne libre. Les objections s'ajoutent au motif de relance (M96), qui reste obligatoire.
export const OBJECTIONS = ['price', 'exclusivity', 'timing', 'other_agency', 'not_ready'] as const;
export type Objection = (typeof OBJECTIONS)[number];

export const OBJECTION_LABELS: Record<Objection, string> = {
  price: 'Le prix',
  exclusivity: 'L’exclusivité',
  timing: 'Le délai',
  other_agency: 'Une autre agence',
  not_ready: 'Projet pas mûr',
};

export const OBJECTION_NOTE_MAX = 200;

export function isObjection(value: unknown): value is Objection {
  return (OBJECTIONS as readonly unknown[]).includes(value);
}

// Ce que dit la ligne du Suivi : le libellé du motif, ou la ligne saisie pour « Autre ».
export function followUpMotiveLabel(
  motive: FollowUpMotive | null,
  detail: string | null,
): string | null {
  if (motive == null) {
    return null;
  }
  return motive === 'other' ? detail?.trim() || 'Autre' : FOLLOW_UP_MOTIVE_LABELS[motive];
}

// Les QUATRE montants, figés à l'instant de la conclusion (copies, jamais recalculées).
export type ConclusionAmounts = {
  marketComputed: number | null; // ① le marché CALCULÉ à partir des concurrents
  advisorAnalysis: number | null; // ② l'analyse comparative SAISIE par le conseiller
  advisorPrice: number | null; // ③ le prix conseillé VALIDÉ au positionnement
  commercializationPrice: number | null; // ④ le prix de commercialisation CONVENU
};

export type MeetingConclusion = ConclusionAmounts & {
  // Mission 82 — le prix que le vendeur avait en tête en début de rendez-vous, figé à la
  // conclusion (M56). Réservé au conseiller.
  sellerPerceivedPrice: number | null;
  // Mission 94 — le prix que le vendeur a reformulé après avoir vu le marché. Lu dans le résumé
  // du Live, où il est figé dès sa première valeur (M92) ; null s'il a passé l'écran.
  sellerRevisedPrice: number | null;
  // Mission 133 — le nombre d'acquéreurs prêts montrés au vendeur pendant le Live (la première
  // fois), lu dans le résumé du Live ; null s'ils n'ont pas été montrés. Réservé au conseiller.
  buyersShownCount?: number | null;
  // Mission 85 — la note du vendeur après le prix (1 à 10) : la première, la dernière, et
  // ce qui lui manquerait pour être à 10. Figées à la conclusion, réservées au conseiller.
  launchReadinessFirst: number | null;
  launchReadinessLast: number | null;
  launchReadinessMissing: string | null;
  outcome: ConclusionOutcome | null;
  // Mission 90 — le motif vaut pour « à relancer », « vendu ailleurs » et « retiré ».
  followUpReason: string | null;
  // Mission 96 — le motif de relance choisi (« à relancer » seulement) et la ligne de « Autre » ;
  // null = non renseigné (dossiers à relancer d'avant la mission : aucun motif n'est inventé).
  followUpMotive: FollowUpMotive | null;
  followUpMotiveDetail: string | null;
  // Mission 108 — la date de première relance, posée à la conclusion « à relancer ».
  nextFollowUpOn?: string | null;
  // Mission 110 — ce qui freine le vendeur, et la ligne libre.
  objections?: Objection[];
  objectionNote?: string | null;
  // Mission 90 — exclusif ou simple, pour un mandat signé ; null = non renseigné (dossiers
  // signés avant la mission : aucun type n'est inventé). Et la date de signature, écrite une fois.
  mandateType: MandateType | null;
  signedAt: string | null;
  concludedAt: string | null; // la date du rendez-vous
  outcomeChangedAt: string | null; // la date du dernier changement d'issue
};

// Les faits de l'avancement d'une fiche acquéreur, lus en base (`getBuyersProgress`). Mission 130 B
// — ses quatre étapes et sa prochaine étape se calculent dessus (`buyer-journey.ts`).
export type BuyerProgressFacts = {
  // La sélection la plus récente : son nombre de biens (retirés exclus), 0 sans sélection.
  selectionCount: number;
  presentedAt: string | null;
  // Un lien valable du dossier acquéreur pour cette sélection.
  linkCreated: boolean;
  // Sa réponse donnée depuis le lien, sur cette sélection.
  answeredOnLink: boolean;
  // Ses demandes de visite à organiser (ni annulées, ni faites), toutes sélections confondues.
  visitsToOrganize: number;
  // Mission 130 — les visites faites, et les dates des étapes (la fiche, la sélection, le lien,
  // sa réponse par le lien), pour le parcours, la prochaine étape et « Ce qui s'est passé ».
  visitsDone?: number;
  selectionAt?: string | null;
  linkAt?: string | null;
  answeredAt?: string | null;
  // Une lecture en échec : l'avancement n'est pas connu, la fiche le dit (M98).
  unread?: boolean;
};

export const NO_PROGRESS: BuyerProgressFacts = {
  selectionCount: 0,
  presentedAt: null,
  linkCreated: false,
  answeredOnLink: false,
  visitsToOrganize: 0,
};

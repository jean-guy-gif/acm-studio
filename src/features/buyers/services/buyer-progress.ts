import { buyerDateLabel } from '@/features/buyers/services/buyer-criteria';

// Essai de Jean-Guy (26/10) — « ni le créateur de l'outil ni un acquéreur ne trouvent leur chemin » :
// les trois étapes d'une fiche acquéreur, dans l'ordre, avec leur état, et l'étape suivante que
// le bouton de la liste propose. Pur ; les faits sont lus en base (`getBuyersProgress`).
//   1 · Biens idéaux : une sélection retenue (« Sélection : 3 biens ✓ ») ;
//   2 · Présenter la sélection : la présentation terminée (« Présentée le 25/10 ✓ ») ;
//   3 · Dossier acquéreur : un lien créé pour la sélection, puis sa réponse depuis le lien.
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

export type BuyerStepKey = 'ideal' | 'present' | 'buyerDossier' | 'visits';

export type BuyerStep = {
  key: BuyerStepKey;
  number: 1 | 2 | 3 | 4;
  title: string;
  // Ce qui est fait, avec « ✓ », ou ce qui reste à faire.
  states: string[];
  done: boolean;
  // Une étape n'est ouverte qu'une fois la sélection retenue (sauf la première).
  available: boolean;
};

const plural = (count: number, one: string, many: string): string =>
  `${count} ${count > 1 ? many : one}`;

// Essai de Jean-Guy (26/10) : une fois sa réponse reçue (sur le lien, ou des visites demandées en
// présentation), l'étape mise en avant devient « 4 · Visites : N visites à organiser ».
export const visitsStepShown = (facts: BuyerProgressFacts): boolean =>
  facts.answeredOnLink || (facts.presentedAt != null && facts.visitsToOrganize > 0);

const visitsLabel = (count: number): string =>
  count === 0
    ? 'Visites : aucune visite à organiser'
    : `Visites : ${plural(count, 'visite', 'visites')} à organiser`;

export function buyerSteps(facts: BuyerProgressFacts): BuyerStep[] {
  const hasSelection = facts.selectionCount > 0;
  const steps: BuyerStep[] = [
    {
      key: 'ideal',
      number: 1,
      title: 'Biens idéaux',
      states: hasSelection
        ? [`Sélection : ${plural(facts.selectionCount, 'bien', 'biens')} ✓`]
        : ['Aucune sélection retenue'],
      done: hasSelection,
      available: true,
    },
    {
      key: 'present',
      number: 2,
      title: 'Présenter la sélection',
      states: facts.presentedAt
        ? [`Présentée le ${buyerDateLabel(facts.presentedAt)} ✓`]
        : [hasSelection ? 'À présenter' : 'Après la sélection'],
      done: facts.presentedAt != null,
      available: hasSelection,
    },
    {
      key: 'buyerDossier',
      number: 3,
      title: 'Dossier acquéreur',
      states: !hasSelection
        ? ['Après la sélection']
        : [
            facts.linkCreated ? 'Lien créé ✓' : 'Lien à créer',
            ...(facts.answeredOnLink
              ? ['Réponse reçue ✓']
              : facts.linkCreated
                ? ['Réponse attendue']
                : []),
          ],
      done: facts.answeredOnLink,
      available: hasSelection,
    },
  ];
  if (visitsStepShown(facts)) {
    steps.push({
      key: 'visits',
      number: 4,
      title: visitsLabel(facts.visitsToOrganize),
      states: [],
      done: false,
      available: true,
    });
  }
  return steps;
}

export type BuyerNextStep = { label: string; href: string; step: BuyerStepKey };

// Le bouton d'une carte de la liste : l'étape suivante, dans l'ordre des trois.
export function buyerNextStep(buyerId: string, facts: BuyerProgressFacts): BuyerNextStep {
  if (visitsStepShown(facts)) {
    return facts.visitsToOrganize > 0
      ? { label: 'Organiser les visites', href: '/visites', step: 'visits' }
      : {
          label: 'Voir sa réponse',
          href: `/acquereurs/${buyerId}#reponses`,
          step: 'visits',
        };
  }
  if (facts.selectionCount === 0) {
    return {
      label: 'Trouver les biens idéaux',
      href: `/acquereurs/${buyerId}/biens-ideaux`,
      step: 'ideal',
    };
  }
  if (facts.presentedAt == null) {
    return { label: 'Présenter', href: `/presentation/${buyerId}`, step: 'present' };
  }
  if (!facts.linkCreated) {
    return { label: 'Créer le lien', href: `/acquereurs/${buyerId}/dossier`, step: 'buyerDossier' };
  }
  return {
    label: 'Voir sa réponse',
    href: `/acquereurs/${buyerId}#reponses`,
    step: 'buyerDossier',
  };
}

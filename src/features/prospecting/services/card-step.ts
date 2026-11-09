import type { ProspectingStep } from '@/features/competitor-mandate/services/mandate-columns';
import type {
  ProspectingMove,
  ProspectingStatus,
} from '@/features/prospecting/services/prospecting-status';

// Mission 146 (partie B, C9, planche B3) — une carte de Prospection : UNE prochaine étape en
// contour et au plus un lien ; le reste dans « … » — Corriger l'adresse · Pas intéressé · Annuler
// · Ne plus solliciter… (en rouge, sa confirmation de M98). Aucun bouton plein sur les cartes. Pur.
//   • à confirmer → « Confirmer l'adresse » (ses choix de M84) ;
//   • prêt → « Préparer le dossier », lien « Marquer remis » (confrère : « Marquer contacté ») ;
//   • remis → « RDV obtenu » (confrère : « Collaboration obtenue », lien « Refusée ») ;
//   • rendez-vous → « Mandat rentré » ;
//   • « à vérifier » : ses pastilles « Vendu par » / « Exclusivité » sont son étape (M83).

export type CardMove = { move: ProspectingMove; label: string };

export type CardMain =
  | { kind: 'confirm_address' }
  | { kind: 'prepare' }
  | { kind: 'check' }
  | { kind: 'move'; move: CardMove }
  | null;

export type CardStep = {
  main: CardMain;
  link: CardMove | null;
  menu: {
    address: 'confirm' | 'correct' | null;
    decline: boolean;
    undo: boolean;
    oppose: boolean;
  };
};

const DECLINABLE: readonly ProspectingStatus[] = ['to_confirm', 'ready', 'handed', 'meeting'];
const UNDOABLE: readonly ProspectingStatus[] = [
  'handed',
  'meeting',
  'mandate',
  'collaboration',
  'declined',
];

export function prospectingCardStep(input: {
  status: ProspectingStatus;
  step: ProspectingStep;
  opposed: boolean;
  addressConfirmed: boolean;
  // Mission 115 — un refus de collaboration posé : s'il est le dernier fait, il s'annule.
  refusedCollaboration: boolean;
}): CardStep {
  const { status, step } = input;
  if (input.opposed) {
    return {
      main: null,
      link: null,
      menu: { address: null, decline: false, undo: false, oppose: false },
    };
  }
  const colleague = step === 'colleague';
  let main: CardMain = null;
  let link: CardMove | null = null;
  if (status === 'to_confirm' || status === 'ready') {
    if (step === 'check') {
      main = { kind: 'check' };
    } else if (colleague) {
      // Le dossier au confrère n'attend pas l'adresse (M84, M98).
      main = { kind: 'prepare' };
      link = { move: 'handed', label: 'Marquer contacté' };
    } else if (status === 'to_confirm') {
      main = { kind: 'confirm_address' };
    } else {
      main = { kind: 'prepare' };
      link = { move: 'handed', label: 'Marquer remis' };
    }
  } else if (status === 'handed') {
    if (colleague) {
      main = { kind: 'move', move: { move: 'collaboration', label: 'Collaboration obtenue' } };
      link = { move: 'collaboration_declined', label: 'Refusée' };
    } else {
      main = { kind: 'move', move: { move: 'meeting', label: 'RDV obtenu' } };
    }
  } else if (status === 'meeting') {
    main = { kind: 'move', move: { move: 'mandate', label: 'Mandat rentré' } };
  }
  const addressOpen = status !== 'declined' && status !== 'collaboration';
  return {
    main,
    link,
    menu: {
      address:
        !addressOpen || main?.kind === 'confirm_address'
          ? null
          : input.addressConfirmed
            ? 'correct'
            : 'confirm',
      decline: DECLINABLE.includes(status),
      undo:
        UNDOABLE.includes(status) ||
        (input.refusedCollaboration && (status === 'ready' || status === 'to_confirm')),
      oppose: true,
    },
  };
}

// Mission 146 (partie B) — une colonne vide ne s'affiche pas ; les autres prennent la place.
export function boardGridClass(columns: number): string {
  switch (columns) {
    case 1:
      return 'grid-cols-1';
    case 2:
      return 'grid-cols-1 @2xl:grid-cols-2';
    case 3:
      return 'grid-cols-1 @2xl:grid-cols-2 @5xl:grid-cols-3';
    default:
      return 'grid-cols-1 @2xl:grid-cols-2 @5xl:grid-cols-4';
  }
}

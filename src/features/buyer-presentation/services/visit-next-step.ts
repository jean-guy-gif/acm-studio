import { outsideNote } from '@/features/visit-voucher/services/outside-mandate';
import type { VisitAction, VisitLetterState } from '@/features/buyer-prospecting/types';

// Mission 146 (partie B, I10, planche B1) — le chemin d'une visite et SA prochaine étape, une
// seule, en contour (Visites n'a aucun bouton plein, M120 B) ; le reste en liens. Pur.
//   • Un bien qui n'est pas à l'agence (concurrent, annonce, bien démarché sans mandat rentré ni
//     collaboration obtenue) : écrire au propriétaire ou au confrère (« À qui écrire ? » quand
//     l'exclusivité est inconnue, M120 B), puis attendre sa réponse (lue sur la carte de
//     Prospection), puis confirmer la visite, puis visite faite.
//   • Un bien de l'agence (mandat signé, mandat rentré, collaboration obtenue, M137 A) : confirmer
//     la visite (jour et heure, M142), signer le bon de visite, visite faite (le compte rendu, M139).
//   • Une visite faite : l'offre d'achat si « Offre envisagée », sinon ses messages prêts.

export type VisitStepKind =
  // Écrire : préparer le courrier au propriétaire ou le dossier au confrère (ou choisir).
  | 'write'
  // Le courrier est préparé, pas encore remis (ou l'adresse est à confirmer) : l'ouvrir.
  | 'open_letter'
  // Remis, contacté, rendez-vous : attendre le propriétaire ou le confrère, sur sa carte.
  | 'wait'
  // Un vendeur à relancer (M86) : le rappeler, « j'ai un acquéreur ».
  | 'call_seller'
  | 'confirm'
  | 'voucher'
  | 'visit_done'
  | 'offer'
  | 'messages'
  // Rien à faire ici : le propriétaire ne veut plus être sollicité, ou n'est pas intéressé.
  | 'closed'
  | 'none';

export type VisitTrackStep = { key: string; label: string; status: 'done' | 'now' | 'later' };

export type VisitNextStep = {
  // Le bien est-il à l'agence (il porte un bon de visite, M137 A) ?
  agency: boolean;
  track: VisitTrackStep[];
  step: VisitStepKind;
  // Ce qu'un lien discret propose en plus de l'étape.
  links: {
    confirm: 'confirm' | 'change' | null;
    visitDone: boolean;
    proposeToSeller: boolean;
    voucher: boolean;
    messages: boolean;
    // Mission 153 — le chemin court d'un bien hors mandat : écrire au propriétaire ou au confrère
    // reste possible, en liens.
    write: boolean;
  };
};

export type VisitNextStepInput = {
  done: boolean;
  outcome: string | null;
  scheduledAt: string | null;
  voucherSigned: boolean;
  // Le compte rendu de la visite faite porte une suite : ses messages sont prêts (M139).
  hasReport: boolean;
  action: VisitAction;
  // Le courrier déjà préparé pour ce bien, et son état relu sur la carte (M120).
  letterPrepared: boolean;
  letterState: VisitLetterState;
  // À qui s'adresse le courrier préparé (M120 B).
  colleague: boolean;
  // Mission 153 — un bien hors mandat (annonce du marché, concurrent) peut porter un bon de visite,
  // au titre du mandat de recherche ou de la collaboration (`HORS_MANDAT_OUVERT`).
  outside?: boolean;
};

const WRITE_LABELS = {
  owner: 'Écrire au propriétaire',
  colleague: 'Écrire au confrère',
} as const;

function track(steps: [string, string][], now: number, doneKeys: ReadonlySet<string> = new Set()) {
  return steps.map(([key, label], index): VisitTrackStep => {
    const status = doneKeys.has(key) || index < now ? 'done' : index === now ? 'now' : 'later';
    return { key, label, status };
  });
}

export function visitNextStep(input: VisitNextStepInput): VisitNextStep {
  const agency = input.action.kind === 'propose_visit' || input.letterState.kind === 'done';
  // Hors mandat, un bon de visite est possible tant que le propriétaire n'a pas fermé la porte.
  const outsideVoucher = input.outside === true && !agency && input.letterState.kind !== 'closed';
  const proposeToSeller = input.action.kind === 'propose_visit';
  const scheduled = input.scheduledAt != null;

  if (input.done) {
    const offer = input.outcome === 'offer';
    const step: VisitStepKind = offer ? 'offer' : input.hasReport ? 'messages' : 'none';
    const steps: [string, string][] =
      agency || outsideVoucher
        ? [
            ['confirm', 'Confirmer la visite'],
            ['voucher', 'Bon de visite'],
            ['done', 'Visite faite'],
          ]
        : [
            ['confirm', 'Confirmer la visite'],
            ['done', 'Visite faite'],
          ];
    // Une visite faite : chaque étape d'avant est passée, sauf un bon jamais signé (un fait, rien
    // n'est supposé) ; il se signe encore, en lien.
    const doneKeys = new Set(['confirm', 'done', ...(input.voucherSigned ? ['voucher'] : [])]);
    return {
      agency,
      track: steps.map(([key, label]) => ({
        key,
        label,
        status: doneKeys.has(key) ? 'done' : 'later',
      })),
      step,
      links: {
        confirm: null,
        visitDone: false,
        proposeToSeller: false,
        voucher: (agency || outsideVoucher) && !input.voucherSigned,
        messages: offer && input.hasReport,
        write: false,
      },
    };
  }

  if (agency) {
    const steps: [string, string][] = [
      ['confirm', 'Confirmer la visite'],
      ['voucher', 'Bon de visite'],
      ['done', 'Visite faite'],
    ];
    const now = input.voucherSigned ? 2 : scheduled ? 1 : 0;
    const step: VisitStepKind = input.voucherSigned
      ? 'visit_done'
      : scheduled
        ? 'voucher'
        : 'confirm';
    return {
      agency,
      track: track(steps, now, input.voucherSigned ? new Set(['confirm', 'voucher']) : undefined),
      step,
      links: {
        confirm: step === 'confirm' ? null : scheduled ? 'change' : 'confirm',
        visitDone: step !== 'visit_done',
        proposeToSeller,
        voucher: false,
        messages: false,
        write: false,
      },
    };
  }

  const links = (step: VisitStepKind) => ({
    confirm: step === 'confirm' ? null : scheduled ? ('change' as const) : ('confirm' as const),
    visitDone: step !== 'visit_done',
    proposeToSeller: false,
    voucher: false,
    messages: false,
    write: false,
  });

  // Un vendeur à relancer (M86) : le rappeler d'abord.
  if (input.action.kind === 'call_seller') {
    const steps: [string, string][] = [
      ['call', 'Rappeler le vendeur'],
      ['confirm', 'Confirmer la visite'],
      ['done', 'Visite faite'],
    ];
    const step: VisitStepKind = scheduled ? 'visit_done' : 'call_seller';
    return { agency, track: track(steps, scheduled ? 2 : 0), step, links: links(step) };
  }

  const writing =
    input.action.kind === 'owner_letter' ||
    input.action.kind === 'colleague_letter' ||
    input.action.kind === 'choose' ||
    input.letterPrepared;
  // Mission 153 (planche M153-1) — hors mandat, sans courrier préparé : le chemin court, confirmer,
  // le bon de visite, visite faite ; écrire au propriétaire ou au confrère reste en liens.
  if (outsideVoucher && writing && !input.letterPrepared) {
    const steps: [string, string][] = [
      ['confirm', 'Confirmer la visite'],
      ['voucher', 'Bon de visite'],
      ['done', 'Visite faite'],
    ];
    const now = input.voucherSigned ? 2 : scheduled ? 1 : 0;
    const step: VisitStepKind = input.voucherSigned
      ? 'visit_done'
      : scheduled
        ? 'voucher'
        : 'confirm';
    return {
      agency,
      track: track(steps, now, input.voucherSigned ? new Set(['confirm', 'voucher']) : undefined),
      step,
      links: { ...links(step), write: true },
    };
  }
  if (!writing) {
    // Un dossier qui n'est ni un mandat signé ni à relancer : confirmer, puis visite faite.
    const steps: [string, string][] = [
      ['confirm', 'Confirmer la visite'],
      ['done', 'Visite faite'],
    ];
    const step: VisitStepKind = scheduled ? 'visit_done' : 'confirm';
    return { agency, track: track(steps, scheduled ? 1 : 0), step, links: links(step) };
  }

  const toColleague = input.letterPrepared
    ? input.colleague
    : input.action.kind === 'colleague_letter';
  const steps: [string, string][] = [
    ['write', WRITE_LABELS[toColleague ? 'colleague' : 'owner']],
    ['answer', toColleague ? 'Réponse du confrère' : 'Réponse du propriétaire'],
    ['confirm', 'Confirmer la visite'],
    // Mission 153 — hors mandat, le bon de visite a sa place dans le chemin du courrier aussi.
    ...(outsideVoucher ? ([['voucher', 'Bon de visite']] as [string, string][]) : []),
    ['done', 'Visite faite'],
  ];
  const writeLinks = (step: VisitStepKind) => ({
    ...links(step),
    voucher: outsideVoucher && !input.voucherSigned,
  });
  const state = input.letterState;
  if (state.kind === 'closed') {
    return { agency, track: track(steps, 1), step: 'closed', links: links('closed') };
  }
  if (!input.letterPrepared) {
    return { agency, track: track(steps, 0), step: 'write', links: writeLinks('write') };
  }
  if (state.kind === 'handed' || state.kind === 'waiting') {
    return { agency, track: track(steps, 1), step: 'wait', links: writeLinks('wait') };
  }
  return { agency, track: track(steps, 0), step: 'open_letter', links: writeLinks('open_letter') };
}

// Pourquoi ni bon de visite ni offre d'achat ne sont proposés sur un bien du marché (concurrent ou
// annonce) qui n'est pas encore à l'agence : une ligne grise, sans bouton, tant que la fonction hors
// mandat n'est pas ouverte (Jean-Guy, 12/11). Rien pour un bien de l'agence, un dossier vendeur, ni
// un propriétaire qui ne veut plus être sollicité.
export const OUTSIDE_MANDATE_NOTE =
  'Pas de bon de visite ni d’offre d’achat ici pour l’instant : ce bien n’est pas sous mandat de l’agence. Ils viennent avec la collaboration du confrère ou un mandat rentré, sur sa carte de Prospection.';

export function outsideMandateNote(
  source: 'project' | 'competitor' | 'listing',
  next: Pick<VisitNextStep, 'agency' | 'step'>,
  // Mission 153 — la fonction ouverte, la ligne dit ce que le bon demandera, tant qu'il n'est pas
  // signé.
  opened: { buyerName: string; voucherSigned: boolean } | null = null,
): string | null {
  if (source === 'project' || next.agency || next.step === 'closed') return null;
  if (opened) return opened.voucherSigned ? null : outsideNote(opened.buyerName);
  return OUTSIDE_MANDATE_NOTE;
}

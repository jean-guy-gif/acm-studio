import { parisDay } from '@/features/meeting-conclusion/services/follow-up-contacts';
import {
  buyerInSentence,
  lateLabel,
} from '@/features/meeting-conclusion/services/suivi-step-labels';
import {
  addMonths,
  DEED_NOTICE_DAYS,
  MANDATE_MONTHS_MAX,
  RENEWAL_NOTICE_DAYS,
} from '@/features/mandate-life/services/mandate-dates';
import { mandatePrice } from '@/features/mandate-life/services/mandate-price';
import type {
  MandateAmendment,
  MandateLife,
  MandateOffer,
  MandateStage,
} from '@/features/mandate-life/types';
import { formatEuro, formatPercent, formatRelativeDay, formatRelativeSince } from '@/lib/format';

// Lot C (maquette C0, validée par Jean-Guy le 28/11) — « Son mandat » sur la fiche du dossier,
// pour le conseiller seul : « Le mandat » (sa fin et sa reconduction tacite, son prix et ses
// avenants, l'offre acceptée, le compromis, la vente), ses deux sorties, et la prochaine étape que
// le mandat donne au dossier — la même que les tâches d'« Aujourd'hui » (`suivi-tasks.ts`). Les
// saisies s'ouvrent sur place, par l'adresse (`?mandat=…#son-mandat`) ; une confirmation, dans
// l'écran (M146). Les dates du conseiller, relatives (M143). Pur.

export const MANDATE_FORMS = [
  'fin',
  'avenant',
  'compromis',
  'ailleurs',
  'vente',
  'terminer',
] as const;
export type MandateFormKey = (typeof MANDATE_FORMS)[number];
export type MandateConfirmKey = 'retirer-avenant' | 'tombe' | 'annuler-fin';

export type MandateAction =
  | { kind: 'form'; form: MandateFormKey; label: string }
  | { kind: 'confirm'; confirm: MandateConfirmKey; label: string }
  | { kind: 'link'; href: string; label: string };

export type MandateRowKey =
  'end' | 'price' | 'offer' | 'compromise' | 'sale' | 'gap' | 'delay' | 'market' | 'ended';

export type MandateRow = {
  key: MandateRowKey;
  label: string;
  value: string;
  history: string | null;
  // Orange : à regarder (la fin du mandat dans les 30 jours).
  watch: boolean;
  actions: MandateAction[];
};

export type MandateNext = {
  title: string;
  late: string | null;
  phrase: string;
  action: { label: string; href: string; filled: boolean } | null;
};

export type MandateSheet = {
  line: string;
  rows: MandateRow[];
  exits: MandateAction[];
  // null : le mandat ne change pas la prochaine étape du dossier.
  next: MandateNext | null;
  forms: MandateFormKey[];
};

export type MandateSheetInput = {
  projectId: string;
  stage: MandateStage;
  mandateType: string | null;
  signedAt: string | null;
  signedPrice: number | null;
  amendments: readonly MandateAmendment[];
  offer: MandateOffer | null;
  life: MandateLife;
  // L'acquéreur du compromis, s'il est de l'agence et n'est pas celui de l'offre (relu en base).
  compromiseBuyerName: string | null;
  now: Date;
};

const MANDATE_TYPES: Record<string, string> = { exclusive: 'exclusif', simple: 'simple' };

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
const shiftDay = (day: string, days: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const inDays = (days: number) =>
  days <= 0 ? 'aujourd’hui' : days === 1 ? 'demain' : `dans ${days} jours`;

// Un document daté (« l'avenant du 14/11 », « jusqu'au 28/01/2027 ») : le jour, l'année quand ce
// n'est pas celle d'aujourd'hui.
function dated(day: string, today: string): string {
  const [year, month, date] = day.split('-');
  return year === today.slice(0, 4) ? `${date}/${month}` : `${date}/${month}/${year}`;
}

function monthsAfter(signedOn: string, endsOn: string): number | null {
  for (let months = 1; months <= MANDATE_MONTHS_MAX; months += 1) {
    if (addMonths(signedOn, months) === endsOn) return months;
  }
  return null;
}

const capitalized = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

export function mandateSheet(input: MandateSheetInput): MandateSheet {
  const { stage, life, offer, now } = input;
  const today = parisDay(now);
  const day = (value: string) => formatRelativeDay(value, now);
  const signedOn = input.signedAt ? parisDay(new Date(input.signedAt)) : null;
  const price = mandatePrice(input.signedPrice, [...input.amendments]);
  const living = stage === 'signed' || stage === 'offer_accepted';
  const rows: MandateRow[] = [];
  const row = (key: MandateRowKey, label: string, value: string, extra: Partial<MandateRow> = {}) =>
    rows.push({ key, label, value, history: null, watch: false, actions: [], ...extra });
  const compromiseBuyer =
    life.buyerOrigin === 'outside'
      ? 'acquéreur venu d’ailleurs'
      : life.compromiseBuyerId && offer && life.compromiseBuyerId === offer.buyerId
        ? offer.buyerName
        : input.compromiseBuyerName;

  // La fin du mandat, tant qu'il vit ; dans les 30 jours (sauf sous compromis, question 19), elle
  // se dit en orange.
  const renewalDue =
    living && life.endsOn != null && today >= shiftDay(life.endsOn, -RENEWAL_NOTICE_DAYS);
  if (stage !== 'sold' && stage !== 'ended') {
    let value = 'à renseigner';
    if (life.endsOn) {
      const months = signedOn ? monthsAfter(signedOn, life.endsOn) : null;
      const left = daysBetween(today, life.endsOn);
      value = renewalDue
        ? [
            `le ${dated(life.endsOn, today)}`,
            life.tacitRenewal ? 'reconduction tacite' : null,
            left >= 0 ? inDays(left) : 'date passée',
          ]
            .filter(Boolean)
            .join(' · ')
        : `le ${dated(life.endsOn, today)}${months ? `, ${months} mois après la signature` : ''}${life.tacitRenewal ? ' · reconduction tacite' : ''}`;
    }
    row('end', 'Fin du mandat', value, {
      watch: renewalDue,
      actions: [{ kind: 'form', form: 'fin', label: life.endsOn ? 'Modifier' : 'Renseigner' }],
    });

    const last = price.lastAmendment;
    const priceValue =
      price.current == null
        ? 'non renseigné'
        : last
          ? `${formatEuro(price.current)} depuis l’avenant du ${dated(last.amendedOn, today)}`
          : `${formatEuro(price.current)} à la signature`;
    const before = price.history.slice(0, -1);
    const history =
      last && input.signedPrice != null
        ? [
            `${formatEuro(input.signedPrice)} à la signature${input.signedAt ? `, ${day(input.signedAt)}` : ''}`,
            ...before.map((step) => `${formatEuro(step.price)} le ${dated(step.on, today)}`),
          ].join(' → ')
        : null;
    row('price', 'Prix du mandat', priceValue, {
      history,
      actions: living
        ? [
            { kind: 'form', form: 'avenant', label: 'Ajouter un avenant de baisse' },
            ...(last
              ? [
                  {
                    kind: 'confirm' as const,
                    confirm: 'retirer-avenant' as const,
                    label: 'Retirer le dernier avenant',
                  },
                ]
              : []),
          ]
        : [],
    });
  }

  if (offer && (stage === 'offer_accepted' || stage === 'under_compromise')) {
    row(
      'offer',
      'Offre acceptée',
      [offer.price != null ? formatEuro(offer.price) : null, offer.buyerName, day(offer.acceptedAt)]
        .filter(Boolean)
        .join(' · '),
      {
        actions:
          offer.buyerId && offer.documentId
            ? [
                {
                  kind: 'link',
                  href: `/acquereurs/${offer.buyerId}/offre/${offer.documentId}`,
                  label: 'Voir l’offre',
                },
              ]
            : [],
      },
    );
  }

  if (stage === 'under_compromise' && life.compromiseSignedOn && life.deedPlannedOn) {
    row(
      'compromise',
      'Compromis',
      [
        `signé ${day(life.compromiseSignedOn)}`,
        `acte prévu le ${dated(life.deedPlannedOn, today)}`,
        compromiseBuyer,
      ]
        .filter(Boolean)
        .join(' · '),
      {
        actions: [
          { kind: 'form', form: 'compromis', label: 'Modifier' },
          { kind: 'form', form: 'vente', label: 'Noter la vente' },
          { kind: 'confirm', confirm: 'tombe', label: 'Le compromis est tombé' },
        ],
      },
    );
  }

  // Retouche 3 — le Point marché s'arrête dès l'offre acceptée (au compromis, sans offre dans ACM).
  if (stage === 'offer_accepted' && offer) {
    row(
      'market',
      'Point marché',
      `arrêté à l’offre acceptée, ${day(offer.acceptedAt)} · il reprend si l’offre tombe`,
    );
  } else if (stage === 'under_compromise') {
    row(
      'market',
      'Point marché',
      offer
        ? `arrêté à l’offre acceptée, ${day(offer.acceptedAt)}`
        : `arrêté au compromis${life.compromiseSignedOn ? `, ${day(life.compromiseSignedOn)}` : ''} · il reprend si le compromis tombe`,
    );
  }

  if (stage === 'sold' && life.deedSignedOn && life.salePrice != null) {
    row(
      'sale',
      'Vente',
      [
        formatEuro(life.salePrice),
        `acte ${day(life.deedSignedOn).replace(/^le /, 'du ')}`,
        compromiseBuyer,
      ]
        .filter(Boolean)
        .join(' · '),
      { actions: [{ kind: 'form', form: 'vente', label: 'Modifier' }] },
    );
    if (price.current != null && price.current > 0) {
      const gap = ((life.salePrice - price.current) / price.current) * 100;
      row(
        'gap',
        'Écart',
        `${formatPercent(gap, { maxDecimals: 1, signed: true })} sur le prix du mandat (${formatEuro(price.current)})`,
      );
    }
    if (signedOn && life.compromiseSignedOn) {
      const days = daysBetween(signedOn, life.compromiseSignedOn);
      row('delay', 'Du mandat au compromis', days === 1 ? '1 jour' : `${days} jours`);
    }
  }

  if (stage === 'ended' && life.endedOn) {
    row('ended', 'Fin', `Mandat terminé sans vente, ${day(life.endedOn)}`, {
      actions: [{ kind: 'confirm', confirm: 'annuler-fin', label: 'Annuler' }],
    });
  }

  const exits: MandateAction[] = living
    ? [
        { kind: 'form', form: 'ailleurs', label: 'Vendu à un acquéreur venu d’ailleurs' },
        ...(stage === 'signed'
          ? [
              {
                kind: 'form' as const,
                form: 'terminer' as const,
                label: 'Mandat terminé sans vente',
              },
            ]
          : []),
      ]
    : [];

  // Les saisies de l'étape, celles que le serveur accepte (`gestureAllowed`).
  const forms: MandateFormKey[] = [];
  if (living || stage === 'under_compromise') forms.push('fin', 'compromis');
  if (living) forms.push('avenant', 'ailleurs');
  if (stage === 'under_compromise' || stage === 'sold') forms.push('vente');
  if (stage === 'signed') forms.push('terminer');

  const signedLine = [
    'Mandat',
    input.mandateType ? MANDATE_TYPES[input.mandateType] : null,
    'signé',
    input.signedAt ? day(input.signedAt) : null,
  ]
    .filter(Boolean)
    .join(' ');
  const line =
    life.endsOn && stage !== 'sold' && stage !== 'ended'
      ? `${signedLine} · jusqu’au ${dated(life.endsOn, today)}`
      : signedLine;

  return { line, rows, exits, next: nextOf(input, today, renewalDue), forms };
}

function nextOf(input: MandateSheetInput, today: string, renewalDue: boolean): MandateNext | null {
  const { stage, life, offer, now, projectId } = input;
  const day = (value: string) => formatRelativeDay(value, now);
  const href = (form: MandateFormKey) => `/builder/${projectId}?mandat=${form}#son-mandat`;
  const suivi = { label: 'Voir le Suivi', href: '/suivi', filled: false };

  if (stage === 'sold' && life.deedSignedOn) {
    return {
      title: 'Voir le Suivi',
      late: null,
      phrase: `Vendu ${day(life.deedSignedOn)} par l’agence : sa suite vit dans le Suivi, sous « Vendus par l’agence ».`,
      action: suivi,
    };
  }
  if (stage === 'ended' && life.endedOn) {
    return {
      title: 'Voir le Suivi',
      late: null,
      phrase: `Le mandat s’est terminé ${day(life.endedOn)} sans vente : le dossier rejoint « Vendus ailleurs · retirés · terminés ».`,
      action: suivi,
    };
  }
  if (stage === 'under_compromise' && life.deedPlannedOn) {
    const planned = life.deedPlannedOn;
    if (today >= planned) {
      return {
        title: 'Noter la vente',
        late: today > planned ? lateLabel(daysBetween(planned, today)) : null,
        phrase:
          today === planned
            ? 'L’acte est prévu aujourd’hui : une fois signé, notez sa date et le prix de vente.'
            : `L’acte était prévu le ${dated(planned, today)} : notez sa date et le prix de vente.`,
        action: { label: 'Noter la vente', href: href('vente'), filled: true },
      };
    }
    const notice = shiftDay(planned, -DEED_NOTICE_DAYS);
    if (today >= notice) {
      return {
        title: 'Préparer l’acte',
        late: null,
        phrase: `L’acte est prévu le ${dated(planned, today)} chez le notaire, ${inDays(daysBetween(today, planned))}. Une fois signé, notez sa date et le prix de vente.`,
        action: null,
      };
    }
    return {
      title: `Préparer l’acte · ${day(notice)}`,
      late: null,
      phrase: `L’acte est prévu le ${dated(planned, today)} chez le notaire. Quinze jours avant, la préparation de l’acte arrive dans « Aujourd’hui ».`,
      action: null,
    };
  }
  if (stage === 'offer_accepted' && offer) {
    return {
      title: 'Noter le compromis',
      late: null,
      phrase: `L’offre de ${buyerInSentence(offer.buyerName)} est acceptée ${formatRelativeSince(offer.acceptedAt, now)}${offer.price != null ? `, à ${formatEuro(offer.price)}` : ''}. Notez la date du compromis et la date prévue de l’acte : le dossier passera « Sous compromis ».`,
      action: { label: 'Noter le compromis', href: href('compromis'), filled: true },
    };
  }
  if (stage === 'signed' && renewalDue && life.endsOn) {
    const left = daysBetween(today, life.endsOn);
    const late = left < 0 ? lateLabel(-left) : null;
    const tacit = life.tacitRenewal;
    let phrase: string;
    if (left >= 0) {
      phrase = tacit
        ? `Le mandat se reconduit tacitement ${day(life.endsOn)}, ${inDays(left)}. Faites le point avec le vendeur avant cette date.`
        : `Le mandat se termine ${day(life.endsOn)}, ${inDays(left)}. Préparez son renouvellement avec le vendeur, puis notez sa nouvelle fin.`;
    } else {
      phrase = tacit
        ? `La date de reconduction tacite est passée (${day(life.endsOn)}) : notez la nouvelle fin du mandat.`
        : `Le mandat s’est terminé ${day(life.endsOn)} : renouvelez-le, ou notez sa fin sans vente.`;
    }
    return {
      title: tacit ? 'Faire le point avant la reconduction' : 'Préparer le renouvellement',
      late,
      phrase: capitalized(phrase),
      action: {
        label: tacit ? 'Faire le point' : 'Préparer le renouvellement',
        href: href('fin'),
        filled: true,
      },
    };
  }
  return null;
}

// La saisie que l'adresse demande d'ouvrir, si elle est de l'étape ; sinon aucune.
export function mandateFormOf(
  value: string | string[] | undefined,
  sheet: Pick<MandateSheet, 'forms'>,
): MandateFormKey | null {
  if (typeof value !== 'string') return null;
  return (sheet.forms as readonly string[]).includes(value) ? (value as MandateFormKey) : null;
}

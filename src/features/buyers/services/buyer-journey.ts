import { buyerDateLabel } from '@/features/buyers/services/buyer-criteria';
import { parisDay } from '@/features/meeting-conclusion/services/follow-up-contacts';
import { daysBetween } from '@/features/meeting-conclusion/services/suivi-tasks';
import type { BuyerProgressFacts } from '@/features/buyers/services/buyer-progress';
import {
  budgetGapLabel,
  proposalTarget,
  type BuyerLoopProposal,
} from '@/features/buyers/services/loop-properties';
import { idealLabel } from '@/features/ideal-properties/services/ideal-label';
import {
  buyerInSentence,
  proposeHref,
} from '@/features/meeting-conclusion/services/suivi-step-labels';
import { formatEuro } from '@/lib/format';

// Mission 130 B — « Une seule prochaine étape » côté acquéreur : son parcours, UNE prochaine étape
// avec un bouton plein, et ce qui s'est passé, daté, lu dans les tables existantes. Pur.
// Mission 143 (B1, maquette AUDIT-keller.png) — cinq étapes, Sélection → Présentée → Visite → Offre
// → Compromis (remplace Biens idéaux → Présenter → Sa réponse → Visites), lues à leur état le PLUS
// AVANCÉ : une étape plus loin faite coche toutes celles d'avant, même si leur fait propre manque.

export type JourneyKey = 'selection' | 'present' | 'visit' | 'offer' | 'compromise';
export type JourneyStatus = 'done' | 'current' | 'later';

export type JourneyStep = {
  key: JourneyKey;
  number: 1 | 2 | 3 | 4 | 5;
  title: string;
  state: string;
  status: JourneyStatus;
};

const plural = (count: number, one: string, many: string): string =>
  `${count} ${count > 1 ? many : one}`;

// « 05/11 » : le jour et le mois, à l'heure de Paris.
const dayMonth = (iso: string): string => buyerDateLabel(iso).slice(0, 5);

const presented = (facts: BuyerProgressFacts) => facts.presentedAt != null;
const answered = (facts: BuyerProgressFacts) => presented(facts) || facts.answeredOnLink;

// La vente est en cours tant que l'acquéreur est « Sous offre » : « L'offre est tombée : revenir en
// visite » (M138) la défait, et tout revient comme avant l'offre ; « A acheté » la clôt.
export function saleInProgress(facts: BuyerProgressFacts, status?: string): boolean {
  return facts.offer?.decision === 'accepted' && (status === undefined || status === 'under_offer');
}

// L'offre qui compte : l'acceptée tant que la vente tient (ou qu'il a acheté), sinon la plus
// récente signée — une nouvelle offre après « L'offre est tombée » attend sa réponse.
export function currentOffer(facts: BuyerProgressFacts, status?: string) {
  if (
    saleInProgress(facts, status) ||
    (status === 'purchased' && facts.offer?.decision === 'accepted')
  )
    return facts.offer ?? null;
  return facts.latestOffer ?? facts.offer ?? null;
}

export function buyerJourney(facts: BuyerProgressFacts, status?: string): JourneyStep[] {
  const done = facts.visitsDone ?? 0;
  const offer = currentOffer(facts, status);
  const purchased = status === 'purchased';
  const sold = saleInProgress(facts, status) || purchased;
  const visited = done > 0 || offer != null || purchased;
  const shown = answered(facts) || visited;
  // Lancement, mission 2 (Jean-Guy, 23/11) — des visites ne supposent pas une offre : sans offre
  // formulée (une visite « Offre envisagée », ou une offre signée), l'offre n'est pas « à faire »,
  // l'acquéreur reste en recherche et aucune étape ne l'attend.
  const considered = facts.offerConsidered === true;
  const raw: Omit<JourneyStep, 'status'>[] = [
    {
      key: 'selection',
      number: 1,
      title: 'Sélection',
      state:
        facts.selectionCount > 0
          ? plural(facts.selectionCount, 'bien', 'biens')
          : shown
            ? 'faite'
            : 'à faire',
    },
    {
      key: 'present',
      number: 2,
      title: 'Présentée',
      state: presented(facts)
        ? `le ${dayMonth(facts.presentedAt!)}`
        : facts.answeredOnLink && facts.answeredAt
          ? `réponse par le lien le ${dayMonth(facts.answeredAt)}`
          : facts.linkCreated
            ? 'lien envoyé, sans réponse'
            : shown
              ? 'faite'
              : 'à faire',
    },
    {
      key: 'visit',
      number: 3,
      title: 'Visite',
      state:
        facts.visitsToOrganize > 0 && !offer
          ? `${plural(facts.visitsToOrganize, 'demandée', 'demandées')}, à organiser`
          : facts.lastVisitDoneAt
            ? `${done > 1 ? `${done} faites · la dernière ` : ''}le ${dayMonth(facts.lastVisitDoneAt)}${facts.voucherSigned ? ' · bon signé' : ''}`
            : visited
              ? 'faite'
              : 'à faire',
    },
    {
      key: 'offer',
      number: 4,
      title: 'Offre',
      state: !offer
        ? considered
          ? 'envisagée, à préparer'
          : 'quand il en formule une'
        : offer.decision === 'accepted' && offer.decidedAt
          ? `acceptée le ${dayMonth(offer.decidedAt)}`
          : offer.decision === 'refused' && offer.decidedAt
            ? `refusée le ${dayMonth(offer.decidedAt)}`
            : `signée le ${dayMonth(offer.signedAt)}`,
    },
    {
      key: 'compromise',
      number: 5,
      title: 'Compromis',
      state: purchased ? 'signé' : sold ? 'à lancer' : 'après l’offre acceptée',
    },
  ];
  const isDone: Record<JourneyKey, boolean> = {
    selection: facts.selectionCount > 0 || shown,
    present: shown,
    visit: visited,
    offer: sold,
    compromise: purchased,
  };
  const firstOpen = raw.find((step) => !isDone[step.key])?.key ?? null;
  const current = firstOpen === 'offer' && !offer && !considered ? null : firstOpen;
  return raw.map((step) => ({
    ...step,
    status: isDone[step.key] ? 'done' : step.key === current ? 'current' : 'later',
  }));
}

export type BuyerAction = { label: string; href: string };

export type BuyerNextAction = {
  title: string;
  phrase: string;
  primary: BuyerAction;
  secondary: BuyerAction | null;
  // Le jour où l'étape a commencé (ISO) : la liste le dit.
  since: string | null;
  // Mission 143 (B1) — « Lancer le compromis » : la fiche joue les gestes de la M138 sur cette offre.
  compromiseOfferId?: string;
};

const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

// Mission 145 (partie A, I2) — un mandat signé à lui proposer (la tâche « N acquéreurs pour … ») :
// « Lui proposer la maison de M. et Mme Lopez », à la place de « Trouver ses biens idéaux » et de
// « Lui proposer d'autres biens » seulement ; le plus récent, et « + N autres » s'il y en a.
function proposeStep(
  proposals: readonly BuyerLoopProposal[],
  budgetMax: number | null | undefined,
  id: string,
): BuyerNextAction | null {
  const [first, ...others] = proposals;
  if (!first) return null;
  const facts = [
    idealLabel(first.property),
    first.price != null ? formatEuro(first.price) : null,
  ].filter((part): part is string => part != null);
  const gap = budgetGapLabel(first.price, budgetMax ?? null);
  const signedOn = buyerDateLabel(first.bornAt).slice(0, 5);
  const more =
    others.length > 0
      ? ` + ${others.length} ${others.length > 1 ? 'autres biens' : 'autre bien'} à lui proposer.`
      : '';
  return {
    title: `Lui proposer ${proposalTarget(first)}`,
    phrase: `${facts.join(' · ')}${gap ? `, ${gap.charAt(0).toLowerCase()}${gap.slice(1)}` : ''}. Mandat signé le ${signedOn}.${more}`,
    primary: { label: 'Proposer ce bien', href: proposeHref(first.key) },
    secondary: { label: 'Trouver d’autres biens', href: `/acquereurs/${id}/biens-ideaux` },
    since: first.bornAt,
  };
}

// La prochaine étape d'un acquéreur, selon où il en est : trouver les biens idéaux → présenter
// (ou envoyer le lien) → relancer sa réponse → organiser la visite → lui proposer d'autres biens.
export function buyerNextAction(
  buyer: {
    id: string;
    createdAt: string;
    phone: string | null;
    name?: string;
    status?: string;
    budgetMax?: number | null;
  },
  facts: BuyerProgressFacts,
  now: Date = new Date(),
  proposals: readonly BuyerLoopProposal[] = [],
): BuyerNextAction {
  const id = buyer.id;
  const offer = currentOffer(facts, buyer.status);
  // Mission 143 (B1) — la prochaine étape suit l'état le plus avancé : l'offre d'abord.
  if (offer && buyer.status !== 'purchased') {
    if (saleInProgress(facts, buyer.status)) {
      const who = buyerInSentence(buyer.name);
      return {
        title: 'Lancer le compromis',
        phrase: `Prévenez ${who}, puis envoyez le dossier au notaire.`,
        primary: { label: `Prévenir ${who}`, href: `/acquereurs/${id}#la-vente` },
        secondary: { label: 'Transmettre au notaire', href: `/acquereurs/${id}#la-vente` },
        since: offer.decidedAt,
        compromiseOfferId: offer.documentId,
      };
    }
    const today = parisDay(now);
    if (offer.decision == null && offer.validUntil != null && offer.validUntil >= today) {
      return {
        title: 'Attendre la réponse du vendeur',
        phrase: `L’offre est valable jusqu’au ${buyerDateLabel(offer.validUntil)}\u00a0: le vendeur répond sur son lien.`,
        primary: { label: 'Voir l’offre', href: `/acquereurs/${id}/offre/${offer.documentId}` },
        secondary: null,
        since: offer.signedAt,
      };
    }
    // Refusée, ou expirée sans réponse : la prochaine étape d'avant l'offre, comme avant.
  }
  // Lancement, mission 2 — l'offre n'est la prochaine étape que s'il l'a formulée (une visite
  // « Offre envisagée », sans offre signée encore) ; sinon la recherche continue, ci-dessous.
  if (!offer && facts.offerConsidered && buyer.status !== 'purchased') {
    return {
      title: 'Préparer son offre d’achat',
      phrase: `Il envisage une offre après sa visite${facts.lastVisitDoneAt ? ` du ${dayMonth(facts.lastVisitDoneAt)}` : ''}\u00a0: préparez-la avec lui.`,
      primary: { label: 'Préparer l’offre d’achat', href: `/acquereurs/${id}/offre` },
      secondary: { label: 'Trouver d’autres biens', href: `/acquereurs/${id}/biens-ideaux` },
      since: facts.lastVisitDoneAt ?? null,
    };
  }
  const ideal = { label: 'Trouver les biens idéaux', href: `/acquereurs/${id}/biens-ideaux` };
  const present = { label: 'Présenter maintenant', href: `/presentation/${id}` };
  const link = { label: 'Envoyer le lien à la place', href: `/acquereurs/${id}/dossier` };
  const propose = proposeStep(proposals, buyer.budgetMax, id);
  if (facts.selectionCount === 0) {
    if (propose) return propose;
    return {
      title: 'Trouver ses biens idéaux',
      phrase: 'Ce que l’agence a déjà, puis le marché\u202f; vous retenez trois biens au plus.',
      primary: ideal,
      secondary: null,
      since: buyer.createdAt,
    };
  }
  if (!answered(facts)) {
    if (!facts.linkCreated) {
      return {
        title: 'Lui présenter sa sélection',
        phrase:
          'En rendez-vous ou en visio\u00a0: il répond bien par bien. Ou envoyez-lui le lien, il répond depuis son téléphone.',
        primary: present,
        secondary: link,
        since: facts.selectionAt ?? null,
      };
    }
    const linkDay = facts.linkAt ? ` depuis le ${buyerDateLabel(facts.linkAt)}` : '';
    return {
      title: 'Relancer sa réponse',
      phrase: `Le lien est envoyé${linkDay}\u202f; il n’a pas encore répondu.`,
      primary: buyer.phone
        ? { label: 'L’appeler', href: telHref(buyer.phone) }
        : { label: 'Revoir le lien', href: `/acquereurs/${id}/dossier` },
      secondary: { label: 'Présenter maintenant', href: `/presentation/${id}` },
      since: facts.linkAt ?? null,
    };
  }
  if (facts.visitsToOrganize > 0) {
    return {
      title: 'Organiser la visite',
      phrase: `${plural(facts.visitsToOrganize, 'visite demandée', 'visites demandées')}\u00a0: contactez le propriétaire ou le confrère, puis notez le retour de visite.`,
      primary: { label: 'Organiser les visites', href: '/visites' },
      secondary: null,
      since: facts.answeredAt ?? facts.presentedAt ?? null,
    };
  }
  if (propose) return propose;
  return {
    title: 'Lui proposer d’autres biens',
    phrase:
      (facts.visitsDone ?? 0) > 0
        ? 'Ses visites sont faites\u00a0: une nouvelle sélection relance la recherche.'
        : 'Il n’a demandé aucune visite\u00a0: une nouvelle sélection relance la recherche.',
    primary: { label: 'Trouver d’autres biens', href: `/acquereurs/${id}/biens-ideaux` },
    secondary: null,
    since: facts.answeredAt ?? facts.presentedAt ?? null,
  };
}

// « Prix et écart au budget » d'un bien de sa sélection (M116 acquéreur, M122 B : vert dans le
// budget, orange au-dessus, jamais rouge) : « à négocier » jusqu'à +5 % du plafond (M118), au-delà
// « au-dessus du budget » ; sans prix montré ou sans budget, rien.
export const BUDGET_NEGOTIABLE_PERCENT = 5;
export function budgetGap(
  price: number | null,
  budgetMax: number | null,
): { over: number; tone: 'green' | 'orange'; negotiable: boolean } | null {
  if (price == null || budgetMax == null) return null;
  if (price <= budgetMax) return { over: 0, tone: 'green', negotiable: false };
  return {
    over: price - budgetMax,
    tone: 'orange',
    negotiable: price <= budgetMax * (1 + BUDGET_NEGOTIABLE_PERCENT / 100),
  };
}

export type TimelineEntry = { at: string; text: string };

export type TimelineInput = {
  createdAt: string;
  selections: { createdAt: string; agencyCount: number; marketCount: number }[];
  presentedAt: string | null;
  linkAt: string | null;
  answeredAt: string | null;
  // Les courriers préparés depuis sa recherche (M120).
  letters?: { at: string; label: string }[];
  // Mission 134 — les biens proposés : « Maison · 5 pièces · 140 m² · Vence proposée le 06/11 ».
  proposals?: { at: string; label: string }[];
  // Mission 135 — ses relances et les ajustements de sa recherche.
  events?: { at: string; kind: 'relaunch' | 'search_adjusted'; summary: string | null }[];
  // Mission 151 — les lectures de notes qui ont créé ou complété la fiche (planche 3).
  readings?: {
    at: string;
    outcome: 'created' | 'completed';
    source: 'photo' | 'file' | 'text' | null;
    proposed: number;
    kept: number;
  }[];
  visits: {
    requestedAt: string;
    visitedAt: string | null;
    label: string;
    during: string;
    outcomeLabel: string | null;
  }[];
};

// « Ce qui s'est passé » : un fil daté, du plus récent au plus ancien, rien d'autre que ce qui est
// en base.
export function buyerTimeline(input: TimelineInput): TimelineEntry[] {
  // Mission 151 — une fiche née d'une lecture le dit à la place de « Fiche créée » :
  // « Fiche créée depuis vos notes (photo) · 15 champs proposés, 15 gardés ».
  const creation = (input.readings ?? []).find((reading) => reading.outcome === 'created');
  const SOURCE_WORDS = { photo: 'photo', file: 'fichier', text: 'texte' } as const;
  const readingText = (reading: NonNullable<TimelineInput['readings']>[number], verb: string) =>
    `${verb} depuis vos notes${reading.source ? ` (${SOURCE_WORDS[reading.source]})` : ''} · ${plural(
      reading.proposed,
      'champ proposé',
      'champs proposés',
    )}, ${reading.kept} ${reading.kept > 1 ? 'gardés' : 'gardé'}`;
  const entries: TimelineEntry[] = [
    {
      at: input.createdAt,
      text: creation ? readingText(creation, 'Fiche créée') : 'Fiche créée',
    },
  ];
  for (const reading of input.readings ?? []) {
    if (reading.outcome === 'completed') {
      entries.push({ at: reading.at, text: readingText(reading, 'Fiche complétée') });
    }
  }
  for (const selection of input.selections) {
    const total = selection.agencyCount + selection.marketCount;
    const parts = [
      selection.agencyCount > 0 ? `${selection.agencyCount} de l’agence` : null,
      selection.marketCount > 0 ? `${selection.marketCount} du marché` : null,
    ].filter(Boolean);
    entries.push({
      at: selection.createdAt,
      text: `${plural(total, 'bien sélectionné', 'biens sélectionnés')}${parts.length > 0 ? `\u00a0: ${parts.join(', ')}` : ''}`,
    });
  }
  if (input.presentedAt) entries.push({ at: input.presentedAt, text: 'Sélection présentée' });
  if (input.linkAt) entries.push({ at: input.linkAt, text: 'Lien de sa sélection créé' });
  if (input.answeredAt)
    entries.push({ at: input.answeredAt, text: 'Sa réponse reçue par le lien' });
  for (const event of input.events ?? []) {
    entries.push({
      at: event.at,
      text:
        event.kind === 'relaunch'
          ? 'Relancé\u00a0: sa sélection restée sans réponse'
          : `Recherche ajustée\u00a0: ${event.summary ?? ''}`.trim(),
    });
  }
  for (const proposal of input.proposals ?? []) {
    entries.push({ at: proposal.at, text: `Bien proposé\u00a0: ${proposal.label}` });
  }
  for (const letter of input.letters ?? []) {
    entries.push({ at: letter.at, text: `Courrier préparé\u00a0: ${letter.label}` });
  }
  for (const visit of input.visits) {
    entries.push({
      at: visit.requestedAt,
      text: `Visite demandée\u00a0: ${visit.label}${visit.during === 'dossier' ? ' (depuis le lien)' : ''}`,
    });
    if (visit.visitedAt) {
      entries.push({
        at: visit.visitedAt,
        text: `Visite faite\u00a0: ${visit.label}${visit.outcomeLabel ? ` · ${visit.outcomeLabel}` : ''}`,
      });
    }
  }
  return entries.sort((a, b) => b.at.localeCompare(a.at));
}

// « dernier échange il y a 2 j » : le plus récent fait de la fiche APRÈS sa création (le statut
// est daté à la création : ce n'est pas un échange).
export function lastExchangeLabel(
  dates: (string | null | undefined)[],
  now: Date,
  createdAt?: string,
): string | null {
  const after = createdAt ? new Date(createdAt).getTime() + 60_000 : -Infinity;
  const known = dates
    .filter((value): value is string => Boolean(value))
    .filter((value) => new Date(value).getTime() > after)
    .sort();
  const last = known.at(-1);
  if (!last) return null;
  // Mission 132 — en jours de Paris, comme « À recontacter » (`buyerReadiness`) : les deux se lisent
  // côte à côte sur la fiche et ne doivent jamais se contredire.
  const days = Math.max(0, daysBetween(parisDay(new Date(last)), parisDay(now)));
  return days === 0 ? 'dernier échange aujourd’hui' : `dernier échange il y a ${days} j`;
}

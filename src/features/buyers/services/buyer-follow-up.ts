import {
  ANSWERED_DURING_LABELS,
  ITEM_ANSWER_REPORT,
  NO_REASON_LABELS,
  type AnsweredDuring,
  type ItemAnswer,
  type NoReason,
} from '@/features/buyer-deck/types';
import { DISMISS_REASON_LABELS } from '@/features/buyer-messages/report';
import { seenItemKey } from '@/features/buyers/services/seen-properties';
import { formatRelativeDay } from '@/lib/format';

// Lancement, mission 6 (Jean-Guy, 23/11) — « un seul endroit par acquéreur avec les biens envoyés,
// refusés et pourquoi, visités avec leur compte rendu, pour faire le point avec lui ». Un bien =
// une ligne, par la clé de la boucle (`seenItemKey`, la même que « jamais reproposé »), lue dans
// ce qui existe déjà : ses sélections reçues (présentées, partagées, proposées), ses réponses, ses
// visites, ce que le conseiller a écarté pour lui. Aucune donnée nouvelle. Pur.
//
// L'ordre est celui du point à faire avec lui : ce qu'il a visité, les visites à organiser, ce qui
// attend sa réponse, ce qu'il a refusé et pourquoi, puis ce que le conseiller a écarté pour lui.
export type FollowUpGroup = 'visited' | 'to_visit' | 'waiting' | 'refused' | 'dismissed';

export const FOLLOW_UP_GROUPS: readonly FollowUpGroup[] = [
  'visited',
  'to_visit',
  'waiting',
  'refused',
  'dismissed',
];

export const FOLLOW_UP_GROUP_TITLES: Record<FollowUpGroup, string> = {
  visited: 'Visités',
  to_visit: 'Visites à organiser',
  waiting: 'Envoyés, en attente',
  refused: 'Refusés',
  dismissed: 'Écartés pour lui, sans lui en parler',
};

export type FollowUpRows = {
  selections: { id: string; presented_at: string | null }[];
  // Les partages notés du lien d'une sélection (`buyer_events`, « link_shared »).
  shares: { selection_id: string | null; occurred_at: string }[];
  items: {
    id: string;
    selection_id: string;
    source: string;
    reference: string;
    label: string;
    listed_price: number | null;
    removed_at: string | null;
  }[];
  proposals: {
    property_key: string;
    label: string;
    sent_at: string;
    selection_item_id: string | null;
  }[];
  responses: {
    selection_item_id: string;
    answer: string;
    reasons: string[];
    answered_at: string;
    answered_during: string;
  }[];
  dismissals: { property_key: string; label: string; reason: string; dismissed_at: string }[];
  // Ses demandes de visite non annulées ; `refused` : « Pas pour moi » après la visite.
  visits: {
    id: string;
    itemId: string;
    requestedAt: string;
    visitedAt: string | null;
    refused: boolean;
  }[];
  competitorUrls: ReadonlyMap<string, string | null>;
};

export type FollowUpEntry = {
  key: string;
  // Le libellé neutre du bien (type · pièces · surface · commune) : jamais un titre ni une adresse.
  label: string;
  price: number | null;
  // « Dans l'agence » ou « Annonce du marché » ; null : inconnu (un bien seulement écarté).
  inAgency: boolean | null;
  // Sa ligne de sélection la plus récente : elle ouvre la fiche complète du bien.
  itemId: string | null;
  sent: { at: string; how: 'presentation' | 'link' | 'proposal' | null } | null;
  // Sa dernière réponse sur ce bien.
  answer: { answer: ItemAnswer; reasons: NoReason[]; at: string; during: AnsweredDuring } | null;
  // Ses visites de ce bien, de la plus ancienne à la plus récente.
  visitIds: string[];
  dismissed: { at: string; reason: string } | null;
  group: FollowUpGroup;
  // Le dernier fait daté, pour ranger dans un groupe.
  lastAt: string;
};

type Draft = Omit<FollowUpEntry, 'group' | 'lastAt' | 'label' | 'visitIds'> & {
  label: string | null;
  itemAt: string;
  visits: FollowUpRows['visits'];
  // Son dernier mot : un refus, ou non.
  verdict: { refused: boolean; at: string } | null;
};

const ANSWERS: readonly string[] = ['visit', 'maybe', 'no'];

export function buyerFollowUp(rows: FollowUpRows): FollowUpEntry[] {
  const itemOf = new Map(rows.items.map((row) => [row.id, row]));
  // Quand la sélection lui est-elle parvenue, et comment ? La plus ancienne date connue.
  const shownAt = new Map<string, NonNullable<FollowUpEntry['sent']>>();
  const shown = (
    selectionId: string | null | undefined,
    at: string | null,
    how: NonNullable<FollowUpEntry['sent']>['how'],
  ) => {
    if (!selectionId || !at) return;
    const known = shownAt.get(selectionId);
    if (!known || at < known.at) shownAt.set(selectionId, { at, how });
  };
  for (const row of rows.selections) shown(row.id, row.presented_at, 'presentation');
  for (const row of rows.shares) shown(row.selection_id, row.occurred_at, 'link');
  for (const row of rows.proposals) {
    if (row.selection_item_id) {
      shown(itemOf.get(row.selection_item_id)?.selection_id, row.sent_at, 'proposal');
    }
  }

  const drafts = new Map<string, Draft>();
  const draft = (key: string): Draft => {
    const known = drafts.get(key) ?? {
      key,
      label: null,
      price: null,
      inAgency: null,
      itemId: null,
      itemAt: '',
      sent: null,
      answer: null,
      dismissed: null,
      visits: [],
      verdict: null,
    };
    drafts.set(key, known);
    return known;
  };
  const sent = (target: Draft, at: string, how: NonNullable<FollowUpEntry['sent']>['how']) => {
    if (!target.sent || at < target.sent.at) target.sent = { at, how };
  };
  // À date égale, un refus l'emporte (la règle de « jamais reproposé »).
  const verdict = (target: Draft, refused: boolean, at: string) => {
    const known = target.verdict;
    if (!known || at > known.at || (at === known.at && refused)) target.verdict = { refused, at };
  };
  // Le bien d'une ligne de sélection : la plus récente porte son libellé, son prix, sa fiche.
  const ofItem = (itemId: string, at: string): Draft | null => {
    const item = itemOf.get(itemId);
    const key = item ? seenItemKey(item, rows.competitorUrls) : null;
    if (!item || !key) return null;
    const target = draft(key);
    if (at >= target.itemAt) {
      target.itemAt = at;
      target.itemId = item.id;
      target.label = item.label;
      target.price = item.listed_price;
      target.inAgency = item.source !== 'listing';
    }
    return target;
  };

  for (const item of rows.items) {
    const reached = shownAt.get(item.selection_id);
    if (!reached || item.removed_at != null) continue;
    const target = ofItem(item.id, reached.at);
    if (target) sent(target, reached.at, reached.how);
  }
  for (const row of rows.proposals) {
    const target = draft(row.property_key);
    target.label ??= row.label;
    sent(target, row.sent_at, 'proposal');
  }
  for (const row of rows.responses) {
    const target = ofItem(row.selection_item_id, row.answered_at);
    if (!target || !ANSWERS.includes(row.answer)) continue;
    sent(target, row.answered_at, null);
    if (!target.answer || row.answered_at >= target.answer.at) {
      target.answer = {
        answer: row.answer as ItemAnswer,
        reasons: row.reasons.filter((reason): reason is NoReason => reason in NO_REASON_LABELS),
        at: row.answered_at,
        during: row.answered_during === 'dossier' ? 'dossier' : 'presentation',
      };
    }
    verdict(target, row.answer === 'no', row.answered_at);
  }
  for (const visit of rows.visits) {
    const target = ofItem(visit.itemId, visit.visitedAt ?? visit.requestedAt);
    if (!target) continue;
    sent(target, visit.requestedAt, null);
    target.visits.push(visit);
    if (visit.visitedAt) verdict(target, visit.refused, visit.visitedAt);
  }
  for (const row of rows.dismissals) {
    const target = draft(row.property_key);
    target.label ??= row.label;
    target.dismissed = { at: row.dismissed_at, reason: row.reason };
  }

  const entries: FollowUpEntry[] = [];
  for (const known of drafts.values()) {
    if (!known.sent && !known.dismissed) continue;
    const visits = [...known.visits].sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));
    const done = visits.filter((visit) => visit.visitedAt != null);
    const group: FollowUpGroup = known.dismissed
      ? 'dismissed'
      : known.verdict?.refused
        ? 'refused'
        : done.length > 0
          ? 'visited'
          : visits.length > 0
            ? 'to_visit'
            : 'waiting';
    const dates = [
      known.sent?.at,
      known.answer?.at,
      known.dismissed?.at,
      ...visits.flatMap((visit) => [visit.requestedAt, visit.visitedAt]),
    ].filter((at): at is string => at != null);
    entries.push({
      key: known.key,
      label: known.label ?? 'Bien',
      price: known.price,
      inAgency: known.inAgency,
      itemId: known.itemId,
      sent: known.sent,
      answer: known.answer,
      visitIds: visits.map((visit) => visit.id),
      dismissed: known.dismissed,
      group,
      lastAt: dates.sort().at(-1) ?? '',
    });
  }
  // Par groupe, puis du plus récent au plus ancien.
  return entries.sort(
    (a, b) =>
      FOLLOW_UP_GROUPS.indexOf(a.group) - FOLLOW_UP_GROUPS.indexOf(b.group) ||
      b.lastAt.localeCompare(a.lastAt) ||
      a.key.localeCompare(b.key),
  );
}

// Ce que la ligne dit du bien, fait par fait, pour le conseiller (dates relatives, M143).
export function followUpFacts(entry: FollowUpEntry, now: Date = new Date()): string[] {
  const facts: string[] = [];
  const how = entry.sent?.how;
  if (entry.sent && how === 'presentation') {
    facts.push(`Envoyé ${formatRelativeDay(entry.sent.at, now)}, en présentation`);
  } else if (entry.sent && how === 'link') {
    facts.push(`Envoyé ${formatRelativeDay(entry.sent.at, now)}, par le lien`);
  } else if (entry.sent && how === 'proposal') {
    facts.push(`Proposé ${formatRelativeDay(entry.sent.at, now)}`);
  }
  if (entry.answer) {
    const reasons = entry.answer.reasons.map((reason) => NO_REASON_LABELS[reason]);
    facts.push(
      `${ITEM_ANSWER_REPORT[entry.answer.answer]}${reasons.length > 0 ? ` : ${reasons.join(', ')}` : ''} · ${formatRelativeDay(entry.answer.at, now)}, ${ANSWERED_DURING_LABELS[entry.answer.during]}`,
    );
  }
  if (entry.dismissed) {
    const reason = (DISMISS_REASON_LABELS as Record<string, string | undefined>)[
      entry.dismissed.reason
    ];
    facts.push(
      `Écarté pour lui ${formatRelativeDay(entry.dismissed.at, now)}${reason ? ` : ${reason}` : ''}`,
    );
  }
  return facts;
}

// L'état du bien, en un mot, à droite de sa ligne ; la couleur ne dit jamais seule (M129).
export type FollowUpTone = 'ok' | 'now' | 'wait' | 'no' | 'off' | 'plain';

export function followUpPill(entry: FollowUpEntry): { text: string; tone: FollowUpTone } {
  if (entry.group === 'dismissed') return { text: 'Écarté pour lui', tone: 'off' };
  if (entry.group === 'refused') return { text: 'Refusé', tone: 'no' };
  if (entry.group === 'visited') return { text: 'Visité', tone: 'ok' };
  if (entry.group === 'to_visit') return { text: 'À organiser', tone: 'now' };
  if (entry.answer?.answer === 'visit') return { text: 'Veut le visiter', tone: 'ok' };
  if (entry.answer?.answer === 'maybe') return { text: 'Peut-être', tone: 'plain' };
  return { text: 'Sans réponse', tone: 'wait' };
}

// La ligne du haut : les nombres, sans les zéros. `pendingVisits` : ses visites à organiser.
export function followUpSummary(entries: FollowUpEntry[], pendingVisits: number): string | null {
  if (entries.length === 0) return null;
  const count = (group: FollowUpGroup) => entries.filter((entry) => entry.group === group).length;
  const sent = entries.filter((entry) => entry.sent != null && entry.group !== 'dismissed').length;
  const visited = entries.filter(
    (entry) =>
      entry.group === 'visited' || (entry.group === 'refused' && entry.visitIds.length > 0),
  ).length;
  const refused = count('refused');
  const dismissed = count('dismissed');
  const s = (n: number) => (n > 1 ? 's' : '');
  return [
    sent > 0 ? `${sent} bien${s(sent)} envoyé${s(sent)}` : null,
    visited > 0 ? `${visited} visité${s(visited)}` : null,
    pendingVisits > 0 ? `${pendingVisits} visite${s(pendingVisits)} à organiser` : null,
    refused > 0 ? `${refused} refusé${s(refused)}` : null,
    dismissed > 0 ? `${dismissed} écarté${s(dismissed)} pour lui` : null,
  ]
    .filter((part): part is string => part != null)
    .join(' · ');
}

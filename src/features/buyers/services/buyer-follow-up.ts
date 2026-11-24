import {
  ANSWERED_DURING_LABELS,
  ITEM_ANSWER_REPORT,
  NO_REASON_LABELS,
  type AnsweredDuring,
  type ItemAnswer,
  type NoReason,
} from '@/features/buyer-deck/types';
import { DISMISS_REASON_LABELS } from '@/features/buyer-messages/report';
import { refusedAfterVisit, seenItemKey } from '@/features/buyers/services/seen-properties';
import { formatRelativeDay } from '@/lib/format';

// Lancement, mission 6 (Jean-Guy, 23/11) — « un seul endroit par acquéreur avec les biens envoyés,
// refusés et pourquoi, visités avec leur compte rendu, pour faire le point avec lui ». Un bien =
// une ligne, par la clé de la boucle (`seenItemKey`, la même que « jamais reproposé »), lue dans
// ce qui existe déjà : ses sélections reçues (présentées, partagées, proposées), ses réponses, ses
// visites, ce que le conseiller a écarté pour lui. Aucune donnée nouvelle. Pur.
//
// L'ordre est celui du point à faire avec lui : ce qu'il a visité, les visites à organiser, ce qui
// attend sa réponse, ce qu'il a refusé et pourquoi, puis ce que le conseiller a écarté pour lui.
// Une visite à organiser a toujours sa ligne sous « Visites à organiser », même pour un bien déjà
// visité (une deuxième visite) : la ligne du haut la compte, l'écran la montre (maquette).
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
  // Ses demandes de visite non annulées, avec ce que dit leur compte rendu.
  visits: {
    id: string;
    itemId: string;
    requestedAt: string;
    visitedAt: string | null;
    opinion: string | null;
    outcome: string;
  }[];
  competitorUrls: ReadonlyMap<string, string | null>;
};

export type FollowUpAnswer = {
  answer: ItemAnswer;
  reasons: NoReason[];
  at: string;
  during: AnsweredDuring;
};

type SentHow = 'presentation' | 'link' | 'proposal';

export type FollowUpEntry = {
  key: string;
  // Le libellé neutre du bien (type · pièces · surface · commune) : jamais un titre ni une adresse.
  label: string;
  price: number | null;
  // D'où vient le bien ; null : inconnu (un bien seulement écarté).
  source: 'project' | 'competitor' | 'listing' | null;
  // Sa ligne de sélection la plus récente : elle ouvre la fiche complète du bien.
  itemId: string | null;
  // Quand le bien lui est parvenu (la plus ancienne date connue), et par quoi.
  sent: { at: string; how: SentHow | null } | null;
  // Toutes ses réponses sur ce bien, de la plus ancienne à la plus récente (M122 : chaque réponse,
  // ses raisons, le moment, la date) ; la dernière vaut.
  answers: FollowUpAnswer[];
  // Les visites que porte CETTE ligne, de la plus ancienne à la plus récente.
  visitIds: string[];
  // Il l'a visité (une visite faite), quelle que soit la ligne.
  visited: boolean;
  dismissed: { at: string; reason: string } | null;
  group: FollowUpGroup;
  // La seconde ligne d'un bien déjà visité : sa visite à organiser. Elle ne redit pas ses faits.
  again: boolean;
  // Le dernier fait daté, pour ranger dans un groupe.
  lastAt: string;
};

type Draft = {
  key: string;
  label: string | null;
  price: number | null;
  source: FollowUpEntry['source'];
  itemId: string | null;
  itemAt: string;
  sentAt: string | null;
  // Par quoi il l'a reçu : le plus ancien moyen connu (une réponse donnée pendant la présentation
  // est datée AVANT la fin de celle-ci : elle ne l'efface pas).
  how: { how: SentHow; at: string } | null;
  answers: FollowUpAnswer[];
  dismissed: FollowUpEntry['dismissed'];
  visits: FollowUpRows['visits'];
  // Son dernier mot : un refus, ou non.
  verdict: { refused: boolean; at: string } | null;
};

const ANSWERS: readonly string[] = ['visit', 'maybe', 'no'];
const SOURCES: readonly string[] = ['project', 'competitor', 'listing'];

export function buyerFollowUp(rows: FollowUpRows): FollowUpEntry[] {
  const itemOf = new Map(rows.items.map((row) => [row.id, row]));
  // Quand la sélection lui est-elle parvenue, et comment ? La plus ancienne date connue.
  const shownAt = new Map<string, { at: string; how: SentHow }>();
  const shown = (selectionId: string | null | undefined, at: string | null, how: SentHow) => {
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
      source: null,
      itemId: null,
      itemAt: '',
      sentAt: null,
      how: null,
      answers: [],
      dismissed: null,
      visits: [],
      verdict: null,
    };
    drafts.set(key, known);
    return known;
  };
  const sent = (target: Draft, at: string, how: SentHow | null) => {
    if (!target.sentAt || at < target.sentAt) target.sentAt = at;
    if (how && (!target.how || at < target.how.at)) target.how = { how, at };
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
      target.source = SOURCES.includes(item.source)
        ? (item.source as FollowUpEntry['source'])
        : 'listing';
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
    target.answers.push({
      answer: row.answer as ItemAnswer,
      reasons: row.reasons.filter((reason): reason is NoReason => reason in NO_REASON_LABELS),
      at: row.answered_at,
      during: row.answered_during === 'dossier' ? 'dossier' : 'presentation',
    });
    verdict(target, row.answer === 'no', row.answered_at);
  }
  for (const visit of rows.visits) {
    const target = ofItem(visit.itemId, visit.visitedAt ?? visit.requestedAt);
    if (!target) continue;
    sent(target, visit.requestedAt, null);
    target.visits.push(visit);
    if (visit.visitedAt) {
      verdict(target, refusedAfterVisit(visit.opinion, visit.outcome), visit.visitedAt);
    }
  }
  for (const row of rows.dismissals) {
    const target = draft(row.property_key);
    target.label ??= row.label;
    target.dismissed = { at: row.dismissed_at, reason: row.reason };
  }

  const entries: FollowUpEntry[] = [];
  for (const known of drafts.values()) {
    if (!known.sentAt && !known.dismissed) continue;
    const visits = [...known.visits].sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));
    const done = visits.filter((visit) => visit.visitedAt != null);
    const pending = visits.filter((visit) => visit.visitedAt == null);
    const answers = [...known.answers].sort((a, b) => a.at.localeCompare(b.at));
    const group: FollowUpGroup = known.dismissed
      ? 'dismissed'
      : known.verdict?.refused
        ? 'refused'
        : done.length > 0
          ? 'visited'
          : pending.length > 0
            ? 'to_visit'
            : 'waiting';
    const dates = [
      known.sentAt,
      known.how?.at,
      known.dismissed?.at,
      ...answers.map((answer) => answer.at),
      ...visits.flatMap((visit) => [visit.requestedAt, visit.visitedAt]),
    ].filter((at): at is string => at != null);
    const entry: FollowUpEntry = {
      key: known.key,
      label: known.label ?? 'Bien',
      price: known.price,
      source: known.source,
      itemId: known.itemId,
      sent: known.sentAt ? { at: known.sentAt, how: known.how?.how ?? null } : null,
      answers,
      visitIds: visits.map((visit) => visit.id),
      visited: done.length > 0,
      dismissed: known.dismissed,
      group,
      again: false,
      lastAt: dates.sort().at(-1) ?? '',
    };
    // Visité, et une autre visite à organiser : elle a sa ligne sous « Visites à organiser ».
    if (group === 'visited' && pending.length > 0) {
      entries.push({ ...entry, visitIds: done.map((visit) => visit.id) });
      entries.push({
        ...entry,
        group: 'to_visit',
        again: true,
        visitIds: pending.map((visit) => visit.id),
      });
    } else {
      entries.push(entry);
    }
  }
  // Par groupe, puis du plus récent au plus ancien.
  return entries.sort(
    (a, b) =>
      FOLLOW_UP_GROUPS.indexOf(a.group) - FOLLOW_UP_GROUPS.indexOf(b.group) ||
      b.lastAt.localeCompare(a.lastAt) ||
      a.key.localeCompare(b.key),
  );
}

// D'où vient le bien, avec les mots de la fiche : un concurrent à prospecter n'est pas « dans
// l'agence » (elle n'a pas son mandat, M120, M145).
export function followUpOrigin(entry: Pick<FollowUpEntry, 'source'>): string | null {
  if (entry.source === 'project') return 'Dans l’agence';
  if (entry.source === 'competitor') return 'Concurrent à prospecter';
  return entry.source === 'listing' ? 'Annonce du marché' : null;
}

// Ce que la ligne dit du bien, fait par fait, pour le conseiller (dates relatives, M143). La
// seconde ligne d'un bien déjà visité ne les redit pas.
export function followUpFacts(entry: FollowUpEntry, now: Date = new Date()): string[] {
  if (entry.again) return [];
  const facts: string[] = [];
  const how = entry.sent?.how;
  if (entry.sent && how === 'presentation') {
    facts.push(`Envoyé ${formatRelativeDay(entry.sent.at, now)}, en présentation`);
  } else if (entry.sent && how === 'link') {
    facts.push(`Envoyé ${formatRelativeDay(entry.sent.at, now)}, par le lien`);
  } else if (entry.sent && how === 'proposal') {
    facts.push(`Proposé ${formatRelativeDay(entry.sent.at, now)}`);
  }
  for (const answer of entry.answers) {
    const reasons = answer.reasons.map((reason) => NO_REASON_LABELS[reason]);
    facts.push(
      `${ITEM_ANSWER_REPORT[answer.answer]}${reasons.length > 0 ? ` : ${reasons.join(', ')}` : ''} · ${formatRelativeDay(answer.at, now)}, ${ANSWERED_DURING_LABELS[answer.during]}`,
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
  const last = entry.answers.at(-1)?.answer;
  if (last === 'visit') return { text: 'Veut le visiter', tone: 'ok' };
  if (last === 'maybe') return { text: 'Peut-être', tone: 'plain' };
  return { text: 'Sans réponse', tone: 'wait' };
}

// La ligne du haut : les nombres, sans les zéros ; un bien compte une fois, même sur deux lignes.
// `pendingVisits` : ses visites à organiser.
export function followUpSummary(entries: FollowUpEntry[], pendingVisits: number): string | null {
  const biens = entries.filter((entry) => !entry.again);
  if (biens.length === 0) return null;
  const count = (group: FollowUpGroup) => biens.filter((entry) => entry.group === group).length;
  const sent = biens.filter((entry) => entry.sent != null && entry.group !== 'dismissed').length;
  const visited = biens.filter((entry) => entry.visited && entry.group !== 'dismissed').length;
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

// Lancement, mission 10 — la sélection en cours est-elle déjà dans « Son suivi » ? Chacun de ses
// BIENS (par la clé de la boucle, pas par sa ligne de sélection : un même bien peut avoir plusieurs
// lignes, d'une sélection à l'autre) y a une ligne qui dit qu'il lui est parvenu — envoyé, répondu
// ou visité. Un bien seulement écarté pour lui ne compte pas. La fiche n'écrit alors ses biens
// qu'une fois (`selectionShown`).
export function selectionFollowed(
  itemIds: readonly string[],
  rows: Pick<FollowUpRows, 'items' | 'competitorUrls'>,
  entries: readonly FollowUpEntry[],
): boolean {
  if (itemIds.length === 0) return false;
  const reached = new Set(
    entries
      .filter(
        (entry) => entry.sent != null || entry.answers.length > 0 || entry.visitIds.length > 0,
      )
      .map((entry) => entry.key),
  );
  const byId = new Map(rows.items.map((item) => [item.id, item]));
  return itemIds.every((id) => {
    const item = byId.get(id);
    const key = item ? seenItemKey(item, rows.competitorUrls) : null;
    return key != null && reached.has(key);
  });
}

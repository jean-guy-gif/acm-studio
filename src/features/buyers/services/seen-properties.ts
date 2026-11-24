import { dismissalKey } from '@/features/buyer-dismissals/services/dismissal-key';

// Lancement, mission 3 (Jean-Guy, 23/11) — « un bien déjà envoyé, visité ou refusé n'est jamais
// reproposé ». Une seule règle, lue dans les faits datés qui existent, par la clé de la boucle
// (`dismissalKey`, M134) :
// - envoyé : un envoi noté (M134), ou un bien d'une sélection qu'il a reçue — présentée, son lien
//   partagé, ou un envoi noté sur l'un de ses biens (M135) —, ou un bien auquel il a répondu ou
//   dont une visite est demandée. Une sélection seulement enregistrée ne compte pas : il ne l'a pas
//   vue (M134, « une sélection seule ne compte pas ») ;
// - visité : une visite faite ;
// - refusé : son dernier mot sur ce bien est un refus — « Pas pour moi » en présentation ou sur le
//   lien, ou après la visite. Le dernier fait daté vaut (M122) ;
// - écarté : le conseiller l'a écarté pour lui (M139).
// Pur.
export type SeenReason = 'dismissed' | 'refused' | 'visited' | 'sent';
export type SeenFact = { reason: SeenReason; at: string | null };

export type SeenRows = {
  dismissals: { buyer_id: string; property_key: string }[];
  proposals: {
    buyer_id: string;
    property_key: string;
    sent_at: string;
    selection_item_id: string | null;
  }[];
  selections: { id: string; buyer_id: string; presented_at: string | null }[];
  // Les partages notés du lien d'une sélection (`buyer_events`, « link_shared »).
  shares: { selection_id: string | null; occurred_at: string }[];
  items: {
    id: string;
    selection_id: string;
    source: string;
    reference: string;
    removed_at: string | null;
  }[];
  responses: { selection_item_id: string; answer: string; answered_at: string }[];
  // Les demandes de visite non annulées.
  visits: {
    buyer_selection_item_id: string;
    requested_at: string;
    visited_at: string | null;
    opinion: string | null;
    outcome: string;
  }[];
  // L'annonce d'un concurrent, pour sa clé d'annonce (un même bien a une seule clé).
  competitorUrls: ReadonlyMap<string, string | null>;
};

// Acquéreur → clé du bien → pourquoi il ne lui est plus proposé.
export type SeenProperties = Map<string, Map<string, SeenFact>>;

export function seenItemKey(
  item: { source: string; reference: string },
  competitorUrls: ReadonlyMap<string, string | null>,
): string | null {
  if (item.source === 'project') {
    return dismissalKey({ source: 'project', projectId: item.reference });
  }
  if (item.source === 'competitor') {
    return dismissalKey({
      source: 'competitor',
      competitorId: item.reference,
      listingUrl: competitorUrls.get(item.reference) ?? null,
    });
  }
  if (item.source === 'listing') return dismissalKey({ source: 'listing', url: item.reference });
  return null;
}

type Notes = {
  dismissed: boolean;
  sentAt: string | null;
  visitedAt: string | null;
  // Son dernier mot sur ce bien.
  verdict: { refused: boolean; at: string } | null;
};

export function seenProperties(rows: SeenRows): SeenProperties {
  const buyerOfSelection = new Map(rows.selections.map((row) => [row.id, row.buyer_id]));
  const itemOf = new Map(rows.items.map((row) => [row.id, row]));

  // Quand la sélection lui est-elle parvenue ? La plus ancienne date connue.
  const shownAt = new Map<string, string>();
  const shown = (selectionId: string | null | undefined, at: string | null) => {
    if (!selectionId || !at) return;
    const known = shownAt.get(selectionId);
    if (!known || at < known) shownAt.set(selectionId, at);
  };
  for (const row of rows.selections) shown(row.id, row.presented_at);
  for (const row of rows.shares) shown(row.selection_id, row.occurred_at);
  for (const row of rows.proposals) {
    if (row.selection_item_id) shown(itemOf.get(row.selection_item_id)?.selection_id, row.sent_at);
  }

  const notes = new Map<string, Map<string, Notes>>();
  const note = (buyerId: string, key: string): Notes => {
    const ofBuyer = notes.get(buyerId) ?? new Map<string, Notes>();
    notes.set(buyerId, ofBuyer);
    const known = ofBuyer.get(key) ?? {
      dismissed: false,
      sentAt: null,
      visitedAt: null,
      verdict: null,
    };
    ofBuyer.set(key, known);
    return known;
  };
  const sent = (target: Notes, at: string) => {
    if (!target.sentAt || at < target.sentAt) target.sentAt = at;
  };
  // À date égale, un refus l'emporte.
  const verdict = (target: Notes, refused: boolean, at: string) => {
    const known = target.verdict;
    if (!known || at > known.at || (at === known.at && refused)) target.verdict = { refused, at };
  };
  // Le bien d'une ligne de sélection : son acquéreur et sa clé.
  const ofItem = (itemId: string): Notes | null => {
    const item = itemOf.get(itemId);
    const buyerId = item ? buyerOfSelection.get(item.selection_id) : undefined;
    const key = item ? seenItemKey(item, rows.competitorUrls) : null;
    return buyerId && key ? note(buyerId, key) : null;
  };

  for (const row of rows.proposals) sent(note(row.buyer_id, row.property_key), row.sent_at);
  for (const item of rows.items) {
    const at = shownAt.get(item.selection_id);
    if (!at || item.removed_at != null) continue;
    const target = ofItem(item.id);
    if (target) sent(target, at);
  }
  for (const row of rows.responses) {
    const target = ofItem(row.selection_item_id);
    if (!target) continue;
    sent(target, row.answered_at);
    verdict(target, row.answer === 'no', row.answered_at);
  }
  for (const row of rows.visits) {
    const target = ofItem(row.buyer_selection_item_id);
    if (!target) continue;
    sent(target, row.requested_at);
    if (!row.visited_at) continue;
    if (!target.visitedAt || row.visited_at > target.visitedAt) target.visitedAt = row.visited_at;
    verdict(target, row.opinion === 'not_for_me' || row.outcome === 'declined', row.visited_at);
  }
  for (const row of rows.dismissals) note(row.buyer_id, row.property_key).dismissed = true;

  const seen: SeenProperties = new Map();
  for (const [buyerId, ofBuyer] of notes) {
    const facts = new Map<string, SeenFact>();
    for (const [key, known] of ofBuyer) {
      const fact: SeenFact | null = known.dismissed
        ? { reason: 'dismissed', at: null }
        : known.verdict?.refused
          ? { reason: 'refused', at: known.verdict.at }
          : known.visitedAt
            ? { reason: 'visited', at: known.visitedAt }
            : known.sentAt
              ? { reason: 'sent', at: known.sentAt }
              : null;
      if (fact) facts.set(key, fact);
    }
    if (facts.size > 0) seen.set(buyerId, facts);
  }
  return seen;
}

// Ce qu'un acquéreur a déjà vu, bien par bien.
export function seenKeysOf(
  seen: SeenProperties,
  buyerId: string,
): { key: string; reason: SeenReason }[] {
  return [...(seen.get(buyerId) ?? [])].map(([key, fact]) => ({ key, reason: fact.reason }));
}

// Écarté par le conseiller ou refusé par l'acquéreur : ce bien n'est plus pour lui, nulle part
// (la règle de la M139, `withoutDismissed`). Clé du bien → ses acquéreurs.
export function ruledOutOf(seen: SeenProperties): Map<string, Set<string>> {
  const byKey = new Map<string, Set<string>>();
  for (const [buyerId, facts] of seen) {
    for (const [key, fact] of facts) {
      if (fact.reason !== 'dismissed' && fact.reason !== 'refused') continue;
      byKey.set(key, (byKey.get(key) ?? new Set<string>()).add(buyerId));
    }
  }
  return byKey;
}

// Envoyé ou visité : il l'a déjà, on ne le lui repropose pas (« déjà proposé le … », « déjà visité
// le … »). Clé du bien → acquéreur → la date.
export type Contacted = Map<string, Map<string, { at: string | null; visited: boolean }>>;

export function contactedOf(seen: SeenProperties): Contacted {
  const byKey: Contacted = new Map();
  for (const [buyerId, facts] of seen) {
    for (const [key, fact] of facts) {
      if (fact.reason !== 'sent' && fact.reason !== 'visited') continue;
      const ofKey = byKey.get(key) ?? new Map<string, { at: string | null; visited: boolean }>();
      ofKey.set(buyerId, { at: fact.at, visited: fact.reason === 'visited' });
      byKey.set(key, ofKey);
    }
  }
  return byKey;
}

// La ligne dite au conseiller quand des biens ne sont pas reproposés : le nombre, et pourquoi.
export function seenLine(counts: Record<'sent' | 'visited' | 'refused', number>): string | null {
  const total = counts.sent + counts.visited + counts.refused;
  if (total === 0) return null;
  const s = (count: number) => (count > 1 ? 's' : '');
  const why = [
    counts.sent > 0 ? `${counts.sent} déjà envoyé${s(counts.sent)}` : null,
    counts.visited > 0 ? `${counts.visited} visité${s(counts.visited)}` : null,
    counts.refused > 0 ? `${counts.refused} refusé${s(counts.refused)}` : null,
  ].filter(Boolean);
  return total > 1
    ? `${total} biens ne lui sont pas reproposés : ${why.join(', ')}.`
    : `1 bien ne lui est pas reproposé : ${why.join(', ')}.`;
}

// Le compte, par raison, des biens d'une liste que l'acquéreur a déjà vus.
export function countSeen(
  reasons: (SeenReason | undefined)[],
): Record<'sent' | 'visited' | 'refused', number> {
  const counts = { sent: 0, visited: 0, refused: 0 };
  for (const reason of reasons) {
    if (reason === 'sent' || reason === 'visited' || reason === 'refused') counts[reason] += 1;
  }
  return counts;
}

// Le lien de proposition (M134) recopie les biens de sa sélection actuelle : jamais un bien qu'il
// a refusé, déjà visité, ou que le conseiller a écarté pour lui. Un bien envoyé sans réponse y
// reste : son nouveau lien remplace le précédent, il le perdrait.
export function keptForProposal<T extends { source: string; reference: string }>(
  items: T[],
  facts: ReadonlyMap<string, SeenFact> | undefined,
  keyOf: (item: { source: string; reference: string }) => string | null,
): T[] {
  return items.filter((item) => {
    const key = keyOf(item);
    const reason = key ? facts?.get(key)?.reason : undefined;
    return reason == null || reason === 'sent';
  });
}

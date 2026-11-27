import { parisDaysSince } from '@/features/buyers/services/buyer-readiness';
import { parisDay } from '@/features/meeting-conclusion/services/follow-up-contacts';
import type { BuyerProgressFacts } from '@/features/buyers/services/buyer-progress';
import {
  propertyBuyers,
  type BuyerLoopProperty,
  type PropertyBuyer,
  type PropertyBuyers,
} from '@/features/buyers/services/property-buyers';
import type { Buyer } from '@/features/buyers/types';
import type { SuiviTask } from '@/features/meeting-conclusion/services/suivi-tasks';
import { clientTexts, type TextLanguage } from '@/lib/client-texts';
import { formatEuro, formatSquareMeters } from '@/lib/format';

// Mission 134 — « Personne n'est oublié » : chaque nouveau bien appelle les acquéreurs de l'agence
// qui lui correspondent (la règle de la 133, `propertyBuyers`). Pur. Mission 145 (partie A) — seul
// un mandat signé, sans offre acceptée, se propose (décision de Jean-Guy, 07/11, `proposable.ts`) :
// le catalogue ne produit plus que l'origine « mandate ». Les autres origines (vendeur à relancer,
// concurrent, nouveau venu, bien démarché) restent dans le type : des envois notés avant la mission
// les portent (`buyer_proposals.origin`).
// Un bien est UN bien, quel que soit le nombre de dossiers où il est retenu (clé d'annonce, M47,
// M98) ; un acquéreur à qui il a été proposé (« Envoyé », noté) n'y figure plus — une sélection seule
// ne compte pas : « Passer » n'écrit rien (décision du 06/11) — ; la tâche se vide au fil des envois,
// sans rien recréer. Lancement, mission 3 — ni celui qui l'a déjà reçu dans une sélection présentée
// ou partagée, ou visité ; celui qui l'a refusé ne lui correspond plus (`seen-properties.ts`).

export const NEW_PROPERTY_WINDOW_DAYS = 14;

export type LoopOrigin = 'mandate' | 'follow_up' | 'competitor' | 'newcomer' | 'prospect';
export type LoopSource = 'project' | 'competitor' | 'listing';

export type LoopProperty = {
  // `project:<id>`, `listing:<portail>:<numéro>`, ou `competitor:<id>` sans annonce reconnue.
  key: string;
  source: LoopSource;
  reference: string;
  projectId: string | null;
  // Le dossier vendeur dont il est le bien ou un concurrent (pour dire « chez … »).
  sellerName: string | null;
  origin: LoopOrigin;
  // Le libellé neutre (type · pièces · surface · commune) : jamais une adresse ni un titre.
  label: string;
  property: BuyerLoopProperty;
  price: number | null;
  // L'arrivée du bien dans la boucle (signature, issue, retenue, démarchage).
  bornAt: string;
  // Comment le reconnaître dans une sélection (`source:reference`), toutes copies comprises.
  selectionRefs: string[];
  // Un bien démarché : ses faits publiés (liste d'autorisation, M120), pour son dossier acquéreur.
  facts?: Record<string, unknown> | null;
  // Les acquéreurs à l'origine d'un bien démarché : ils l'ont déjà.
  originBuyerIds: string[];
};

// Quand deux copies désignent le même bien : un dossier de l'agence d'abord, puis la plus récente.
const ORIGIN_RANK: Record<LoopOrigin, number> = {
  mandate: 0,
  follow_up: 1,
  newcomer: 2,
  competitor: 3,
  prospect: 4,
};

export function mergeLoopProperties(list: LoopProperty[]): LoopProperty[] {
  const byKey = new Map<string, LoopProperty>();
  for (const item of list) {
    const known = byKey.get(item.key);
    if (!known) {
      byKey.set(item.key, item);
      continue;
    }
    const better =
      ORIGIN_RANK[item.origin] < ORIGIN_RANK[known.origin] ||
      (ORIGIN_RANK[item.origin] === ORIGIN_RANK[known.origin] && item.bornAt > known.bornAt);
    const kept = better ? item : known;
    byKey.set(item.key, {
      ...kept,
      selectionRefs: [...new Set([...known.selectionRefs, ...item.selectionRefs])],
      originBuyerIds: [...new Set([...known.originBuyerIds, ...item.originBuyerIds])],
    });
  }
  return [...byKey.values()];
}

// Un bien du marché n'appelle ses acquéreurs que dans ses 14 premiers jours ; un bien de l'agence,
// tant qu'il est à vendre.
export function isNewProperty(item: LoopProperty, now: Date): boolean {
  if (item.origin === 'mandate' || item.origin === 'follow_up') return item.price != null;
  return parisDaysSince(item.bornAt, now) < NEW_PROPERTY_WINDOW_DAYS;
}

// Ce que la boucle sait déjà des acquéreurs d'un bien : à qui il a été proposé, et quand.
export type LoopContacts = {
  // property_key → acquéreur → date d'envoi.
  proposals: Map<string, Map<string, string>>;
  // Mission 139 — property_key → les acquéreurs pour qui le conseiller l'a écarté : ils ne lui
  // correspondent plus (ni à proposer, ni comptés).
  dismissals?: Map<string, Set<string>>;
  // Lancement, mission 3 — property_key → les acquéreurs qui l'ont déjà visité (« déjà visité
  // le … ») ; la date est alors celle de la visite.
  visited?: Map<string, Set<string>>;
};

// Mission 139 — une seule règle partout (boucle, bloc du dossier, compteur du Live) : les acquéreurs
// pour qui le conseiller a écarté ce bien ne lui correspondent plus.
export function withoutDismissed<T extends { id: string }>(
  buyers: T[],
  dismissals: ReadonlyMap<string, ReadonlySet<string>> | undefined,
  propertyKey: string,
): T[] {
  const dismissed = dismissals?.get(propertyKey);
  return dismissed ? buyers.filter((buyer) => !dismissed.has(buyer.id)) : buyers;
}

export function alreadyContacted(
  item: LoopProperty,
  buyerId: string,
  contacts: LoopContacts,
): boolean {
  return (
    item.originBuyerIds.includes(buyerId) || contacts.proposals.get(item.key)?.has(buyerId) === true
  );
}

export type LoopBuyers = PropertyBuyers & {
  // Les acquéreurs qui correspondent et à qui le bien n'a pas encore été proposé, prêts d'abord.
  toPropose: PropertyBuyer[];
  // Ceux à qui il a été proposé, avec la date : « déjà proposé le … », « déjà visité le … ».
  proposed: { entry: PropertyBuyer; sentAt: string | null; visited: boolean }[];
};

export function loopBuyers(
  item: LoopProperty,
  buyers: Buyer[],
  progress: Map<string, BuyerProgressFacts>,
  contacts: LoopContacts,
  now: Date,
): LoopBuyers {
  const result = propertyBuyers(
    withoutDismissed(buyers, contacts.dismissals, item.key),
    progress,
    item.property,
    item.price,
    now,
  );
  const all = [...result.ready, ...result.others];
  const sentOf = contacts.proposals.get(item.key);
  return {
    ...result,
    toPropose: all.filter(({ buyer }) => !alreadyContacted(item, buyer.id, contacts)),
    proposed: all
      .filter(({ buyer }) => alreadyContacted(item, buyer.id, contacts))
      .map((entry) => ({
        entry,
        sentAt: sentOf?.get(entry.buyer.id) || null,
        visited: contacts.visited?.get(item.key)?.has(entry.buyer.id) === true,
      })),
  };
}

// Mission 145 (partie A, I2) — un mandat à proposer à un acquéreur, vu de sa fiche.
export type BuyerLoopProposal = {
  key: string;
  sellerName: string | null;
  property: BuyerLoopProperty;
  price: number | null;
  // La signature du mandat : le plus récent d'abord, et « Mandat signé le … ».
  bornAt: string;
};

export function loopProposalOf(item: LoopProperty): BuyerLoopProposal {
  return {
    key: item.key,
    sellerName: item.sellerName,
    property: item.property,
    price: item.price,
    bornAt: item.bornAt,
  };
}

// « la maison de M. et Mme Lopez », « l'appartement d'Anne Martin », « le bien de M. Lefebvre ».
export function proposalTarget(
  proposal: Pick<BuyerLoopProposal, 'sellerName' | 'property'>,
): string {
  const kind = propertyKind(proposal.property.propertyType);
  const what = kind === 'house' ? 'la maison' : kind === 'apartment' ? 'l’appartement' : 'le bien';
  const seller = proposal.sellerName?.trim();
  if (!seller) return what;
  return /^[aeiouyàâéèêëîïôûü]/i.test(seller) ? `${what} d’${seller}` : `${what} de ${seller}`;
}

// Les acquéreurs PRÊTS à qui le bien n'a pas été proposé : ceux que compte sa tâche.
export function readyBuyersToPropose(loop: LoopBuyers): PropertyBuyer[] {
  return loop.toPropose.filter((entry) => entry.ready);
}

// La tâche d'un nouveau bien : le nombre d'acquéreurs PRÊTS à qui il n'a pas été proposé.
export function readyToPropose(loop: LoopBuyers): number {
  return readyBuyersToPropose(loop).length;
}

// La tâche d'un nouveau bien, « 4 acquéreurs pour la maison de Vence » : due à l'arrivée du bien,
// jamais en retard ; aucune sans acquéreur prêt. La refonte, lot B — elle porte ces acquéreurs, les
// mêmes que son compte : chacun a sa carte « à faire aujourd'hui » sur Acquéreurs.
export function proposeTask(item: LoopProperty, loop: LoopBuyers): SuiviTask | null {
  const ready = readyBuyersToPropose(loop);
  if (ready.length === 0) return null;
  return {
    kind: 'propose_buyers',
    projectId: item.projectId ?? '',
    sellerName: item.sellerName ?? '',
    dueOn: parisDay(new Date(item.bornAt)),
    count: ready.length,
    proposeBuyers: ready.map((entry) => ({ id: entry.buyer.id, name: entry.buyer.name })),
    propertyKey: item.key,
    propertyLabel: item.label,
    origin: item.origin,
    property: { propertyType: item.property.propertyType, city: item.property.city },
    figures: { surfaceArea: item.property.surfaceArea, price: item.price },
  };
}

// Le genre d'un bien, pour le dire dans une phrase.
export function propertyKind(
  propertyType: string | null | undefined,
): 'house' | 'apartment' | 'other' {
  const type = (propertyType ?? '').toLowerCase();
  return /house|maison/.test(type)
    ? 'house'
    : /apartment|appartement/.test(type)
      ? 'apartment'
      : 'other';
}

// « la maison de Vence », « l'appartement d'Antibes », « le bien de Mougins ». Mission 140 — dans
// la langue de l'acquéreur (le français par défaut, et pour tout ce que voit le conseiller).
export function propertyPhrase(
  property: Pick<BuyerLoopProperty, 'propertyType' | 'city'>,
  language: TextLanguage = 'fr',
): string {
  return clientTexts(language).buyer.messages.phrase(
    propertyKind(property.propertyType),
    property.city?.trim() || null,
  );
}

// « 140 m², 779 000 € » : ce que le conseiller lit sur la tâche.
export function propertyFigures(input: {
  surfaceArea: number | null;
  price: number | null;
}): string | null {
  const parts = [
    input.surfaceArea != null ? formatSquareMeters(Math.round(input.surfaceArea)) : null,
    input.price != null ? formatEuro(input.price) : null,
  ].filter((part): part is string => part != null);
  return parts.length > 0 ? parts.join(', ') : null;
}

// § 3 — l'origine dite sur la tâche et sur la page « Proposer ce bien ».
export const LOOP_ORIGIN_NOTES: Record<LoopOrigin, string> = {
  mandate: 'mandat signé',
  follow_up: 'vendeur à relancer\u00a0: à proposer après son accord',
  competitor: 'bien du marché\u00a0: à vérifier avant d’envoyer',
  newcomer: 'nouveau sur le marché depuis le rendez-vous\u00a0: à vérifier avant d’envoyer',
  prospect: 'bien du marché démarché\u00a0: à vérifier avant d’envoyer',
};

// L'écart au budget, pour le conseiller : « 11 000 € sous le budget », « 9 000 € au-dessus, à
// négocier ».
export function budgetGapLabel(price: number | null, budgetMax: number | null): string | null {
  if (price == null || budgetMax == null) return null;
  if (price <= budgetMax) {
    return price === budgetMax ? 'Au budget' : `${formatEuro(budgetMax - price)} sous le budget`;
  }
  return `${formatEuro(price - budgetMax)} au-dessus du budget, à négocier`;
}

// § 6 — le message à l'acquéreur : son nom tel que saisi (la fiche n'a pas de prénom, M119), ce
// que le bien a de ce qu'il cherche, la marge sous son budget — jamais pour un vendeur à relancer,
// dont le prix se confirme avec le propriétaire (M119) —, le lien de son dossier, la signature.
// Ce que le bien a de ce qu'il cherche : « la piscine que vous vouliez, un extérieur ».
export function propertyHas(
  buyer: Pick<Buyer, 'pool' | 'outdoor' | 'parking' | 'elevator'>,
  p: BuyerLoopProperty,
  language: TextLanguage = 'fr',
): string[] {
  const t = clientTexts(language).buyer.messages.has;
  const has: string[] = [];
  if (buyer.pool === true && p.hasPool === true) has.push(t.pool);
  if (buyer.outdoor === true && p.outdoorSpaces.length > 0) has.push(t.outdoor);
  if (buyer.parking === true && p.parkingTypes.length > 0) has.push(t.parking);
  if (buyer.elevator === true && p.hasElevator === true) has.push(t.elevator);
  return has;
}

// Mission 140 — dans la langue de l'acquéreur (le français par défaut).
export function proposalMessage(input: {
  buyer: Pick<Buyer, 'name' | 'pool' | 'outdoor' | 'parking' | 'elevator' | 'budgetMax'>;
  item: Pick<LoopProperty, 'property' | 'price' | 'origin'>;
  url: string;
  advisorFirstName: string | null;
  language?: TextLanguage;
}): string {
  const { buyer, item } = input;
  const language = input.language ?? 'fr';
  const t = clientTexts(language).buyer.messages;
  const p = item.property;
  const has = propertyHas(buyer, p, language);
  const where = p.city?.trim() ? t.at(p.city.trim()) : null;
  const margin =
    item.origin !== 'follow_up' &&
    item.price != null &&
    buyer.budgetMax != null &&
    item.price < buyer.budgetMax
      ? t.proposal.margin(formatEuro(buyer.budgetMax - item.price, { language }))
      : null;
  // « maison », « appartement » ; un type inconnu ne se dit pas (jamais « bien à Vence »).
  const kind = propertyKind(p.propertyType);
  const what = [
    kind === 'other' ? null : t.proposal.noun[kind],
    where,
    has.length > 0 ? t.withList(has) : null,
  ]
    .filter(Boolean)
    .join(' ');
  const lines = [
    t.hello(buyer.name),
    t.proposal.line(what, margin),
    t.selection(input.url),
    t.proposal.ask,
  ];
  if (input.advisorFirstName?.trim()) lines.push(input.advisorFirstName.trim());
  return lines.join('\n');
}

export const PROPOSAL_FAILED = 'L’envoi n’a pas pu être préparé. Réessayez.';
export const PROPOSAL_NOT_MATCHING = 'Cet acquéreur ne correspond plus à ce bien.';
export const PROPOSAL_UNKNOWN_PROPERTY = 'Ce bien n’est plus à proposer.';

// « 06/11 » : le jour (Paris) d'un envoi.
export function sentDayLabel(iso: string): string {
  const [, month, day] = parisDay(new Date(iso)).split('-');
  return `${day}/${month}`;
}

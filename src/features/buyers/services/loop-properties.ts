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
import { formatEuro, formatSquareMeters } from '@/lib/format';

// Mission 134 — « Personne n'est oublié » : chaque nouveau bien appelle les acquéreurs de l'agence
// qui lui correspondent (la règle de la 133, `propertyBuyers`). Pur.
//   • un mandat signé, tant qu'il l'est ;
//   • un vendeur à relancer qui a un prix (à proposer après son accord) ;
//   • un concurrent retenu sur un dossier vendeur, un nouveau venu retenu (M127 B), un bien démarché
//     depuis une recherche acquéreur (M120) : dans les 14 jours qui suivent son arrivée — sinon
//     chaque concurrent retenu depuis des mois ferait une tâche (décision du 06/11).
// Un bien est UN bien, quel que soit le nombre de dossiers où il est retenu (clé d'annonce, M47,
// M98) ; un acquéreur à qui il a été proposé (« Envoyé », noté) n'y figure plus — une sélection seule
// ne compte pas : « Passer » n'écrit rien (décision du 06/11) — ; la tâche se vide au fil des envois,
// sans rien recréer.

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
  // Ceux à qui il a été proposé, avec la date : « déjà proposé le … ».
  proposed: { entry: PropertyBuyer; sentAt: string | null }[];
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
      .map((entry) => ({ entry, sentAt: sentOf?.get(entry.buyer.id) ?? null })),
  };
}

// La tâche d'un nouveau bien : le nombre d'acquéreurs PRÊTS à qui il n'a pas été proposé.
export function readyToPropose(loop: LoopBuyers): number {
  return loop.toPropose.filter((entry) => entry.ready).length;
}

// « la maison de Vence », « l'appartement d'Antibes », « le bien de Mougins ».
export function propertyPhrase(property: Pick<BuyerLoopProperty, 'propertyType' | 'city'>): string {
  const type = (property.propertyType ?? '').toLowerCase();
  const noun = /house|maison/.test(type)
    ? 'la maison'
    : /apartment|appartement/.test(type)
      ? 'l’appartement'
      : 'le bien';
  const city = property.city?.trim();
  if (!city) return noun;
  return /^[aeiouyàâéèêîôûh]/i.test(city) ? `${noun} d’${city}` : `${noun} de ${city}`;
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
  follow_up: 'vendeur à relancer : à proposer après son accord',
  competitor: 'bien du marché : à vérifier avant d’envoyer',
  newcomer: 'nouveau sur le marché depuis le rendez-vous : à vérifier avant d’envoyer',
  prospect: 'bien du marché démarché : à vérifier avant d’envoyer',
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
export function proposalMessage(input: {
  buyer: Pick<Buyer, 'name' | 'pool' | 'outdoor' | 'parking' | 'elevator' | 'budgetMax'>;
  item: Pick<LoopProperty, 'property' | 'price' | 'origin'>;
  url: string;
  advisorFirstName: string | null;
}): string {
  const { buyer, item } = input;
  const p = item.property;
  const has: string[] = [];
  if (buyer.pool === true && p.hasPool === true) has.push('la piscine que vous vouliez');
  if (buyer.outdoor === true && p.outdoorSpaces.length > 0) has.push('un extérieur');
  if (buyer.parking === true && p.parkingTypes.length > 0) has.push('un stationnement');
  if (buyer.elevator === true && p.hasElevator === true) has.push('un ascenseur');
  const where = p.city?.trim() ? `à ${p.city.trim()}` : null;
  const margin =
    item.origin !== 'follow_up' &&
    item.price != null &&
    buyer.budgetMax != null &&
    item.price < buyer.budgetMax
      ? `${formatEuro(buyer.budgetMax - item.price)} sous votre budget`
      : null;
  // « maison », « appartement » ; un type inconnu ne se dit pas (jamais « bien à Vence »).
  const noun = propertyPhrase({ propertyType: p.propertyType, city: null });
  const what = [
    noun === 'le bien' ? null : noun.replace(/^(la|le|l’)\s?/, ''),
    where,
    has.length > 0 ? `avec ${has.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join(' ');
  const lines = [
    `Bonjour ${buyer.name},`,
    `J’ai un bien pour vous : ${what}${margin ? `, ${margin}` : ''}.`,
    `Votre sélection : ${input.url}`,
    'Dites-moi si vous voulez le visiter.',
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

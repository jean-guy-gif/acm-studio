import type { ProspectingRow } from '@/features/competitor-locator/services/build-prospecting-rows';
import { withoutDismissed } from '@/features/buyers/services/loop-properties';
import type { BuyerProgressFacts } from '@/features/buyers/services/buyer-progress';
import { propertyBuyers, type BuyerLoopProperty } from '@/features/buyers/services/property-buyers';
import type { Buyer } from '@/features/buyers/types';
import type { SuiviTask } from '@/features/meeting-conclusion/services/suivi-tasks';

// Mission 145 (partie B) — un bien SANS MANDAT que veulent des acquéreurs prêts devient une alerte
// pour rentrer le mandat, jamais une proposition (décision de Jean-Guy, 07/11). Même calcul de
// correspondance que la boucle (M133, `propertyBuyers` ; acquéreurs écartés exclus, M139). Les
// acquéreurs ne sont jamais nommés dans ce qui part vers le vendeur ou le propriétaire : seul un
// nombre sort d'ici. Pur.

// --- Le vendeur à relancer ------------------------------------------------------------------

export type FollowUpAlertInput = {
  // Le jour où la relance est due (M105, M108, M130 A), à Paris.
  dueOn: string;
  // Les acquéreurs prêts qui correspondent à son bien, aujourd'hui.
  readyBuyers: number;
  // « Garder la date » : le moment du geste et le nombre d'acquéreurs prêts à cet instant.
  keptAt: string | null;
  keptReady: number | null;
  // La plus récente relance notée (M96), s'il y en a une.
  lastContactAt: string | null;
};

export type FollowUpAlert =
  | { kind: 'due'; readyBuyers: number }
  | { kind: 'early'; readyBuyers: number; plannedOn: string }
  | null;

// « Garder la date » tient tant que la relance n'est pas due, qu'aucun acquéreur prêt de plus ne
// correspond et qu'aucune relance n'a été notée depuis (décisions du 07/11). Une relance notée
// pose elle-même la date gardée, à son heure, avec les acquéreurs prêts qu'elle a comptés : elle ne
// fait pas revenir « Relancer plus tôt ? » le jour même.
export function dateKept(input: FollowUpAlertInput): boolean {
  if (input.keptAt == null || input.keptReady == null) return false;
  if (input.readyBuyers > input.keptReady) return false;
  return input.lastContactAt == null || input.keptAt >= input.lastContactAt;
}

// La relance due porte l'argument ; pas encore due, « Relancer plus tôt ? », sauf date gardée.
export function followUpAlert(input: FollowUpAlertInput, today: string): FollowUpAlert {
  if (input.readyBuyers <= 0) return null;
  if (input.dueOn <= today) return { kind: 'due', readyBuyers: input.readyBuyers };
  if (dateKept(input)) return null;
  return { kind: 'early', readyBuyers: input.readyBuyers, plannedOn: input.dueOn };
}

// Les tâches du jour, complétées : l'argument sur la relance due, et « Relancer plus tôt ? » pour
// une relance à venir. `alerts` : par dossier à relancer.
export function withFollowUpAlerts(
  dues: SuiviTask[],
  upcoming: SuiviTask[],
  alerts: ReadonlyMap<string, FollowUpAlert>,
  today: string,
): SuiviTask[] {
  const withArgument = dues.map((task) => {
    const alert = task.kind === 'follow_up' ? alerts.get(task.projectId) : null;
    return alert?.kind === 'due' ? { ...task, readyBuyers: alert.readyBuyers } : task;
  });
  const early = upcoming.flatMap((task): SuiviTask[] => {
    if (task.kind !== 'follow_up') return [];
    const alert = alerts.get(task.projectId);
    return alert?.kind === 'early'
      ? [
          {
            ...task,
            kind: 'follow_up_early',
            dueOn: today,
            readyBuyers: alert.readyBuyers,
            plannedOn: alert.plannedOn,
          },
        ]
      : [];
  });
  return [...withArgument, ...early];
}

// --- Les biens en prospection ---------------------------------------------------------------

export type AlertCard = {
  kind: 'competitor' | 'buyer_prospect';
  row: ProspectingRow;
  // Les dossiers vendeurs dont le bien est un concurrent (un mandat signé chacun) ; vide pour un
  // bien démarché.
  projectIds: string[];
  label: string;
  // Un bien démarché : les acquéreurs de la recherche qui l'a fait naître (ils le veulent déjà), et
  // l'origine dont le courrier se prépare.
  originBuyerIds: string[];
  letterOriginId: string | null;
};

export type CardAlert = { readyBuyers: number; mention: 'owner' | 'check' };

// La clé du bien pour les acquéreurs écartés (M139) : celle de la boucle.
const cardKey = (card: AlertCard): string =>
  card.row.listingKey ? `listing:${card.row.listingKey}` : `competitor:${card.row.id}`;

const OPEN_STATUSES = new Set(['to_confirm', 'ready']);

// Ce que les acquéreurs prêts disent d'une carte encore à démarcher : en mandat simple ou chez un
// particulier (« propriétaire »), une alerte ; « à vérifier », seulement une mention sur la carte ;
// en exclusivité (confrère), rien. Une carte « Ne plus solliciter », remise ou plus loin : rien.
export function cardAlert(
  card: AlertCard,
  buyers: Buyer[],
  progress: ReadonlyMap<string, BuyerProgressFacts>,
  dismissals: ReadonlyMap<string, ReadonlySet<string>> | undefined,
  now: Date,
): CardAlert | null {
  const { row } = card;
  if (row.opposedOn != null || !OPEN_STATUSES.has(row.status)) return null;
  if (row.step === 'colleague' || !row.loopProperty) return null;
  const others = buyers.filter((buyer) => !card.originBuyerIds.includes(buyer.id));
  const result = propertyBuyers(
    withoutDismissed(others, dismissals, cardKey(card)),
    progress as Map<string, BuyerProgressFacts>,
    row.loopProperty as BuyerLoopProperty,
    row.price,
    now,
  );
  const readyBuyers = result.ready.length;
  if (readyBuyers === 0) return null;
  return { readyBuyers, mention: row.step === 'owner' ? 'owner' : 'check' };
}

// Les tâches « Démarcher : N acquéreurs prêts correspondent », une par carte en mandat simple ou
// chez un particulier, prête ou à l'adresse à confirmer ; dues aujourd'hui, jamais en retard.
export function prospectBuyersTasks(
  cards: readonly AlertCard[],
  alerts: ReadonlyMap<AlertCard, CardAlert>,
  today: string,
): SuiviTask[] {
  return cards.flatMap((card): SuiviTask[] => {
    const alert = alerts.get(card);
    if (!alert || alert.mention !== 'owner') return [];
    return [
      {
        kind: 'prospect_buyers',
        projectId: card.projectIds[0] ?? '',
        sellerName: '',
        dueOn: today,
        count: alert.readyBuyers,
        prospectCard: {
          kind: card.kind,
          id: card.row.id,
          label: card.label,
          toConfirm: card.row.status === 'to_confirm',
          originBuyerIds: card.originBuyerIds,
          letterOriginId: card.letterOriginId,
        },
      },
    ];
  });
}

// Les acquéreurs prêts qui correspondent au bien d'un dossier vendeur : la règle de la boucle (M133),
// au prix de la M133, acquéreurs écartés exclus (M139). Une seule règle pour « Aujourd'hui », le
// Suivi et le dossier.
export function projectReadyBuyers(
  projectId: string,
  buyers: Buyer[],
  progress: Map<string, BuyerProgressFacts>,
  property: { property: BuyerLoopProperty; price: number | null } | undefined,
  dismissals: ReadonlyMap<string, ReadonlySet<string>> | undefined,
  now: Date,
): number {
  return propertyBuyers(
    withoutDismissed(buyers, dismissals, `project:${projectId}`),
    progress,
    property?.property ?? null,
    property?.price ?? null,
    now,
  ).ready.length;
}

// La mention de la carte de Prospection : jamais un nom d'acquéreur, seulement leur nombre ; le
// démarchage passe par courrier ou passage, jamais par téléphone (décision du 07/11).
export function cardAlertLabel(alert: CardAlert): string {
  const count =
    alert.readyBuyers > 1
      ? `${alert.readyBuyers} acquéreurs prêts correspondent`
      : '1 acquéreur prêt correspond';
  return alert.mention === 'owner'
    ? `${count} · courrier ou passage`
    : `${count} : précisez le mandat`;
}

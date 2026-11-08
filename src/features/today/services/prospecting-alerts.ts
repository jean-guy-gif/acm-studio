import type { BuyerProspectCard } from '@/features/buyer-prospecting/types';
import type { AgencyBuyers } from '@/features/buyers/queries/get-property-buyers';
import { idealLabel } from '@/features/ideal-properties/services/ideal-label';
import type { ProspectingCard } from '@/features/prospecting/types';
import {
  cardAlert,
  type AlertCard,
  type CardAlert,
} from '@/features/today/services/mandate-alerts';
import { formatEuro } from '@/lib/format';

// Mission 145 (partie B) — les cartes de Prospection (concurrents des mandats signés et biens
// démarchés) que veulent des acquéreurs prêts. Une seule fonction pour « Aujourd'hui » et la page
// Prospection : la tâche et la mention de la carte disent toujours le même nombre. Pur.
export function prospectingAlerts(
  vendorCards: readonly ProspectingCard[],
  buyerCards: readonly BuyerProspectCard[],
  agency: AgencyBuyers,
  dismissals: ReadonlyMap<string, ReadonlySet<string>> | null,
  now: Date,
): { cards: AlertCard[]; alerts: Map<AlertCard, CardAlert> } {
  const labelOf = (row: AlertCard['row']): string =>
    [
      idealLabel({
        propertyType: row.propertyType,
        roomsCount: row.roomsCount,
        surfaceArea: row.surfaceArea,
        city: row.city,
      }),
      row.price != null ? formatEuro(row.price) : null,
    ]
      .filter(Boolean)
      .join(' · ');
  const cards: AlertCard[] = [
    ...vendorCards.map((card): AlertCard => ({
      kind: 'competitor',
      row: card.row,
      // Le dossier de la copie de référence d'abord : le courrier de la tâche compare CE dossier à
      // CE concurrent (`card.row` est la copie de référence, M98).
      projectIds: [
        card.seller.projectId,
        ...card.sellers
          .map((seller) => seller.projectId)
          .filter((projectId) => projectId !== card.seller.projectId),
      ],
      label: labelOf(card.row),
      originBuyerIds: [],
      letterOriginId: null,
    })),
    ...buyerCards.map((card): AlertCard => ({
      kind: 'buyer_prospect',
      row: card.row,
      projectIds: [],
      label: labelOf(card.row),
      originBuyerIds: card.origins.map((origin) => origin.buyerId),
      letterOriginId: card.origins[0]?.originId ?? null,
    })),
  ];
  const alerts = new Map<AlertCard, CardAlert>();
  // Une lecture en échec n'invente jamais une alerte (M98).
  if (agency.failed || dismissals == null) return { cards, alerts };
  for (const card of cards) {
    const alert = cardAlert(card, agency.buyers, agency.progress, dismissals, now);
    if (alert) alerts.set(card, alert);
  }
  return { cards, alerts };
}

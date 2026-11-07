import { buyerProspectingCard } from '@/features/buyer-prospecting/services/buyer-prospect-card';
import type { BuyerOriginLabel, BuyerProspectCard } from '@/features/buyer-prospecting/types';
import { ProspectingCard } from '@/features/prospecting/components/prospecting-card';
import { BOARD_COLUMNS } from '@/features/prospecting/services/prospecting-status';
import type { ProspectingCard as Card } from '@/features/prospecting/types';

// Mission 86 — le tableau de la page Prospection : quatre colonnes côte à côte quand la place
// le permet, deux puis une quand elle manque (tablette en portrait). La largeur lue est celle
// du tableau lui-même, pas de la fenêtre : la barre latérale en prend une part.
// Mission 98 — une carte par bien ; `sellerId` est le bien vendeur filtré, s'il y en a un.
// Mission 120 — les cartes nées d'une recherche acquéreur entrent dans les mêmes colonnes ; une
// carte de concurrent montre aussi les recherches acquéreur qui l'ont visée.
export function ProspectingBoard({
  cards: all,
  sellerId,
  buyerCards = [],
  originsByComparable = new Map(),
}: {
  cards: Card[];
  sellerId: string | null;
  buyerCards?: BuyerProspectCard[];
  originsByComparable?: Map<string, BuyerOriginLabel[]>;
}) {
  return (
    <div className="@container">
      <div className="grid grid-cols-1 gap-3.5 @2xl:grid-cols-2 @5xl:grid-cols-4">
        {BOARD_COLUMNS.map((column) => {
          const inColumn = (status: string) =>
            (column.statuses as readonly string[]).includes(status);
          const cards = all.filter((card) => inColumn(card.row.status));
          const buyers = buyerCards.filter((card) => inColumn(card.row.status));
          return (
            <section
              key={column.key}
              data-testid={`prospecting-column-${column.key}`}
              className="flex min-w-0 flex-col gap-2.5 rounded-2xl bg-zinc-100 p-3 stage:bg-white/[0.04]"
            >
              <h2 className="flex items-center justify-between gap-2 px-1 font-title text-sm font-semibold text-zinc-800 stage:text-white/85">
                {column.title}
                <span className="rounded-full bg-white px-2 text-xs font-medium text-zinc-500 stage:bg-white/10 stage:text-white/60">
                  {cards.length + buyers.length}
                </span>
              </h2>
              {cards.length + buyers.length > 0 ? (
                <ul className="flex flex-col gap-2.5">
                  {cards.map((card) => (
                    <ProspectingCard
                      key={card.row.id}
                      card={card}
                      sellerId={sellerId}
                      buyerOrigins={buyerOriginsOf(card, originsByComparable)}
                    />
                  ))}
                  {buyers.map((card) => (
                    <ProspectingCard
                      key={card.prospectId}
                      card={buyerProspectingCard(card)}
                      buyerOrigins={card.origins}
                      buyerProspectId={card.prospectId}
                    />
                  ))}
                </ul>
              ) : (
                <p className="px-1 pb-1 text-xs text-zinc-500 stage:text-white/40">Aucun.</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

// Les recherches acquéreur qui visent l'une des copies de la carte.
export function buyerOriginsOf(
  card: Card,
  originsByComparable: Map<string, BuyerOriginLabel[]>,
): BuyerOriginLabel[] {
  return card.copies.flatMap((copy) => originsByComparable.get(copy.row.id) ?? []);
}

import { ProspectingCard } from '@/features/prospecting/components/prospecting-card';
import { BOARD_COLUMNS } from '@/features/prospecting/services/prospecting-status';
import type { ProspectingEntry } from '@/features/prospecting/types';

// Mission 86 — le tableau de la page Prospection : quatre colonnes côte à côte quand la place
// le permet, deux puis une quand elle manque (tablette en portrait). La largeur lue est celle
// du tableau lui-même, pas de la fenêtre : la barre latérale en prend une part.
export function ProspectingBoard({ entries }: { entries: ProspectingEntry[] }) {
  return (
    <div className="@container">
      <div className="grid grid-cols-1 gap-3.5 @2xl:grid-cols-2 @5xl:grid-cols-4">
        {BOARD_COLUMNS.map((column) => {
          const cards = entries.filter((entry) =>
            (column.statuses as readonly string[]).includes(entry.row.status),
          );
          return (
            <section
              key={column.key}
              data-testid={`prospecting-column-${column.key}`}
              className="flex min-w-0 flex-col gap-2.5 rounded-2xl bg-zinc-100 p-3 stage:bg-white/[0.04]"
            >
              <h2 className="flex items-center justify-between gap-2 px-1 font-title text-sm font-semibold text-zinc-800 stage:text-white/85">
                {column.title}
                <span className="rounded-full bg-white px-2 text-xs font-medium text-zinc-500 stage:bg-white/10 stage:text-white/60">
                  {cards.length}
                </span>
              </h2>
              {cards.length > 0 ? (
                <ul className="flex flex-col gap-2.5">
                  {cards.map((entry) => (
                    <ProspectingCard key={entry.row.id} entry={entry} />
                  ))}
                </ul>
              ) : (
                <p className="px-1 pb-1 text-xs text-zinc-400 stage:text-white/40">Aucun.</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

import type { ProspectingRow } from '@/features/competitor-locator/services/build-prospecting-rows';
import { formatEuro, formatSquareMeters } from '@/lib/format';

// Mission 75 — une ligne par concurrent à prospecter : l'adresse et l'étiquette du Localisateur,
// puis ce que dit l'annonce. Écran CONSEILLER, jamais montré au vendeur. Sobre : la même liste
// sert à l'écran et à l'impression A4.
export function ProspectingList({ rows }: { rows: ProspectingRow[] }) {
  return (
    <ol className="flex flex-col divide-y divide-zinc-200 stage:divide-white/10 print:divide-zinc-300">
      {rows.map((row, index) => {
        const facts = [
          row.price != null ? formatEuro(row.price) : null,
          row.surfaceArea != null ? formatSquareMeters(row.surfaceArea) : null,
          row.roomsCount != null ? `${row.roomsCount} pièce${row.roomsCount > 1 ? 's' : ''}` : null,
        ].filter((fact): fact is string => fact !== null);

        return (
          <li key={row.id} className="flex break-inside-avoid gap-3 py-3 text-sm">
            <span className="w-6 shrink-0 font-semibold text-zinc-400 stage:text-white/40 print:text-zinc-500">
              {index + 1}.
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="font-semibold text-zinc-900 stage:text-white print:text-black">
                {row.address ?? 'Adresse non localisée'}
              </span>
              {row.label ? (
                <span className="text-zinc-500 stage:text-white/60 print:text-zinc-700">
                  {row.label}
                </span>
              ) : null}
              {row.title ? (
                <span className="text-zinc-600 stage:text-white/70 print:text-zinc-800">
                  {row.title}
                </span>
              ) : null}
              {facts.length > 0 ? (
                <span className="text-zinc-700 stage:text-white/80 print:text-black">
                  {facts.join(' · ')}
                </span>
              ) : null}
              {row.onlineSince ? (
                <span className="text-zinc-500 stage:text-white/60 print:text-zinc-700">
                  {row.onlineSince}
                </span>
              ) : null}
              {row.priceDrop ? (
                <span className="text-zinc-500 stage:text-white/60 print:text-zinc-700">
                  {row.priceDrop}
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

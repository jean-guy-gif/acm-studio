import { card, kickerLabel, pageTitle } from '@/components/ui/styles';

// Mission 128 — l'attente d'un espace, tout de suite après le clic : le sur-titre et le titre de
// la page (des textes fixes, jamais une donnée), puis des formes grises à la place des lignes ou
// des colonnes. Composant pur : il ne lit rien, ni session, ni base, ni paramètre.
const bar = 'rounded-md bg-zinc-200/70 stage:bg-white/10 animate-pulse motion-reduce:animate-none';

export function PageSkeleton({
  kicker,
  title,
  layout = 'rows',
}: {
  kicker: string;
  title: string;
  // Des lignes (Suivi, Préparation, Live, Visites, Acquéreurs) ou des colonnes (Prospection).
  layout?: 'rows' | 'columns';
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="flex flex-col gap-5 md:gap-6"
      data-testid="page-skeleton"
    >
      <span className="sr-only">Chargement…</span>
      <div className="flex flex-col gap-1.5" aria-hidden>
        <span className={kickerLabel}>{kicker}</span>
        <span className={pageTitle}>{title}</span>
        <span className={`${bar} h-4 w-72 max-w-full`} />
      </div>
      {layout === 'columns' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-hidden>
          {[0, 1, 2, 3].map((column) => (
            <div key={column} className={`${card} flex flex-col gap-3 p-4`}>
              <span className={`${bar} h-4 w-32`} />
              <span className={`${bar} h-20 w-full`} />
              <span className={`${bar} h-20 w-full`} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3" aria-hidden>
          {[0, 1, 2].map((row) => (
            <div key={row} className={`${card} flex flex-col gap-3 p-5`}>
              <span className={`${bar} h-5 w-1/2`} />
              <span className={`${bar} h-4 w-3/4`} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

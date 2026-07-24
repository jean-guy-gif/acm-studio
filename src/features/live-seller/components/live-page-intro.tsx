import type { LiveComparativeData } from '@/features/seller-presentation/types/seller-presentation';

export function LivePageIntro({
  live,
  sellerName,
}: {
  live: LiveComparativeData | null;
  sellerName: string;
}) {
  const count = live?.comparables.length ?? 0;
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-semibold">Analyse comparative — {sellerName}</h2>
      <p className="max-w-2xl text-zinc-600 dark:text-zinc-300">
        Nous allons parcourir, un par un, les biens actuellement en concurrence avec votre logement.
        Pour chacun, trois questions : est-il un sérieux concurrent, à quel prix est-il proposé, et
        pourquoi est-il toujours sur le marché.
      </p>
      {count > 0 ? (
        <p className="text-sm text-zinc-500">
          {count} bien{count > 1 ? 's' : ''} concurrent{count > 1 ? 's' : ''} à examiner.
        </p>
      ) : (
        <p className="text-sm text-amber-600">
          Aucun bien concurrent retenu : préparez le dossier dans le Builder avant le rendez-vous.
        </p>
      )}
    </div>
  );
}

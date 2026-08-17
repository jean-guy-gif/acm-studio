import { Logo } from '@/components/brand/logo';
import type { LiveComparativeData } from '@/features/seller-presentation/types/seller-presentation';

// Introduction premium : composition sombre, une seule idée principale, logo,
// dossier vendeur, et un unique bouton de démarrage.
export function LivePageIntro({
  live,
  sellerName,
  address,
  onStart,
}: {
  live: LiveComparativeData | null;
  sellerName: string;
  address: string | null;
  onStart: () => void;
}) {
  const count = live?.comparables.length ?? 0;

  return (
    <section className="relative overflow-hidden rounded-card bg-gradient-to-br from-brand-deep to-[#01283b] p-8 text-white sm:p-12">
      <div className="flex flex-col gap-8">
        <Logo onDark priority className="h-10" />
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium tracking-[0.2em] text-brand uppercase">
            Rendez-vous vendeur
          </p>
          <h2 className="max-w-2xl text-3xl leading-tight font-semibold sm:text-4xl">
            Découvrons ensemble les biens en concurrence avec votre logement.
          </h2>
          <div className="text-white/80">
            <p className="text-lg font-medium">{sellerName}</p>
            {address ? <p className="text-sm">{address}</p> : null}
          </div>
        </div>

        {count > 0 ? (
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onStart}
              className="rounded-md bg-brand px-6 py-3 text-base font-medium text-white shadow-sm transition-colors hover:bg-white hover:text-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Démarrer la présentation
            </button>
            <span className="text-sm text-white/70">
              {count} bien{count > 1 ? 's' : ''} concurrent{count > 1 ? 's' : ''} à examiner
            </span>
          </div>
        ) : (
          <p className="text-sm text-amber-300">
            Aucun bien concurrent retenu : préparez le dossier dans la Préparation avant le
            rendez-vous.
          </p>
        )}
      </div>
    </section>
  );
}

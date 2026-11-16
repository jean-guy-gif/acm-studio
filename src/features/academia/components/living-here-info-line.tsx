import { LIVING_HERE_INFO } from '@/features/academia/services/living-here-info';

// Mission 156 — la ligne d'information du lien « Vivre ici » d'un bien hors mandat (planches A3-1
// et A3-2), pour le conseiller seul : en tête du bloc du dossier acquéreur, et au moment du partage.
export function LivingHereInfo({ prefix = null }: { prefix?: string | null }) {
  return (
    <p
      className="flex items-start gap-2 rounded-xl bg-sky-50 px-3 py-2 text-sm text-zinc-700"
      data-testid="living-here-info"
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-sky-800 font-serif text-[0.7rem] font-bold text-white italic"
      >
        i
      </span>
      <span>
        {prefix}
        {LIVING_HERE_INFO}
      </span>
    </p>
  );
}

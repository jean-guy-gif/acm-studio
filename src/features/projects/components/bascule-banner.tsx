import Link from 'next/link';

import { launchLiveHref } from '@/features/projects/services/dossier-steps';

// MISSION 52 §2 — la bascule automatique SE VOIT : un dossier qui disparaît tout seul de
// l'écran qu'on regarde est désorientant. Au moment où il bascule (draft → ready), l'écran
// le dit en une phrase, avec le moyen d'aller le voir à sa nouvelle place (le Live).
export function BasculeBanner({ projectId }: { projectId: string }) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-900 stage:border-emerald-400/40 stage:bg-emerald-400/10 stage:text-emerald-200"
    >
      <span className="text-sm font-medium">
        Ce dossier est prêt&nbsp;: il vient de basculer dans le Live et sort de la liste «&nbsp;En
        cours&nbsp;» de la Préparation. Il reste modifiable ici.
      </span>
      <Link
        // Mission 107 — le même contrôle que « Lancer le Live » : confirmation sur un vrai dossier.
        href={launchLiveHref(projectId)}
        className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
      >
        Ouvrir dans le Live →
      </Link>
    </div>
  );
}

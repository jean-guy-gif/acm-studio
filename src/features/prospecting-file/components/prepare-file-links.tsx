import Link from 'next/link';

import { btnPrimary, btnSecondary } from '@/components/ui/styles';
import type { ProspectingStep } from '@/features/competitor-mandate/services/mandate-columns';
import {
  ADDRESS_TO_CONFIRM_MESSAGE,
  fileVersions,
} from '@/features/prospecting-file/services/file-access';
import { PROSPECTING_FILE_VERSION_LABELS } from '@/features/prospecting-file/types';

// Mission 84 — « Préparer le dossier » sur une ligne de la liste de tournée. La version se
// choisit seule (exclusivité → confrère, particulier ou mandat simple → propriétaire) ; quand
// ACM ne sait pas, le conseiller choisit. Pas de dossier propriétaire sans adresse confirmée.
export function PrepareFileLinks({
  projectId,
  competitorId,
  step,
  addressConfirmed,
  primary = false,
}: {
  projectId: string;
  competitorId: string;
  step: ProspectingStep;
  addressConfirmed: boolean;
  // Mission 86 — sur une carte de Prospection, c'est l'action principale, en petit.
  primary?: boolean;
}) {
  const versions = fileVersions(step);
  const single = versions.length === 1;
  return (
    <div className="flex flex-wrap items-center gap-2 py-0.5 print:hidden">
      {versions.map((version) =>
        version === 'owner' && !addressConfirmed ? (
          <span key={version} className="text-sm font-medium text-amber-700 stage:text-amber-300">
            {ADDRESS_TO_CONFIRM_MESSAGE}
            {single ? '' : ` (dossier ${PROSPECTING_FILE_VERSION_LABELS[version].toLowerCase()})`}
          </span>
        ) : (
          <Link
            key={version}
            href={`/builder/${projectId}/prospection/${competitorId}?version=${version}`}
            target="_blank"
            className={primary ? `${btnPrimary} px-3 py-1.5 text-xs` : btnSecondary}
          >
            {single
              ? 'Préparer le dossier'
              : `Préparer le dossier ${PROSPECTING_FILE_VERSION_LABELS[version].toLowerCase()}`}
          </Link>
        ),
      )}
    </div>
  );
}

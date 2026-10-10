import Link from 'next/link';

import { btnSecondary, card, hintText, sectionTitle } from '@/components/ui/styles';
import { CompetitorLocatorWatcher } from '@/features/competitor-locator/components/competitor-locator-watcher';
import { ProspectingList } from '@/features/competitor-locator/components/prospecting-list';
import type { ProspectingRow } from '@/features/competitor-locator/services/build-prospecting-rows';

// Mission 75 — dossier conclu « mandat signé » : les concurrents retenus deviennent une liste de
// propriétaires à aller voir. Écran conseiller.
export function ProspectingSection({
  projectId,
  rows,
}: {
  projectId: string;
  rows: ProspectingRow[];
}) {
  return (
    <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className={sectionTitle}>Concurrents à prospecter</h2>
          <p className={hintText}>
            Le mandat est signé : vos acquéreurs visiteront aussi ces biens. Écran conseiller — le
            vendeur ne le voit pas.
          </p>
        </div>
        {rows.length > 0 ? (
          <Link href={`/builder/${projectId}/prospection`} target="_blank" className={btnSecondary}>
            Imprimer la liste de tournée
          </Link>
        ) : null}
      </div>
      <CompetitorLocatorWatcher projectId={projectId} showNotice />
      {rows.length > 0 ? (
        <ProspectingList rows={rows} filesProjectId={projectId} />
      ) : (
        <p className={hintText}>Aucun concurrent retenu dans ce dossier.</p>
      )}
    </section>
  );
}

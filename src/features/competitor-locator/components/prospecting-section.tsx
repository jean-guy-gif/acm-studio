import Link from 'next/link';

import { btnSecondary, card, hintText, sectionTitle } from '@/components/ui/styles';
import { CompetitorLocatorWatcher } from '@/features/competitor-locator/components/competitor-locator-watcher';
import { ProspectingList } from '@/features/competitor-locator/components/prospecting-list';
import type { ProspectingRow } from '@/features/competitor-locator/services/build-prospecting-rows';

// Mission 75 — dossier conclu « mandat signé » : les concurrents retenus deviennent une liste de
// propriétaires à aller voir. Écran conseiller.
// Mission 86 — la liste complète vit sur la page Prospection : ici, les trois premières lignes
// et le lien qui y mène, filtré sur ce bien.
const PREVIEW_ROWS = 3;

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
        <>
          <ProspectingList rows={rows.slice(0, PREVIEW_ROWS)} filesProjectId={projectId} />
          <Link
            href={`/prospection?bien=${projectId}`}
            className="text-sm font-semibold text-brand-deep hover:underline stage:text-brand"
          >
            Tout voir dans Prospection →
          </Link>
        </>
      ) : (
        <p className={hintText}>Aucun concurrent retenu dans ce dossier.</p>
      )}
    </section>
  );
}

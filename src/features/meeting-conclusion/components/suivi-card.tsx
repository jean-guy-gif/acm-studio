import Link from 'next/link';

import {
  badgeBrand,
  badgeNeutral,
  badgeRejected,
  badgeSelected,
  btnSecondary,
  card,
  metaLabel,
} from '@/components/ui/styles';
import { ConclusionAmountsPanel } from '@/features/meeting-conclusion/components/conclusion-amounts-panel';
import { SuiviIssueForm } from '@/features/meeting-conclusion/components/suivi-issue-form';
import type { SuiviDossier } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import { OUTCOME_LABELS, type ConclusionOutcome } from '@/features/meeting-conclusion/types';
import { propertyLabel } from '@/features/projects/services/property-label';

const euro = (value: number): string => `${Math.round(value).toLocaleString('fr-FR')} €`;

const formatDate = (iso: string | null): string | null =>
  iso ? new Date(iso).toLocaleDateString('fr-FR') : null;

// « Vendu ailleurs » (parti) en rouge ; « retiré » (peut revenir) en gris neutre.
const OUTCOME_BADGE: Record<ConclusionOutcome, string> = {
  signed: badgeSelected,
  follow_up: badgeBrand,
  sold_elsewhere: badgeRejected,
  withdrawn: badgeNeutral,
};

// Mission 53/54 — la carte de Suivi : le bien, l'issue (modifiable), le prix convenu (ou
// son absence), les quatre chiffres figés et leurs écarts, les deux dates, et le motif.
export function SuiviCard({ dossier }: { dossier: SuiviDossier }) {
  const { project, property, conclusion } = dossier;
  const bien = propertyLabel(property);
  const outcome = conclusion?.outcome ?? null;
  const price = conclusion?.commercializationPrice ?? null;
  const meetingDate = formatDate(conclusion?.concludedAt ?? project.updated_at);
  const changedDate = formatDate(conclusion?.outcomeChangedAt ?? null);
  // Deux dates identiques = du bruit : on ne montre la seconde que si elle diffère.
  const showChanged = changedDate != null && changedDate !== meetingDate;

  return (
    <li className={`${card} flex flex-col gap-4 p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-title text-xl font-semibold text-zinc-900 stage:text-white">
              {project.seller_name ?? 'Dossier vendeur'}
            </span>
            {outcome ? (
              <span className={OUTCOME_BADGE[outcome]}>{OUTCOME_LABELS[outcome]}</span>
            ) : null}
          </div>
          {bien ? (
            <span className="text-sm font-medium text-zinc-700 stage:text-white/80">{bien}</span>
          ) : (
            <span className="text-sm text-zinc-400 italic stage:text-white/45">
              Bien vendeur non renseigné
            </span>
          )}
          <span className="text-sm text-zinc-500 stage:text-white/60">
            {price != null ? (
              <>
                Prix de commercialisation convenu&nbsp;:{' '}
                <span className="font-medium text-zinc-800 stage:text-white/85">{euro(price)}</span>
              </>
            ) : (
              <span className="text-amber-700 stage:text-amber-300">
                Prix de commercialisation non convenu
              </span>
            )}
          </span>
          <span className="text-xs text-zinc-400 stage:text-white/40">
            {meetingDate ? `Rendez-vous conclu le ${meetingDate}` : null}
            {showChanged ? ` · Issue changée le ${changedDate}` : null}
          </span>
        </div>
        <Link href={`/builder/${project.id}`} className={btnSecondary}>
          Ouvrir le dossier
        </Link>
      </div>

      {conclusion ? <ConclusionAmountsPanel amounts={conclusion} /> : null}

      {outcome === 'follow_up' && conclusion?.followUpReason ? (
        <div className="flex flex-col gap-1">
          <span className={metaLabel}>À relancer — ce qui retient le vendeur</span>
          <p className="text-sm whitespace-pre-wrap text-zinc-700 stage:text-white/80">
            {conclusion.followUpReason}
          </p>
        </div>
      ) : null}

      <SuiviIssueForm
        projectId={project.id}
        currentOutcome={outcome}
        currentReason={conclusion?.followUpReason ?? null}
      />
    </li>
  );
}

import Link from 'next/link';

import { badgeBrand, badgeSelected, btnSecondary, card, metaLabel } from '@/components/ui/styles';
import { ConclusionAmountsPanel } from '@/features/meeting-conclusion/components/conclusion-amounts-panel';
import type { SuiviDossier } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import { propertyLabel } from '@/features/projects/services/preparation-card';

const euro = (value: number): string => `${Math.round(value).toLocaleString('fr-FR')} €`;

const formatDate = (iso: string | null): string | null =>
  iso ? new Date(iso).toLocaleDateString('fr-FR') : null;

// Mission 53 §4 — la carte de Suivi : le bien, l'issue, le prix convenu (ou son absence),
// les quatre chiffres figés et leurs écarts, la date, et le motif pour les « à relancer ».
export function SuiviCard({ dossier }: { dossier: SuiviDossier }) {
  const { project, property, conclusion } = dossier;
  const bien = propertyLabel(property);
  const signed = conclusion?.outcome === 'signed';
  const followUp = conclusion?.outcome === 'follow_up';
  const price = conclusion?.commercializationPrice ?? null;
  const date = formatDate(conclusion?.concludedAt ?? project.updated_at);

  return (
    <li className={`${card} flex flex-col gap-4 p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-title text-xl font-semibold text-zinc-900 stage:text-white">
              {project.seller_name ?? 'Dossier vendeur'}
            </span>
            {signed ? <span className={badgeSelected}>Mandat signé</span> : null}
            {followUp ? <span className={badgeBrand}>À relancer</span> : null}
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
          {date ? (
            <span className="text-xs text-zinc-400 stage:text-white/40">
              Rendez-vous conclu le {date}
            </span>
          ) : null}
        </div>
        <Link href={`/builder/${project.id}`} className={btnSecondary}>
          Ouvrir le dossier
        </Link>
      </div>

      {conclusion ? <ConclusionAmountsPanel amounts={conclusion} /> : null}

      {followUp && conclusion?.followUpReason ? (
        <div className="flex flex-col gap-1">
          <span className={metaLabel}>À relancer — ce qui retient le vendeur</span>
          <p className="text-sm whitespace-pre-wrap text-zinc-700 stage:text-white/80">
            {conclusion.followUpReason}
          </p>
        </div>
      ) : null}
    </li>
  );
}

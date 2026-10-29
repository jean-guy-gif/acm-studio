import Link from 'next/link';

import { emptyState, kickerLabel, pageSubtitle, pageTitle } from '@/components/ui/styles';
import { getBuyer } from '@/features/buyers/queries/get-buyers';
import { buyerToCriteria } from '@/features/buyers/services/buyer-criteria';
import { BuyerSearchPanel } from '@/features/meeting-conclusion/components/buyer-search-panel';
import { SuiviRow } from '@/features/meeting-conclusion/components/suivi-row';
import { listMarketUpdates } from '@/features/market-update/queries/list-market-updates';
import {
  emptySellerInsights,
  getSellerInsights,
} from '@/features/meeting-conclusion/queries/get-seller-insights';
import { getSuiviDossiers } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import {
  buildDossierFollowUp,
  type DossierFollowUp,
} from '@/features/meeting-conclusion/services/dossier-follow-up';
import { dueTodayLabel } from '@/features/meeting-conclusion/services/follow-up-contacts';
import {
  SUIVI_GROUPS,
  SUIVI_GROUP_LABELS,
  averageJourneyGap,
  exclusiveLabel,
  exclusiveSignedCount,
  filterSuiviByGroup,
  filterSuiviByMotive,
  followUpMotiveCounts,
  parseFollowUpMotive,
  parseSuiviGroup,
  sortSuivi,
  suiviCounts,
  type SuiviGroup,
} from '@/features/meeting-conclusion/services/filter-suivi';
import {
  FOLLOW_UP_MOTIVES,
  FOLLOW_UP_MOTIVE_LABELS,
  type FollowUpMotive,
} from '@/features/meeting-conclusion/types';
import { getAgencyBranding } from '@/features/branding/queries/get-agency-branding';
import { documentAgencyName } from '@/features/prospecting-file/services/document-name';
import { withoutExamples } from '@/features/welcome/services/example-exclusion';
import { getAgencyProspecting } from '@/features/prospecting/queries/get-agency-prospecting';
import {
  prospectingProgress,
  type ProspectingStatus,
} from '@/features/prospecting/services/prospecting-status';
import { getAgency } from '@/lib/auth/get-agency';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';
import { formatPercent } from '@/lib/format';

type SuiviPageProps = {
  searchParams: Promise<{ issue?: string; motif?: string; acquereur?: string }>;
};

const chip =
  'rounded-full border px-3 py-1 text-sm font-semibold whitespace-nowrap transition-colors';
const chipActive = `${chip} border-brand-deep bg-brand-deep text-white`;
const chipIdle = `${chip} border-zinc-200 bg-white text-zinc-600 hover:border-brand hover:text-brand-deep stage:border-white/15 stage:bg-white/5 stage:text-white/70`;

const tile =
  'flex min-w-36 flex-col rounded-xl border bg-white px-4 py-3 transition-colors stage:bg-white/5';
const tileIdle = `${tile} border-zinc-200 hover:border-brand stage:border-white/10`;
const tileActive = `${tile} border-brand-deep ring-1 ring-brand-deep stage:border-brand stage:ring-brand`;

const COUNT_COLOR: Record<SuiviGroup, string> = {
  signed: 'text-zinc-900 stage:text-white',
  follow_up: 'text-brand-deep stage:text-brand',
  lost: 'text-zinc-400 stage:text-white/50',
};

const groupHref = (group: SuiviGroup | null): string =>
  group == null ? '/suivi' : `/suivi?issue=${group}`;

// Mission 96 — le filtre par motif ne porte que sur les « à relancer » : l'adresse le dit.
const motiveHref = (motive: FollowUpMotive): string => `/suivi?issue=follow_up&motif=${motive}`;

// Mission 54 — le Suivi qui sert : filtrer, rapprocher un acheteur, faire évoluer l'issue.
// Mission 86 — il se lit d'un coup d'œil : des compteurs qui filtrent, une ligne courte par
// dossier, une seule action selon l'issue. « Tous » ne masque rien (règle M52).
export default async function SuiviPage({ searchParams }: SuiviPageProps) {
  const { issue, motif, acquereur } = await searchParams;
  const motive = parseFollowUpMotive(motif);
  // Mission 117 — « Rapprocher » depuis une fiche acquéreur : ses critères pré-remplissent le
  // rapprochement ; une fiche archivée ou d'une autre agence n'est pas lue (M93).
  const buyer = acquereur ? await getBuyer(acquereur) : null;
  // Un motif choisi ne montre que des « à relancer ».
  const group = motive != null ? 'follow_up' : parseSuiviGroup(issue);

  const allDossiers = await getSuiviDossiers();
  // Mission 97 — un dossier d'exemple se voit dans la liste (badge « Exemple »), mais ne compte
  // nulle part : tuiles, écart moyen, « à relancer aujourd'hui », motifs, rapprochement acheteur.
  const counted = withoutExamples(allDossiers);
  const [{ cards }, insights, profile, branding] = await Promise.all([
    getAgencyProspecting(counted),
    getSellerInsights(allDossiers.map((dossier) => dossier.project.id)),
    getProfile(),
    getAgencyBranding(),
  ]);
  const agency = profile ? await getAgency(profile.agency_id) : null;
  // Mission 127 — les points marché de chaque dossier.
  const marketUpdates = profile
    ? await listMarketUpdates(
        await createClient(),
        profile.agency_id,
        allDossiers.map((dossier) => dossier.project.id),
      )
    : new Map();
  const signature = {
    advisorFirstName: profile?.first_name ?? null,
    agencyName: documentAgencyName(branding?.documentName, agency?.name) || null,
  };
  const now = new Date();

  // Mission 96 — pour chaque dossier : ce que le vendeur a dit, ses relances, le délai depuis
  // le dernier contact et le message proposé. Calculé ici, côté serveur.
  const followUps = new Map<string, DossierFollowUp>();
  for (const dossier of allDossiers) {
    const own = insights.get(dossier.project.id) ?? emptySellerInsights();
    followUps.set(
      dossier.project.id,
      buildDossierFollowUp({
        conclusion: dossier.conclusion,
        liveStartedAt: dossier.project.live_started_at,
        liveEndedAt: dossier.project.live_ended_at,
        competitors: own.competitors,
        dangerous: own.dangerous,
        contacts: own.contacts,
        now,
        signature,
      }),
    );
  }
  const lastContacts = new Map(
    [...followUps].map(([projectId, followUp]) => [projectId, followUp.lastContactAt]),
  );
  const dueLabel = dueTodayLabel(
    counted.filter((dossier) => followUps.get(dossier.project.id)?.due).length,
  );
  const motiveCounts = followUpMotiveCounts(counted);

  // Les « à relancer » du plus ancien contact au plus récent.
  const dossiers = sortSuivi(
    filterSuiviByMotive(filterSuiviByGroup(allDossiers, group), motive),
    lastContacts,
  );
  const exclusives = exclusiveSignedCount(counted);
  const counts = suiviCounts(counted);
  const averageGap = averageJourneyGap(counted);

  // Mission 98 — le statut est celui de la carte (commun à toutes les copies d'un même bien) ;
  // une adresse « Ne plus solliciter » n'est plus à prospecter.
  const statusesByProject = new Map<string, ProspectingStatus[]>();
  for (const card of cards) {
    if (card.row.opposedOn != null) {
      continue;
    }
    for (const seller of card.sellers) {
      statusesByProject.set(seller.projectId, [
        ...(statusesByProject.get(seller.projectId) ?? []),
        card.row.status,
      ]);
    }
  }

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <div className="flex flex-col gap-1.5">
        <span className={kickerLabel}>Après le rendez-vous</span>
        <h1 className={pageTitle}>Suivi</h1>
        <p className={pageSubtitle}>
          Vos rendez-vous conclus, et ce qu’il reste à faire pour chacun.
        </p>
      </div>

      {allDossiers.length === 0 ? (
        <div className={emptyState}>
          <p className="font-title text-lg font-semibold text-zinc-700 stage:text-white/85">
            Aucun dossier conclu pour le moment.
          </p>
          <p className="mt-1 text-sm text-zinc-500 stage:text-white/60">
            Un dossier arrive ici une fois le rendez-vous conclu depuis le Live.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            {SUIVI_GROUPS.map((value) => (
              <Link
                key={value}
                href={groupHref(group === value ? null : value)}
                aria-current={group === value ? 'true' : undefined}
                className={group === value ? tileActive : tileIdle}
              >
                <span className={`font-title text-2xl font-bold ${COUNT_COLOR[value]}`}>
                  {counts[value]}
                </span>
                <span className="text-xs whitespace-nowrap text-zinc-500 stage:text-white/60">
                  {SUIVI_GROUP_LABELS[value]}
                </span>
                {/* Mission 96 — combien attendent depuis plus de 7 jours. */}
                {value === 'follow_up' && dueLabel ? (
                  <span
                    data-testid="follow-up-due-count"
                    className="text-xs font-semibold whitespace-nowrap text-amber-700 stage:text-amber-300"
                  >
                    {dueLabel}
                  </span>
                ) : null}
                {/* Mission 90 — la mesure de la bêta : dont combien d'exclusifs. */}
                {value === 'signed' && counts.signed > 0 ? (
                  <span className="text-xs font-semibold whitespace-nowrap text-brand-deep stage:text-brand">
                    {exclusiveLabel(exclusives)}
                  </span>
                ) : null}
              </Link>
            ))}
            {averageGap != null ? (
              <div className="flex min-w-56 flex-col rounded-xl bg-brand-deep px-4 py-3 text-white">
                <span className="font-title text-2xl font-bold whitespace-nowrap">
                  {formatPercent(Math.round(averageGap), { signed: true })}
                </span>
                <span className="text-xs text-white/70">
                  Écart moyen&nbsp;: prix du vendeur → prix de commercialisation
                </span>
              </div>
            ) : null}
          </div>

          <BuyerSearchPanel
            dossiers={counted}
            entries={cards
              .filter((card) => card.row.opposedOn == null)
              .map(({ row, seller }) => ({ row, seller }))}
            initialCriteria={buyer ? buyerToCriteria(buyer) : null}
            buyerName={buyer?.name ?? null}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/suivi" className={group === null ? chipActive : chipIdle}>
              Tous
            </Link>
            {SUIVI_GROUPS.map((value) => (
              <Link
                key={value}
                href={groupHref(value)}
                className={group === value && motive == null ? chipActive : chipIdle}
              >
                {SUIVI_GROUP_LABELS[value]}
              </Link>
            ))}
          </div>

          {/* Mission 96 — le filtre par motif de relance : seuls les motifs portés par un dossier. */}
          {motiveCounts.size > 0 ? (
            <div
              className="flex flex-wrap items-center gap-2"
              data-testid="follow-up-motive-filter"
            >
              <span className="text-xs font-semibold text-zinc-500 stage:text-white/60">
                À relancer, par motif&nbsp;:
              </span>
              {FOLLOW_UP_MOTIVES.filter((value) => motiveCounts.has(value)).map((value) => (
                <Link
                  key={value}
                  href={motive === value ? groupHref('follow_up') : motiveHref(value)}
                  aria-current={motive === value ? 'true' : undefined}
                  className={motive === value ? chipActive : chipIdle}
                >
                  {FOLLOW_UP_MOTIVE_LABELS[value]} · {motiveCounts.get(value)}
                </Link>
              ))}
            </div>
          ) : null}

          {dossiers.length === 0 ? (
            <div className={emptyState}>
              <p className="text-sm text-zinc-500 stage:text-white/60">
                Aucun dossier pour ce filtre.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {dossiers.map((dossier) => {
                const statuses = statusesByProject.get(dossier.project.id) ?? [];
                return (
                  <SuiviRow
                    key={dossier.project.id}
                    dossier={dossier}
                    followUp={followUps.get(dossier.project.id)!}
                    marketUpdates={marketUpdates.get(dossier.project.id) ?? []}
                    prospecting={
                      dossier.conclusion?.outcome === 'signed' && !dossier.project.is_example
                        ? { count: statuses.length, progress: prospectingProgress(statuses) }
                        : null
                    }
                  />
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

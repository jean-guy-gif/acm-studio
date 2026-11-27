import { notFound } from 'next/navigation';

import {
  badgeNeutral,
  card,
  hintText,
  kickerLabel,
  pageSubtitle,
  pageTitle,
  sectionTitle,
} from '@/components/ui/styles';
import { setAgencyDemo } from '@/features/operations/actions/set-agency-demo';
import { setAgencySearchCap } from '@/features/operations/actions/set-agency-search-cap';
import { setAgencyAiCap } from '@/features/operations/actions/set-agency-ai-cap';
import { setAgencyWatchCap } from '@/features/operations/actions/set-agency-watch-cap';
import {
  aiBudgetOf,
  aiBudgetOpen,
  getAiBudgets,
} from '@/features/ai-budget/queries/get-ai-budgets';
import { formatEuro } from '@/lib/format';
import { AgencyCapForm } from '@/features/operations/components/agency-cap-form';
import { AgencyDemoToggle } from '@/features/operations/components/agency-demo-toggle';
import { getAgencyBudgets } from '@/features/operations/queries/get-agency-budgets';
import {
  getErrorReport,
  getImportFailureReport,
} from '@/features/operations/queries/get-error-report';
import { ERRORS_WINDOW_DAYS, errorSourceLabel } from '@/features/operations/services/group-errors';
import { requireOperator } from '@/features/operations/services/require-operator';
import {
  OPERATOR_BUDGET_REACHED,
  WATCH_OPERATOR_STATE,
  budgetUsageLabel,
} from '@/features/operations/services/usage-costs';
import { budgetWarningLabel } from '@/features/search-budget/services/budget';
import { formatRelativeMoment } from '@/lib/format';
import { readAcademiaKeys } from '@/features/academia/queries/read-academia-keys';
import { academiaKeyLine } from '@/features/academia/services/academia-key-status';
import { ACADEMIA_API_AGENCES_OUVERTES } from '@/features/academia/services/academia-api-access';

// Mission 100 — la page « Erreurs », réservée aux comptes de ACM_OPERATOR_EMAILS, écran ET
// adresse : pour tout autre compte (conseiller, manager), elle n'existe pas (404). Le garde
// précède TOUTE lecture : les deux requêtes passent par la clé service et traversent les agences.
export default async function ErrorsPage() {
  const guard = await requireOperator();
  if (!guard.ok) {
    notFound();
  }

  const [report, budgets, importFailures, aiBudgets, academiaKeys] = await Promise.all([
    getErrorReport(),
    getAgencyBudgets(),
    getImportFailureReport(),
    // Mission 151 — le budget d'IA de chaque agence (lecture des notes, classement des annonces).
    getAiBudgets(),
    // Mission 161 — ce que `GET /etat` dit des clés Academia posées dans Vercel.
    readAcademiaKeys(),
  ]);

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      <div className="flex flex-col gap-1.5">
        <span className={kickerLabel}>Exploitation</span>
        <h1 className={pageTitle}>Erreurs</h1>
        <p className={pageSubtitle}>
          Les erreurs inattendues des {ERRORS_WINDOW_DAYS} derniers jours, toutes agences
          confondues, regroupées par message. Les messages sont nettoyés&nbsp;: ni saisie, ni prix,
          ni adresse.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className={sectionTitle}>
          {report.total === 0
            ? 'Aucune erreur enregistrée'
            : `${report.total} erreur${report.total > 1 ? 's' : ''}, ${report.groups.length} message${report.groups.length > 1 ? 's' : ''} différent${report.groups.length > 1 ? 's' : ''}`}
        </h2>
        {report.truncated ? (
          <p className={hintText}>
            Seules les {report.total} erreurs les plus récentes sont comptées&nbsp;: il y en a
            davantage.
          </p>
        ) : null}
        <ul className="flex flex-col gap-3">
          {report.groups.map((group) => (
            <li key={group.message} className={`${card} flex flex-col gap-2 p-4`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="min-w-0 flex-1 font-mono text-sm break-words text-zinc-900 stage:text-white">
                  {group.message}
                </p>
                <span className={badgeNeutral}>{group.count} fois</span>
              </div>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-zinc-600 sm:grid-cols-2 stage:text-white/65">
                <div className="flex gap-1.5">
                  <dt className="font-medium">Dernière fois&nbsp;:</dt>
                  <dd>{formatRelativeMoment(group.lastAt)}</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt className="font-medium">Page&nbsp;:</dt>
                  <dd className="break-all">{group.lastPage}</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt className="font-medium">Agences touchées&nbsp;:</dt>
                  <dd>
                    {[
                      ...group.agencies,
                      ...(group.unknownAgency ? ['sans agence connue'] : []),
                    ].join(' · ')}
                  </dd>
                </div>
                <div className="flex gap-1.5">
                  <dt className="font-medium">Origine&nbsp;:</dt>
                  <dd>
                    {group.sources.map(errorSourceLabel).join(' · ')}
                    {group.lastVersion ? ` · version ${group.lastVersion.slice(0, 7)}` : ''}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </div>

      {/* Mission 101 — pas des pannes : comptés à part, et hors de la pastille du menu. */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className={sectionTitle}>Échecs de lecture par portail</h2>
          <p className={hintText}>
            Sur {ERRORS_WINDOW_DAYS} jours&nbsp;: les annonces retenues dont la page n’a pas pu être
            lue après trois essais, face à celles importées depuis leur page. Aucune adresse
            d’annonce n’est gardée. Le concurrent est alors créé depuis les données de la recherche.
          </p>
        </div>
        {importFailures.length === 0 ? (
          <p className={hintText}>Aucun import sur la période.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {importFailures.map((portal) => (
              <li key={portal.host} className={`${card} flex flex-col gap-1.5 p-4`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-title font-semibold text-zinc-900 stage:text-white">
                    {portal.host}
                  </span>
                  <span className={badgeNeutral}>
                    {portal.failed} échec{portal.failed > 1 ? 's' : ''} sur{' '}
                    {portal.failed + portal.read}
                    {portal.failureRate != null ? ` · ${portal.failureRate} %` : ''}
                  </span>
                </div>
                {portal.causes.length > 0 ? (
                  <ul className="flex flex-col text-sm text-zinc-600 stage:text-white/65">
                    {portal.causes.map((cause) => (
                      <li key={cause.cause}>
                        {cause.count} × {cause.label}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2" data-testid="academia-keys">
        <h2 className={sectionTitle}>Academia</h2>
        {(['agencies', 'demo'] as const).map((kind) => {
          const line = academiaKeyLine(kind, academiaKeys[kind]);
          return (
            <p key={kind} className="text-sm text-zinc-700 stage:text-white/75">
              {line.label}&nbsp;:{' '}
              <span
                className={
                  line.good ? 'font-semibold text-emerald-700' : 'font-semibold text-amber-700'
                }
              >
                {line.text}
              </span>
            </p>
          );
        })}
        <p className={hintText}>
          Ouvert aux agences&nbsp;:{' '}
          {ACADEMIA_API_AGENCES_OUVERTES === 'toutes'
            ? 'toutes, sauf celle des tests automatiques'
            : budgets
                .filter(({ agencyId }) =>
                  (ACADEMIA_API_AGENCES_OUVERTES as readonly string[]).includes(agencyId),
                )
                .map(({ agencyName }) => agencyName)
                .join(', ') || 'aucune'}{' '}
          · la démo par sa clé d’essai.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className={sectionTitle}>Budget de recherche par agence</h2>
          <p className={hintText}>
            Ce que chaque agence a dépensé ce mois-ci en recherches Stream Estate, et ses plafonds
            mensuels&nbsp;: la recherche, la veille des acquéreurs (prise dans celui de la
            recherche, la moitié au plus) et la lecture par l’IA. À 0 €, c’est coupé. Ni le
            conseiller ni le manager ne voient ces montants.
          </p>
        </div>
        <ul className="flex flex-col gap-3">
          {budgets.map((agency) => {
            const { agencyId, agencyName, budget, isDemo, watchCapCents } = agency;
            return (
              <li
                key={agencyId}
                className={`${card} flex flex-wrap items-center justify-between gap-3 p-4`}
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-title font-semibold break-words text-zinc-900 stage:text-white">
                    {agencyName}
                    {isDemo ? (
                      <span className={`${badgeNeutral} ml-2 align-middle`}>Démonstration</span>
                    ) : null}
                  </span>
                  <span className="text-sm text-zinc-600 stage:text-white/65">
                    Ce mois-ci&nbsp;: {budgetUsageLabel(budget)}
                    {budget.reached ? ` · ${OPERATOR_BUDGET_REACHED}` : ''}
                    {budget.warning ? ` · ${budgetWarningLabel(budget)}` : ''}
                  </span>
                  {/* Lancement, mission 5 — la veille des acquéreurs : ce qu'elle a dépensé ce mois-ci,
                    le plafond qui s'applique et son état. Le manager ne voit plus ces montants. */}
                  <span
                    className="text-sm text-zinc-600 stage:text-white/65"
                    data-testid="watch-budget"
                  >
                    Veille ce mois-ci&nbsp;:{' '}
                    {budgetUsageLabel({
                      spentCents: agency.watchSpentCents,
                      capCents: agency.watchEffectiveCapCents,
                    })}{' '}
                    · {WATCH_OPERATOR_STATE[agency.watchState]}
                  </span>
                  {/* Mission 151 — la lecture par l'IA : ce qui a été dépensé ce mois-ci et le plafond.
                    Une lecture en échec le dit, jamais « rien dépensé » (M98). */}
                  <span
                    className="text-sm text-zinc-600 stage:text-white/65"
                    data-testid="ai-budget"
                  >
                    {!aiBudgets
                      ? 'Lecture par l’IA\u00a0: le budget n’a pas pu être lu.'
                      : aiBudgetOpen(aiBudgetOf(aiBudgets, agencyId), isDemo)
                        ? `Lecture par l’IA ce mois-ci\u00a0: ${formatEuro(aiBudgetOf(aiBudgets, agencyId).spentCents / 100)} sur ${formatEuro(aiBudgetOf(aiBudgets, agencyId).capCents / 100)}`
                        : 'Lecture par l’IA\u00a0: fermée — posez un plafond pour l’ouvrir.'}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <AgencyCapForm
                    label="Recherche"
                    agencyName={agencyName}
                    initialEuros={budget.capCents / 100}
                    saveAction={setAgencySearchCap.bind(null, agencyId)}
                  />
                  {/* Lancement, mission 5 — le plafond de la veille des acquéreurs se règle ici,
                    plus par le manager : une part du plafond de recherche, la moitié au plus ;
                    0 € la coupe. */}
                  <AgencyCapForm
                    label="Veille"
                    agencyName={`${agencyName}, veille des acquéreurs`}
                    initialEuros={watchCapCents / 100}
                    saveAction={setAgencyWatchCap.bind(null, agencyId)}
                  />
                  {aiBudgets ? (
                    <AgencyCapForm
                      label="IA"
                      agencyName={`${agencyName}, lecture par l’IA`}
                      initialEuros={
                        aiBudgetOf(aiBudgets, agencyId).posed
                          ? aiBudgetOf(aiBudgets, agencyId).capCents / 100
                          : 0
                      }
                      saveAction={setAgencyAiCap.bind(null, agencyId)}
                    />
                  ) : null}
                  {/* Mission 114 — le repère de l'agence de démonstration, réservé aux opérateurs. */}
                  <AgencyDemoToggle
                    agencyName={agencyName}
                    initialIsDemo={isDemo}
                    saveAction={setAgencyDemo.bind(null, agencyId)}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

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
  BUDGET_REACHED_LABEL,
  budgetUsageLabel,
  budgetWarningLabel,
} from '@/features/search-budget/services/budget';
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
          confondues, regroupées par message. Les messages sont nettoyés : ni saisie, ni prix, ni
          adresse.
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
            Seules les {report.total} erreurs les plus récentes sont comptées : il y en a davantage.
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
                  <dt className="font-medium">Dernière fois :</dt>
                  <dd>{formatRelativeMoment(group.lastAt)}</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt className="font-medium">Page :</dt>
                  <dd className="break-all">{group.lastPage}</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt className="font-medium">Agences touchées :</dt>
                  <dd>
                    {[
                      ...group.agencies,
                      ...(group.unknownAgency ? ['sans agence connue'] : []),
                    ].join(' · ')}
                  </dd>
                </div>
                <div className="flex gap-1.5">
                  <dt className="font-medium">Origine :</dt>
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
            Sur {ERRORS_WINDOW_DAYS} jours : les annonces retenues dont la page n’a pas pu être lue
            après trois essais, face à celles importées depuis leur page. Aucune adresse d’annonce
            n’est gardée. Le concurrent est alors créé depuis les données de la recherche.
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
              {line.label} :{' '}
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
          Ouvert aux agences :{' '}
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
            Ce que chaque agence a dépensé ce mois-ci en recherches Stream Estate, et son plafond
            mensuel. À 0 €, la recherche est coupée.
          </p>
        </div>
        <ul className="flex flex-col gap-3">
          {budgets.map(({ agencyId, agencyName, budget, isDemo }) => (
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
                  Ce mois-ci : {budgetUsageLabel(budget)}
                  {budget.reached ? ` · ${BUDGET_REACHED_LABEL}` : ''}
                  {budget.warning ? ` · ${budgetWarningLabel(budget)}` : ''}
                </span>
                {/* Mission 151 — la lecture par l'IA : ce qui a été dépensé ce mois-ci et le plafond.
                    Une lecture en échec le dit, jamais « rien dépensé » (M98). */}
                <span className="text-sm text-zinc-600 stage:text-white/65" data-testid="ai-budget">
                  {!aiBudgets
                    ? 'Lecture par l’IA : le budget n’a pas pu être lu.'
                    : aiBudgetOpen(aiBudgetOf(aiBudgets, agencyId), isDemo)
                      ? `Lecture par l’IA ce mois-ci : ${formatEuro(aiBudgetOf(aiBudgets, agencyId).spentCents / 100)} sur ${formatEuro(aiBudgetOf(aiBudgets, agencyId).capCents / 100)}`
                      : 'Lecture par l’IA : fermée — posez un plafond pour l’ouvrir.'}
                </span>
              </div>
              <div className="flex flex-col items-end gap-2">
                <AgencyCapForm
                  agencyName={agencyName}
                  initialEuros={budget.capCents / 100}
                  saveAction={setAgencySearchCap.bind(null, agencyId)}
                />
                {aiBudgets ? (
                  <AgencyCapForm
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
          ))}
        </ul>
      </div>
    </div>
  );
}

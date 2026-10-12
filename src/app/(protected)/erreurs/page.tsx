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
import { setAgencySearchCap } from '@/features/operations/actions/set-agency-search-cap';
import { AgencyCapForm } from '@/features/operations/components/agency-cap-form';
import { getAgencyBudgets } from '@/features/operations/queries/get-agency-budgets';
import { getErrorReport } from '@/features/operations/queries/get-error-report';
import { ERRORS_WINDOW_DAYS, errorSourceLabel } from '@/features/operations/services/group-errors';
import { requireOperator } from '@/features/operations/services/require-operator';
import {
  BUDGET_REACHED_LABEL,
  budgetUsageLabel,
  budgetWarningLabel,
} from '@/features/search-budget/services/budget';
import { formatDateTime } from '@/lib/format';

// Mission 100 — la page « Erreurs », réservée aux comptes de ACM_OPERATOR_EMAILS, écran ET
// adresse : pour tout autre compte (conseiller, manager), elle n'existe pas (404). Le garde
// précède TOUTE lecture : les deux requêtes passent par la clé service et traversent les agences.
export default async function ErrorsPage() {
  const guard = await requireOperator();
  if (!guard.ok) {
    notFound();
  }

  const [report, budgets] = await Promise.all([getErrorReport(), getAgencyBudgets()]);

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
                  <dd>{formatDateTime(group.lastAt)}</dd>
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

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className={sectionTitle}>Budget de recherche par agence</h2>
          <p className={hintText}>
            Ce que chaque agence a dépensé ce mois-ci en recherches Stream Estate, et son plafond
            mensuel. À 0 €, la recherche est coupée.
          </p>
        </div>
        <ul className="flex flex-col gap-3">
          {budgets.map(({ agencyId, agencyName, budget }) => (
            <li
              key={agencyId}
              className={`${card} flex flex-wrap items-center justify-between gap-3 p-4`}
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="font-title font-semibold break-words text-zinc-900 stage:text-white">
                  {agencyName}
                </span>
                <span className="text-sm text-zinc-600 stage:text-white/65">
                  Ce mois-ci : {budgetUsageLabel(budget)}
                  {budget.reached ? ` · ${BUDGET_REACHED_LABEL}` : ''}
                  {budget.warning ? ` · ${budgetWarningLabel(budget)}` : ''}
                </span>
              </div>
              <AgencyCapForm
                agencyName={agencyName}
                initialEuros={budget.capCents / 100}
                saveAction={setAgencySearchCap.bind(null, agencyId)}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

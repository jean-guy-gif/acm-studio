import Link from 'next/link';

import { card, kickerLabel, pageSubtitle, pageTitle } from '@/components/ui/styles';
import { getUnknownCommuneOppositions } from '@/features/prospecting/queries/get-unknown-commune-oppositions';
import { UnknownCommuneAlerts } from '@/features/prospecting/components/unknown-commune-alerts';
import { getSearchBudget } from '@/features/search-budget/queries/get-search-budget';
import {
  BUDGET_REACHED_HINT,
  BUDGET_REACHED_LABEL,
  budgetUsageLabel,
  budgetWarningLabel,
} from '@/features/search-budget/services/budget';
import { isManagerRole } from '@/features/team/services/role';
import { getProfile } from '@/lib/auth/get-profile';

export default async function AdminPage() {
  // Mission 59 — le lien vers la vue manager n'apparaît qu'aux managers (la page elle-même
  // reste gardée par rôle, écran ET adresse). Un conseiller ne le voit pas.
  const profile = await getProfile();
  const isManager = isManagerRole(profile?.role);
  // Mission 100 — la consommation Stream Estate du mois, pour le manager : il la voit, il ne
  // règle pas le plafond (ce n'est pas un réglage d'agence).
  const budgetRead = profile && isManager ? await getSearchBudget(profile.agency_id) : null;
  // Mission 105 — les oppositions dont la commune est restée inconnue après la revérification.
  const unknownCommunes =
    profile && isManager ? await getUnknownCommuneOppositions(profile.agency_id) : [];

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-1.5">
        <span className={kickerLabel}>Agence</span>
        <h1 className={pageTitle}>Administration</h1>
        <p className={pageSubtitle}>Gestion de l&apos;agence et des utilisateurs.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {isManager ? (
          <Link
            href="/admin/equipe"
            className={`${card} group flex items-start gap-4 p-5 transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-lg hover:shadow-brand/10 stage:hover:border-brand stage:hover:shadow-none`}
          >
            <span className="font-title text-3xl leading-none font-bold text-brand/35 transition-colors group-hover:text-brand stage:text-brand/40">
              ◷
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="font-title text-lg leading-snug font-semibold text-zinc-900 stage:text-white">
                L’équipe
              </span>
              <span className="text-sm text-zinc-500 stage:text-white/55">
                L’activité de l’agence : où en est chacun, ce qui dort, les mandats signés.
              </span>
            </span>
          </Link>
        ) : null}
        <Link
          href="/admin/identite"
          className={`${card} group flex items-start gap-4 p-5 transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-lg hover:shadow-brand/10 stage:hover:border-brand stage:hover:shadow-none`}
        >
          <span className="font-title text-3xl leading-none font-bold text-brand/35 transition-colors group-hover:text-brand stage:text-brand/40">
            ✦
          </span>
          <span className="flex min-w-0 flex-col gap-1">
            <span className="font-title text-lg leading-snug font-semibold text-zinc-900 stage:text-white">
              Identité de l’agence
            </span>
            <span className="text-sm text-zinc-500 stage:text-white/55">
              Logo et couleur de marque, appliqués à tout l’outil.
            </span>
          </span>
        </Link>
      </div>

      {/* Mission 107 — chaque alerte avec l'adresse, l'auteur et la date ; elle se corrige. */}
      {unknownCommunes.length > 0 ? <UnknownCommuneAlerts alerts={unknownCommunes} /> : null}

      {budgetRead ? (
        <div className={`${card} flex flex-col gap-1.5 p-5`}>
          <span className={kickerLabel}>Recherche de concurrents · ce mois-ci</span>
          {budgetRead.ok ? (
            <>
              <p className="font-title text-lg font-semibold text-zinc-900 stage:text-white">
                {budgetUsageLabel(budgetRead.budget)}
              </p>
              {budgetRead.budget.reached ? (
                <p role="status" className="text-sm font-medium text-red-600 stage:text-red-300">
                  {BUDGET_REACHED_LABEL}. {BUDGET_REACHED_HINT}
                </p>
              ) : null}
              {budgetRead.budget.warning ? (
                <p
                  role="status"
                  className="text-sm font-medium text-amber-700 stage:text-amber-300"
                >
                  {budgetWarningLabel(budgetRead.budget)}
                </p>
              ) : null}
              <p className="text-sm text-zinc-500 stage:text-white/55">
                Ce que les recherches « Chercher les concurrents » ont coûté ce mois-ci, sur le
                plafond mensuel de l’agence. Le compteur repart à zéro le 1er du mois.
              </p>
            </>
          ) : (
            <p className="text-sm text-zinc-500 stage:text-white/55">
              La consommation du mois n’a pas pu être lue. Rechargez la page.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

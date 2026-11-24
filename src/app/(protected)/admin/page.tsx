import Link from 'next/link';

import { card, kickerLabel, pageSubtitle, pageTitle } from '@/components/ui/styles';
import { getUnknownCommuneOppositions } from '@/features/prospecting/queries/get-unknown-commune-oppositions';
import { UnknownCommuneAlerts } from '@/features/prospecting/components/unknown-commune-alerts';
import { getSearchBudget } from '@/features/search-budget/queries/get-search-budget';
import {
  aiBudgetOpen,
  aiBudgetUsage,
  getAgencyAiBudget,
} from '@/features/ai-budget/queries/get-ai-budgets';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';
import { BUDGET_REACHED_HINT, forfaitUsageLabel } from '@/features/search-budget/services/budget';
import { isManagerRole } from '@/features/team/services/role';
import { getProfile } from '@/lib/auth/get-profile';
import { BuyerWatchAdmin } from '@/features/buyer-watch/components/buyer-watch-admin';
import { getWatchAdmin } from '@/features/buyer-watch/queries/get-watch';

export default async function AdminPage() {
  // Mission 59 — le lien vers la vue manager n'apparaît qu'aux managers (la page elle-même
  // reste gardée par rôle, écran ET adresse). Un conseiller ne le voit pas.
  const profile = await getProfile();
  const isManager = isManagerRole(profile?.role);
  // Mission 100 — la consommation de recherche du mois, pour le manager : il la voit, il ne
  // règle pas le plafond (ce n'est pas un réglage d'agence). Lancement, mission 5 — en part du
  // forfait, jamais en euros : les montants restent pour l'opérateur seul.
  const budgetRead = profile && isManager ? await getSearchBudget(profile.agency_id) : null;
  // Mission 151 — la lecture par l'IA : le manager la lit, l'opérateur règle le plafond (M55).
  const aiBudget = profile && isManager ? await getAgencyAiBudget(profile.agency_id) : undefined;
  const aiOpen = aiBudget != null && aiBudgetOpen(aiBudget, await isDemoAgency(profile?.agency_id));
  // Mission 105 — les oppositions dont la commune est restée inconnue après la revérification.
  const unknownCommunes =
    profile && isManager ? await getUnknownCommuneOppositions(profile.agency_id) : [];
  // Mission 136 — la veille des acquéreurs : son plafond, son état, ses passages.
  const watch = profile && isManager ? await getWatchAdmin(profile.agency_id) : null;

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

      {aiBudget !== undefined ? (
        <div className={`${card} flex flex-col gap-1.5 p-5`} data-testid="admin-ai-budget">
          <span className={kickerLabel}>Lecture par l’IA · ce mois-ci</span>
          <p className="font-title text-lg font-semibold text-zinc-900 stage:text-white">
            {!aiBudget
              ? 'Le forfait n’a pas pu être lu : rechargez la page.'
              : aiOpen
                ? forfaitUsageLabel(aiBudgetUsage(aiBudget))
                : 'Pas encore ouverte pour votre agence : l’équipe ACM Studio l’ouvre à votre demande.'}
          </p>
        </div>
      ) : null}

      {budgetRead ? (
        <div className={`${card} flex flex-col gap-1.5 p-5`}>
          <span className={kickerLabel}>Recherche de concurrents · ce mois-ci</span>
          {budgetRead.ok ? (
            <>
              <p
                className={
                  budgetRead.budget.reached
                    ? 'font-title text-lg font-semibold text-red-600 stage:text-red-300'
                    : budgetRead.budget.warning
                      ? 'font-title text-lg font-semibold text-amber-700 stage:text-amber-300'
                      : 'font-title text-lg font-semibold text-zinc-900 stage:text-white'
                }
                data-testid="admin-search-forfait"
              >
                {forfaitUsageLabel(budgetRead.budget)}
              </p>
              {budgetRead.budget.reached ? (
                <p role="status" className="text-sm font-medium text-red-600 stage:text-red-300">
                  Contactez l’équipe ACM Studio pour le relever. {BUDGET_REACHED_HINT}
                </p>
              ) : null}
              <p className="text-sm text-zinc-500 stage:text-white/55">
                Les recherches « Chercher les concurrents » de l’agence ce mois-ci, sur son forfait.
                Le compteur repart à zéro le 1er du mois.
              </p>
            </>
          ) : (
            <p className="text-sm text-zinc-500 stage:text-white/55">
              La consommation du mois n’a pas pu être lue. Rechargez la page.
            </p>
          )}
        </div>
      ) : null}

      {/* Lancement, mission 5 — seuls l'état et le journal partent vers le navigateur du manager :
          aucun montant (une garde de donnée, pas de rendu, M51). */}
      {watch ? <BuyerWatchAdmin watch={{ state: watch.state, journal: watch.journal }} /> : null}
      {profile && isManager && watch == null ? (
        <p className="text-sm text-zinc-500 stage:text-white/55">
          La veille des acquéreurs n’a pas pu être lue. Rechargez la page.
        </p>
      ) : null}
    </div>
  );
}

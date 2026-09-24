import Link from 'next/link';

import { card, kickerLabel, pageSubtitle, pageTitle } from '@/components/ui/styles';
import { isManagerRole } from '@/features/team/services/role';
import { getProfile } from '@/lib/auth/get-profile';

export default async function AdminPage() {
  // Mission 59 — le lien vers la vue manager n'apparaît qu'aux managers (la page elle-même
  // reste gardée par rôle, écran ET adresse). Un conseiller ne le voit pas.
  const profile = await getProfile();
  const isManager = isManagerRole(profile?.role);

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
    </div>
  );
}

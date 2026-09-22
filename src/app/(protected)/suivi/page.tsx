import { emptyState, kickerLabel, pageSubtitle, pageTitle } from '@/components/ui/styles';
import { SuiviCard } from '@/features/meeting-conclusion/components/suivi-card';
import { getSuiviDossiers } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';

// Mission 53 §4 — Suivi : la troisième section du parcours (Préparation → Live → Suivi).
// Les dossiers conclus (status 'meeting_completed'), signé ou à relancer.
export default async function SuiviPage() {
  const dossiers = await getSuiviDossiers();

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-1.5">
        <span className={kickerLabel}>Après le rendez-vous</span>
        <h1 className={pageTitle}>Suivi</h1>
        <p className={pageSubtitle}>Les dossiers conclus — mandat signé, ou à relancer.</p>
      </div>

      {dossiers.length === 0 ? (
        <div className={emptyState}>
          <p className="font-title text-lg font-semibold text-zinc-700 stage:text-white/85">
            Aucun dossier conclu pour le moment.
          </p>
          <p className="mt-1 text-sm text-zinc-500 stage:text-white/60">
            Un dossier arrive ici une fois le rendez-vous conclu depuis le Live.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {dossiers.map((dossier) => (
            <SuiviCard key={dossier.project.id} dossier={dossier} />
          ))}
        </ul>
      )}
    </div>
  );
}

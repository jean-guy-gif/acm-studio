import { emptyState, kickerLabel, pageSubtitle, pageTitle } from '@/components/ui/styles';

export default function AdminPage() {
  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-1.5">
        <span className={kickerLabel}>Agence</span>
        <h1 className={pageTitle}>Administration</h1>
        <p className={pageSubtitle}>Gestion de l&apos;agence et des utilisateurs.</p>
      </div>

      <div className={emptyState}>
        <p className="font-title text-lg font-semibold text-zinc-700 stage:text-white/85">
          Bientôt disponible.
        </p>
        <p>
          La gestion des conseillers et des réglages de l&apos;agence arrivera dans une prochaine
          version.
        </p>
      </div>
    </div>
  );
}

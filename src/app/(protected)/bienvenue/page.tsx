import Link from 'next/link';

import { SubmitButton } from '@/components/submit-button';
import {
  alertError,
  btnPrimary,
  btnSecondary,
  card,
  kickerLabel,
  pageSubtitle,
  pageTitle,
  sectionTitle,
} from '@/components/ui/styles';
import { openExampleDossier } from '@/features/welcome/actions/open-example-dossier';
import { WelcomeChecklist } from '@/features/welcome/components/welcome-checklist';
import { WELCOME_STEPS } from '@/features/welcome/services/welcome';
import { getProfile } from '@/lib/auth/get-profile';

type WelcomePageProps = {
  searchParams: Promise<{ error?: string }>;
};

// Mission 97 — « Bienvenue » : ce qu'il faut, les quatre étapes, et un dossier d'exemple pour
// essayer. Le conseiller y arrive tant qu'il n'a aucun dossier, et y revient par « Aide ».
export default async function WelcomePage({ searchParams }: WelcomePageProps) {
  const { error } = await searchParams;
  const profile = await getProfile();

  return (
    <div className="flex max-w-3xl flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-1.5">
        <span className={kickerLabel}>Premiers pas</span>
        <h1 className={pageTitle}>
          Bienvenue{profile?.first_name ? `, ${profile.first_name}` : ''}
        </h1>
        <p className={pageSubtitle}>
          Vous préparez le rendez-vous, vous le menez face au vendeur, et il comprend son marché.
        </p>
      </div>

      {error ? (
        <p role="alert" className={alertError}>
          {error}
        </p>
      ) : null}

      <section className={`${card} flex flex-col gap-4 p-5 sm:p-6`}>
        <h2 className={sectionTitle}>Ce qu’il vous faut</h2>
        <WelcomeChecklist hasPhone={Boolean(profile?.phone?.trim())} />
      </section>

      <section className={`${card} flex flex-col gap-4 p-5 sm:p-6`}>
        <h2 className={sectionTitle}>Les 4 étapes</h2>
        <ol className="flex flex-col gap-3.5">
          {WELCOME_STEPS.map((step, index) => (
            <li key={step.title} className="flex items-start gap-3">
              <span className="font-title text-2xl leading-none font-bold text-brand/50 stage:text-brand/60">
                {index + 1}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium text-zinc-900 stage:text-white">{step.title}</span>
                <span className="text-sm text-zinc-500 stage:text-white/60">{step.line}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className={`${card} flex flex-col gap-4 p-5 sm:p-6`}>
        <h2 className={sectionTitle}>Essayer sans risque</h2>
        <p className="text-sm text-zinc-500 stage:text-white/60">
          Le dossier d’exemple contient un bien et des concurrents fictifs, prêts pour le Live. Il
          sert aussi à vous entraîner : il ne compte dans aucun chiffre de l’agence.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <form action={openExampleDossier}>
            <SubmitButton pendingLabel="Ouverture…" className={btnPrimary}>
              Ouvrir le dossier d’exemple
            </SubmitButton>
          </form>
          <Link href="/builder/new" className={btnSecondary}>
            Créer mon premier dossier
          </Link>
        </div>
      </section>
    </div>
  );
}

import Link from 'next/link';

import { SubmitButton } from '@/components/submit-button';
import {
  alertError,
  backLink,
  btnPrimary,
  card,
  fieldLabel,
  hintText,
  inputBase,
  kickerLabel,
  pageTitle,
} from '@/components/ui/styles';
import { createProject } from '@/features/projects/actions/create-project';

type NewProjectPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewProjectPage({ searchParams }: NewProjectPageProps) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-2">
        <Link href="/builder" className={backLink}>
          ← Retour aux dossiers
        </Link>
        <span className={kickerLabel}>Dossiers vendeurs</span>
        <h1 className={pageTitle}>Nouveau dossier vendeur</h1>
      </div>

      {error ? (
        <p role="alert" className={alertError}>
          {error}
        </p>
      ) : null}

      <form
        action={createProject}
        className={`${card} flex w-full max-w-xl flex-col gap-4 p-5 sm:p-6`}
      >
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Nom du vendeur</span>
          <input type="text" name="sellerName" required className={inputBase} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>E-mail (facultatif)</span>
          <input type="email" name="sellerEmail" className={inputBase} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Téléphone (facultatif)</span>
          <input type="tel" name="sellerPhone" className={inputBase} />
        </label>
        <p className={hintText}>
          Vous compléterez ensuite le bien vendeur, puis ses concurrents directs.
        </p>
        <SubmitButton pendingLabel="Création…" className={`${btnPrimary} self-start`}>
          Créer le dossier
        </SubmitButton>
      </form>
    </div>
  );
}

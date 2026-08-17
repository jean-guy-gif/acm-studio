import { SubmitButton } from '@/components/submit-button';
import { createProject } from '@/features/projects/actions/create-project';

type NewProjectPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewProjectPage({ searchParams }: NewProjectPageProps) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Nouveau dossier vendeur</h1>
      {error ? <p role="alert">{error}</p> : null}
      <form action={createProject} className="flex max-w-md flex-col gap-3">
        <label className="flex flex-col gap-1">
          Nom du vendeur
          <input
            type="text"
            name="sellerName"
            required
            className="rounded-md border border-zinc-300 px-3 py-1.5 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1">
          E-mail
          <input
            type="email"
            name="sellerEmail"
            className="rounded-md border border-zinc-300 px-3 py-1.5 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1">
          Téléphone
          <input
            type="tel"
            name="sellerPhone"
            className="rounded-md border border-zinc-300 px-3 py-1.5 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <SubmitButton pendingLabel="Création…">Créer le dossier</SubmitButton>
      </form>
    </div>
  );
}

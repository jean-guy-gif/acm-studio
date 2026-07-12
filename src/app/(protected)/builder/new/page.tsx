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
          <input type="text" name="sellerName" required className="rounded border px-2 py-1" />
        </label>
        <label className="flex flex-col gap-1">
          Email
          <input type="email" name="sellerEmail" className="rounded border px-2 py-1" />
        </label>
        <label className="flex flex-col gap-1">
          Téléphone
          <input type="tel" name="sellerPhone" className="rounded border px-2 py-1" />
        </label>
        <button
          type="submit"
          className="rounded border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Créer le dossier
        </button>
      </form>
    </div>
  );
}

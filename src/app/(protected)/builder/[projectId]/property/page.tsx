import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/queries/get-project';
import { saveSubjectProperty } from '@/features/subject-property/actions/save-subject-property';
import { getSubjectProperty } from '@/features/subject-property/queries/get-subject-property';
import { arrayToTextarea } from '@/features/subject-property/utils/textarea-array';

type PropertyPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function PropertyPage({ params, searchParams }: PropertyPageProps) {
  const { projectId } = await params;

  const project = await getProject(projectId);
  if (!project) {
    notFound();
  }

  const property = await getSubjectProperty(projectId);
  const { error } = await searchParams;
  const save = saveSubjectProperty.bind(null, projectId);

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/builder/${projectId}`} className="underline">
        Retour au dossier
      </Link>
      <h1 className="text-2xl font-semibold">Bien vendeur</h1>
      {error ? <p role="alert">{error}</p> : null}

      <form action={save} className="flex max-w-xl flex-col gap-3">
        <label className="flex flex-col gap-1">
          Type de bien
          <input
            type="text"
            name="property_type"
            defaultValue={property?.property_type ?? ''}
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          Surface
          <input
            type="number"
            name="surface_area"
            min={0}
            step="any"
            defaultValue={property?.surface_area ?? ''}
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          Terrain
          <input
            type="number"
            name="land_area"
            min={0}
            step="any"
            defaultValue={property?.land_area ?? ''}
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          Pièces
          <input
            type="number"
            name="rooms_count"
            min={0}
            step={1}
            defaultValue={property?.rooms_count ?? ''}
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          Chambres
          <input
            type="number"
            name="bedrooms_count"
            min={0}
            step={1}
            defaultValue={property?.bedrooms_count ?? ''}
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          Salles de bains
          <input
            type="number"
            name="bathrooms_count"
            min={0}
            step={1}
            defaultValue={property?.bathrooms_count ?? ''}
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          Classe DPE
          <input
            type="text"
            name="energy_rating"
            defaultValue={property?.energy_rating ?? ''}
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          Adresse
          <input
            type="text"
            name="address"
            defaultValue={property?.address ?? ''}
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          Code postal
          <input
            type="text"
            name="postal_code"
            defaultValue={property?.postal_code ?? ''}
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          Ville
          <input
            type="text"
            name="city"
            defaultValue={property?.city ?? ''}
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          Description
          <textarea
            name="description"
            rows={4}
            defaultValue={property?.description ?? ''}
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          Points forts
          <textarea
            name="strengths"
            rows={4}
            defaultValue={arrayToTextarea(property?.strengths)}
            className="rounded border px-2 py-1"
          />
          <span className="text-xs text-zinc-500">Un élément par ligne.</span>
        </label>
        <label className="flex flex-col gap-1">
          Points faibles
          <textarea
            name="weaknesses"
            rows={4}
            defaultValue={arrayToTextarea(property?.weaknesses)}
            className="rounded border px-2 py-1"
          />
          <span className="text-xs text-zinc-500">Un élément par ligne.</span>
        </label>
        <button
          type="submit"
          className="rounded border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Enregistrer
        </button>
      </form>
    </div>
  );
}

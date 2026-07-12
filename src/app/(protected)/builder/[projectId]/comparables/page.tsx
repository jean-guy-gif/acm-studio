import Link from 'next/link';
import { notFound } from 'next/navigation';

import { deleteComparable } from '@/features/comparables/actions/delete-comparable';
import { moveComparable } from '@/features/comparables/actions/move-comparable';
import { toggleComparableSelection } from '@/features/comparables/actions/toggle-comparable-selection';
import { getComparables } from '@/features/comparables/queries/get-comparables';
import { getProject } from '@/features/projects/queries/get-project';

type ComparablesPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function ComparablesPage({ params, searchParams }: ComparablesPageProps) {
  const { projectId } = await params;

  const project = await getProject(projectId);
  if (!project) {
    notFound();
  }

  const comparables = await getComparables(projectId);
  const { error } = await searchParams;
  const buttonClass =
    'rounded border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href={`/builder/${projectId}`} className="underline">
            Retour au dossier
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">Biens concurrents</h1>
        </div>
        <Link
          href={`/builder/${projectId}/comparables/new`}
          className="rounded border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Ajouter un bien concurrent
        </Link>
      </div>

      {error ? <p role="alert">{error}</p> : null}

      {comparables.length === 0 ? (
        <div className="flex flex-col gap-1 text-zinc-500">
          <p>Aucun bien concurrent.</p>
          <p>Ajoutez les biens actuellement en concurrence avec le bien du vendeur.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {comparables.map((comparable, index) => {
            const pricePerSqm =
              comparable.price > 0 && comparable.surface_area && comparable.surface_area > 0
                ? Math.round(comparable.price / comparable.surface_area)
                : null;

            return (
              <li
                key={comparable.id}
                className="flex flex-col gap-2 rounded border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium">{comparable.title || 'Bien concurrent'}</span>
                  <span className="text-sm text-zinc-500">
                    {comparable.is_selected ? 'Retenu' : 'Exclu'}
                  </span>
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  <span>Prix : {comparable.price.toLocaleString('fr-FR')} €</span>
                  {' · '}
                  <span>Surface : {comparable.surface_area ?? '—'}</span>
                  {' · '}
                  <span>
                    Prix/m² : {pricePerSqm ? `${pricePerSqm.toLocaleString('fr-FR')} €` : '—'}
                  </span>
                  {' · '}
                  <span>Délai : {comparable.days_on_market ?? '—'}</span>
                  {' · '}
                  <span>
                    Baisse :{' '}
                    {(comparable.price_drop_amount ?? comparable.price_drop_percentage)
                      ? `${comparable.price_drop_amount ?? '—'} € / ${
                          comparable.price_drop_percentage ?? '—'
                        } %`
                      : '—'}
                  </span>
                </div>
                {comparable.advisor_notes ? (
                  <p className="text-sm text-zinc-500">Notes : {comparable.advisor_notes}</p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/builder/${projectId}/comparables/${comparable.id}/edit`}
                    className={buttonClass}
                  >
                    Modifier
                  </Link>
                  <form action={toggleComparableSelection.bind(null, projectId)}>
                    <input type="hidden" name="comparableId" value={comparable.id} />
                    <button type="submit" className={buttonClass}>
                      {comparable.is_selected ? 'Exclure' : 'Retenir'}
                    </button>
                  </form>
                  <form action={moveComparable.bind(null, projectId)}>
                    <input type="hidden" name="comparableId" value={comparable.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button type="submit" className={buttonClass} disabled={index === 0}>
                      Monter
                    </button>
                  </form>
                  <form action={moveComparable.bind(null, projectId)}>
                    <input type="hidden" name="comparableId" value={comparable.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      type="submit"
                      className={buttonClass}
                      disabled={index === comparables.length - 1}
                    >
                      Descendre
                    </button>
                  </form>
                  <form action={deleteComparable.bind(null, projectId)}>
                    <input type="hidden" name="comparableId" value={comparable.id} />
                    <button type="submit" className={buttonClass}>
                      Supprimer
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

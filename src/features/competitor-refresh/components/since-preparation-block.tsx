'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { btnSecondary, card, hintText, sectionTitle } from '@/components/ui/styles';
import { EXTENSION_RETRY_LABEL } from '@/features/browser-extension/install-url';
import { bulkRejectComparables } from '@/features/comparables/actions/bulk-comparable-actions';
import { finishListingsCheck } from '@/features/competitor-refresh/actions/refresh-competitor-price';
import { NO_EXTENSION_FOR_REFRESH } from '@/features/competitor-refresh/components/refresh-prices-button';
import { readCompetitorListings } from '@/features/competitor-refresh/services/read-competitor-listings';
import type {
  SincePreparation,
  SincePreparationChange,
} from '@/features/competitor-refresh/services/since-preparation';
import { useDemoMode } from '@/features/demo/components/demo-mode-provider';
import {
  formatEuro,
  formatPercent,
  formatRelativeDay,
  formatRelativeMoment,
  formatRelativeSince,
} from '@/lib/format';

export const CHECK_LISTINGS_LABEL = 'Vérifier les annonces';
export const STALE_CHECK_HINT =
  'Un prix a pu changer, une annonce a pu disparaître depuis. Vérifiez-les avant le rendez-vous.';

// Mission 152 (partie A, planche 4) — « Depuis la préparation », en tête d'« Avant le rendez-vous » :
// les annonces des concurrents retenus relues par l'extension, gratuitement (la relecture de la
// M105), et ce qui a changé. Un prix changé met à jour le concurrent ; l'ancien reste dans ses
// relevés datés (M47) et dans la copie de l'import. Une annonce retirée, sur preuve (M103), propose
// « Écarter » ; la ligne reste une information tant qu'elle est retenue (« La garder » attend une
// colonne, après la bêta : Jean-Guy, 11/11, `docs/IDEES.md`). En contour : « Lancer le Live » reste le seul plein (M146 A).
export function SincePreparationBlock({
  projectId,
  since,
}: {
  projectId: string;
  since: SincePreparation | null;
}) {
  const router = useRouter();
  const demo = useDemoMode();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [missingExtension, setMissingExtension] = useState(false);

  const run = async (force = false) => {
    setBusy(true);
    setMessage(null);
    setMissingExtension(false);
    try {
      const outcomes = await readCompetitorListings(projectId, {
        demo,
        force,
        onProgress: setProgress,
      });
      if (outcomes === 'no_extension') {
        setMessage(NO_EXTENSION_FOR_REFRESH);
        setMissingExtension(true);
        return;
      }
      // Rien de lu (extension sans accès, portails muets) : la vérification n'est pas datée, le
      // rappel reste.
      if (outcomes.length > 0 && outcomes.every((outcome) => outcome.status === 'unreadable')) {
        setMessage('Aucune annonce n’a pu être relue\u00a0: réessayez dans un instant.');
        return;
      }
      const done = await finishListingsCheck(projectId);
      if (!done.ok) setMessage('La vérification n’a pas pu être enregistrée\u00a0: réessayez.');
      router.refresh();
    } catch {
      setMessage('La vérification s’est interrompue\u00a0: réessayez.');
    } finally {
      setProgress(null);
      setBusy(false);
    }
  };

  if (since == null) {
    return (
      <section className={`${card} flex flex-col gap-2 p-5`} data-testid="since-preparation">
        <h2 className={sectionTitle}>Depuis la préparation</h2>
        <p role="alert" className="text-sm font-semibold text-red-700">
          Les annonces des concurrents n’ont pas pu être relues pour l’instant&nbsp;: rechargez la
          page.
        </p>
      </section>
    );
  }
  if (since.withListing === 0) return null;

  const checked = since.checkedAt != null;
  const status = checked
    ? `${since.stale ? 'Annonces vérifiées' : 'Annonces revérifiées'} ${formatRelativeMoment(
        since.checkedAt as string,
      )} · ${since.read} sur ${since.withListing} lue${since.read > 1 ? 's' : ''}`
    : 'Annonces pas encore vérifiées depuis la préparation';
  const button = checked ? 'Vérifier à nouveau' : CHECK_LISTINGS_LABEL;

  return (
    <section
      className={`${card} flex flex-col gap-3 p-5 ${since.stale ? 'border-amber-300' : ''}`}
      data-testid="since-preparation"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className={sectionTitle}>Depuis la préparation</h2>
        <span className={hintText} data-testid="since-preparation-status">
          {status}
        </span>
      </div>

      {checked && since.changes.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {since.changes.map((change) => (
            <ChangeLine key={change.id} projectId={projectId} change={change} />
          ))}
        </ul>
      ) : null}
      {since.stale ? <p className="text-sm text-zinc-700">{STALE_CHECK_HINT}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={`${btnSecondary} whitespace-nowrap`}
          disabled={busy}
          onClick={() => void run()}
          data-testid="check-listings"
        >
          {busy ? (progress ?? 'Relecture des annonces…') : button}
        </button>
        <span className={hintText}>
          {[
            demo
              ? 'Ne compte pas dans le forfait'
              : 'Par l’extension ACM, sans compter dans le forfait',
            checked && since.unchanged > 0
              ? `${since.unchanged} annonce${since.unchanged > 1 ? 's' : ''} inchangée${since.unchanged > 1 ? 's' : ''}`
              : null,
            checked && since.unread > 0
              ? `${since.unread} illisible${since.unread > 1 ? 's' : ''}, inchangée${since.unread > 1 ? 's' : ''}`
              : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </div>
      {message ? (
        <p role="status" className="text-sm text-zinc-700">
          {message}
        </p>
      ) : null}
      {missingExtension ? (
        <button
          type="button"
          className={`${btnSecondary} self-start text-xs`}
          disabled={busy}
          onClick={() => void run(true)}
        >
          {EXTENSION_RETRY_LABEL}
        </button>
      ) : null}
    </section>
  );
}

function ChangeLine({ projectId, change }: { projectId: string; change: SincePreparationChange }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (change.kind === 'price') {
    const down = change.to < change.from;
    return (
      <li
        className="flex flex-col gap-1 rounded-xl border border-zinc-200 p-3"
        data-testid="since-preparation-price"
      >
        <span className="text-xs font-bold tracking-wide text-amber-700 uppercase">
          {down ? 'Prix baissé' : 'Prix monté'}
        </span>
        <b className="text-sm text-zinc-900">{change.label}</b>
        <span className="text-sm text-zinc-700">
          {formatEuro(change.from)} → <b>{formatEuro(change.to)}</b> (
          {change.percent > 0 ? '+' : ''}
          {formatPercent(change.percent)})
          {change.on ? `, constaté ${formatRelativeDay(change.on)}` : ''}
          {change.shownAtLive ? ` · au rendez-vous, le vendeur verra ${formatEuro(change.to)}` : ''}
        </span>
        <Link
          href={`/builder/${projectId}/comparables/${change.id}/edit`}
          className="self-start text-sm font-medium text-brand-deep underline-offset-2 hover:underline"
        >
          Voir la fiche
        </Link>
      </li>
    );
  }

  const reject = async () => {
    setBusy(true);
    setError(null);
    const result = await bulkRejectComparables(projectId, [change.id]);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <li
      className="flex flex-col gap-1 rounded-xl border border-red-200 bg-red-50/40 p-3"
      data-testid="since-preparation-gone"
    >
      <span className="text-xs font-bold tracking-wide text-red-700 uppercase">
        Annonce retirée
      </span>
      <b className="text-sm text-zinc-900">{change.label}</b>
      <span className="text-sm text-zinc-700">
        {change.on ? `plus en ligne ${formatRelativeSince(change.on)}` : 'plus en ligne'}
        {' · elle serait montrée comme un bien en vente'}
      </span>
      <button
        type="button"
        className={`${btnSecondary} self-start px-3 py-1.5 text-xs`}
        disabled={busy}
        onClick={() => void reject()}
      >
        Écarter
      </button>
      {error ? (
        <p role="alert" className="text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}
    </li>
  );
}

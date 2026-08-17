'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useState, useTransition } from 'react';

import type {
  CompetitorCandidate,
  CompetitorSearchResult,
  PortalSearchResult,
  SearchResultsHtmlImport,
} from '@/features/competitor-search/types';

const euro = (value: number | null): string =>
  value != null ? `${Math.round(value).toLocaleString('fr-FR')} €` : '—';

type Props = {
  projectId: string;
  criteriaLabel: string;
  searchAction: () => Promise<CompetitorSearchResult>;
  importResultsHtmlAction: (formData: FormData) => Promise<SearchResultsHtmlImport>;
};

function CandidateCard({
  candidate,
  projectId,
  onDiscard,
}: {
  candidate: CompetitorCandidate;
  projectId: string;
  onDiscard: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-card border border-zinc-200 p-3 dark:border-zinc-800">
      {candidate.photoUrl ? (
        <img
          src={candidate.photoUrl}
          alt={candidate.title ?? 'Bien concurrent'}
          referrerPolicy="no-referrer"
          loading="lazy"
          className="h-32 w-full rounded object-cover"
        />
      ) : (
        <div className="flex h-32 w-full items-center justify-center rounded border border-dashed border-zinc-300 text-xs text-zinc-500 dark:border-zinc-700">
          Photo indisponible
        </div>
      )}
      <div className="text-sm font-medium capitalize">{candidate.title ?? 'Annonce détectée'}</div>
      <div className="text-sm text-zinc-600 dark:text-zinc-300">
        {euro(candidate.price)}
        {candidate.surfaceArea != null ? ` · ${candidate.surfaceArea} m²` : ''}
        {candidate.roomsCount != null ? ` · ${candidate.roomsCount} pièces` : ''}
      </div>
      <div className="mt-auto flex flex-wrap gap-2 text-sm">
        <Link
          href={`/builder/${projectId}/comparables/new?importUrl=${encodeURIComponent(candidate.url)}`}
          className="rounded-md bg-brand px-3 py-1.5 font-medium text-white transition-colors hover:bg-brand-deep"
        >
          Retenir et importer
        </Link>
        <a
          href={candidate.url}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Voir l’annonce
        </a>
        <button
          type="button"
          onClick={onDiscard}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Écarter
        </button>
      </div>
    </div>
  );
}

function PortalBlock({
  portal,
  projectId,
  onPaste,
  pending,
}: {
  portal: PortalSearchResult;
  projectId: string;
  onPaste: (searchUrl: string, html: string) => void;
  pending: boolean;
}) {
  const [pasted, setPasted] = useState('');
  const [discarded, setDiscarded] = useState<Set<string>>(new Set());

  const visible = portal.candidates.filter((candidate) => !discarded.has(candidate.url));

  return (
    <section className="flex flex-col gap-3 rounded border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-medium">{portal.label}</h2>
        <a
          href={portal.searchUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="text-sm text-brand underline-offset-2 hover:underline"
        >
          Ouvrir la recherche {portal.label}
        </a>
      </div>

      {portal.status === 'ok' ? (
        <>
          <p className="text-sm text-zinc-500">
            {visible.length} annonce{visible.length > 1 ? 's' : ''} détectée
            {visible.length > 1 ? 's' : ''} — retenez ou écartez chaque suggestion.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((candidate) => (
              <CandidateCard
                key={candidate.url}
                candidate={candidate}
                projectId={projectId}
                onDiscard={() =>
                  setDiscarded((current) => {
                    const next = new Set(current);
                    next.add(candidate.url);
                    return next;
                  })
                }
              />
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-amber-700 dark:text-amber-400">{portal.message}</p>
          <textarea
            value={pasted}
            onChange={(event) => setPasted(event.target.value)}
            rows={4}
            placeholder="Collez ici le code de la page de résultats (Cmd/Ctrl+U → tout copier)…"
            className="rounded-md border border-zinc-300 px-3 py-1.5 font-mono text-xs outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="button"
            disabled={pending || pasted.trim() === ''}
            onClick={() => onPaste(portal.searchUrl, pasted)}
            className="self-start rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {pending ? 'Analyse…' : 'Analyser le code collé'}
          </button>
        </div>
      )}
    </section>
  );
}

export function CompetitorSearchPanel({
  projectId,
  criteriaLabel,
  searchAction,
  importResultsHtmlAction,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [portals, setPortals] = useState<PortalSearchResult[] | null>(null);

  function runSearch() {
    setError(null);
    startTransition(async () => {
      const result = await searchAction();
      if (result.ok) {
        setPortals(result.portals);
      } else {
        setError(result.error);
        setPortals(null);
      }
    });
  }

  function handlePaste(searchUrl: string, html: string) {
    setError(null);
    const formData = new FormData();
    formData.set('url', searchUrl);
    formData.set('html', html);
    startTransition(async () => {
      const result = await importResultsHtmlAction(formData);
      if (result.ok) {
        setPortals((current) =>
          (current ?? []).map((portal) =>
            portal.portal === result.portal.portal ? result.portal : portal,
          ),
        );
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={runSearch}
          disabled={pending}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-deep disabled:opacity-50"
        >
          {pending && portals == null ? 'Recherche en cours…' : 'Lancer la recherche'}
        </button>
        <p className="text-sm text-zinc-500">Critères : {criteriaLabel}</p>
      </div>
      <p className="text-xs text-zinc-500">
        La recherche interroge Green Acres, SeLoger, Bien’ici et Figaro Immobilier. Un portail qui
        refuse la lecture automatique reste accessible : ouvrez sa recherche, copiez le code de la
        page de résultats et collez-le. Chaque suggestion reste à retenir ou à écarter — rien n’est
        enregistré sans votre validation.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      {portals
        ? portals.map((portal) => (
            <PortalBlock
              key={portal.portal}
              portal={portal}
              projectId={projectId}
              onPaste={handlePaste}
              pending={pending}
            />
          ))
        : null}
    </div>
  );
}

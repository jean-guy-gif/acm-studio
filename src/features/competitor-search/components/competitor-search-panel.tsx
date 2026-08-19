'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import { RemoteImage } from '@/components/ui/remote-image';
import {
  alertError,
  btnPrimary,
  btnSecondary,
  card,
  formSectionTitle,
  hintText,
  inputBase,
  link as linkCls,
} from '@/components/ui/styles';

import type {
  EnrichCandidateResult,
  EnrichedCandidate,
} from '@/features/competitor-search/actions/enrich-candidate';
import {
  RankedCandidateCard,
  type DecisionPayload,
} from '@/features/competitor-search/components/ranked-candidate-card';
import type {
  CompetitorCandidate,
  CompetitorSearchResult,
  PortalSearchResult,
  RankedCandidate,
  RecordDecisionResult,
  SearchResultsHtmlImport,
} from '@/features/competitor-search/types';

const euro = (value: number | null): string =>
  value != null ? `${Math.round(value).toLocaleString('fr-FR')} €` : '—';

type Props = {
  projectId: string;
  criteriaLabel: string;
  searchAction: () => Promise<CompetitorSearchResult>;
  importResultsHtmlAction: (formData: FormData) => Promise<SearchResultsHtmlImport>;
  recordDecisionAction: (formData: FormData) => Promise<RecordDecisionResult>;
  enrichAction: (url: string) => Promise<EnrichCandidateResult>;
};

// Nombre de fiches complétées automatiquement après une recherche. Au-delà, le
// conseiller a déjà de quoi trancher, et chaque fiche coûte un appel au portail.
const ENRICHED_COUNT = 12;
// Quelques appels en parallèle : assez pour que l'écran se remplisse vite, assez
// peu pour rester un visiteur poli.
const ENRICH_CONCURRENCY = 3;

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
    <div
      className={`${card} group flex flex-col gap-2.5 overflow-hidden transition-colors hover:border-brand/60 stage:hover:border-brand/60`}
    >
      {candidate.photoUrl ? (
        <RemoteImage
          src={candidate.photoUrl}
          alt={candidate.title ?? 'Bien concurrent'}
          className="h-36 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          fallbackClassName="h-36 w-full"
        />
      ) : (
        <div className="flex h-36 w-full items-center justify-center bg-zinc-50 text-xs text-zinc-400 stage:bg-white/5 stage:text-white/40">
          Photo indisponible
        </div>
      )}
      <div className="flex flex-1 flex-col gap-1.5 px-3.5 pb-3.5">
        <div className="font-title text-base leading-snug font-semibold capitalize text-zinc-900 stage:text-white">
          {candidate.title ?? 'Annonce détectée'}
        </div>
        <div className="text-sm text-zinc-500 stage:text-white/60">
          <span className="font-semibold text-brand-deep stage:text-white">
            {euro(candidate.price)}
          </span>
          {candidate.surfaceArea != null ? ` · ${candidate.surfaceArea} m²` : ''}
          {candidate.roomsCount != null ? ` · ${candidate.roomsCount} pièces` : ''}
        </div>
        <div className="mt-auto flex flex-wrap gap-2 pt-2 text-sm">
          <Link
            href={`/builder/${projectId}/comparables/new?importUrl=${encodeURIComponent(candidate.url)}`}
            className={`${btnPrimary} px-3 py-1.5 text-xs`}
          >
            Retenir et importer
          </Link>
          <a
            href={candidate.url}
            target="_blank"
            rel="noreferrer noopener"
            className={`${btnSecondary} px-3 py-1.5 text-xs`}
          >
            Voir l’annonce
          </a>
          <button
            type="button"
            onClick={onDiscard}
            className={`${btnSecondary} px-3 py-1.5 text-xs`}
          >
            Écarter
          </button>
        </div>
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
    <section className={`${card} flex flex-col gap-3 p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={formSectionTitle}>{portal.label}</h2>
        <a
          href={portal.searchUrl}
          target="_blank"
          rel="noreferrer noopener"
          className={`${linkCls} text-sm hover:underline`}
        >
          Ouvrir la recherche {portal.label}
        </a>
      </div>

      {portal.status === 'ok' ? (
        <>
          <p className={hintText}>
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
          <p className="text-sm font-medium text-amber-700 stage:text-amber-300">
            {portal.message}
          </p>
          <textarea
            value={pasted}
            onChange={(event) => setPasted(event.target.value)}
            rows={4}
            placeholder="Collez ici le code de la page de résultats (Cmd/Ctrl+U → tout copier)…"
            className={`${inputBase} font-mono text-xs`}
          />
          <button
            type="button"
            disabled={pending || pasted.trim() === ''}
            onClick={() => onPaste(portal.searchUrl, pasted)}
            className={`${btnSecondary} self-start`}
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
  recordDecisionAction,
  enrichAction,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [portals, setPortals] = useState<PortalSearchResult[] | null>(null);
  const [ranked, setRanked] = useState<RankedCandidate[]>([]);
  const [learnedNotes, setLearnedNotes] = useState<string[]>([]);
  const [decided, setDecided] = useState<Record<string, 'accepted' | 'rejected'>>({});
  const [enriched, setEnriched] = useState<Record<string, EnrichedCandidate>>({});
  const [enriching, setEnriching] = useState(0);

  // Complète les premières fiches en tâche de fond : le conseiller voit les
  // photos et les caractéristiques arriver au lieu d'attendre devant un écran
  // figé. Une fiche qui échoue est simplement laissée en l'état.
  async function enrichTop(entries: RankedCandidate[]) {
    const queue = entries.slice(0, ENRICHED_COUNT).map((entry) => entry.candidate.url);
    setEnriching(queue.length);
    let index = 0;
    const worker = async () => {
      for (;;) {
        const current = index;
        index += 1;
        if (current >= queue.length) {
          return;
        }
        const result = await enrichAction(queue[current]);
        if (result.ok) {
          setEnriched((state) => ({ ...state, [result.data.url]: result.data }));
        }
        setEnriching((count) => Math.max(0, count - 1));
      }
    };
    await Promise.all(Array.from({ length: ENRICH_CONCURRENCY }, worker));
  }

  function runSearch() {
    setError(null);
    startTransition(async () => {
      const result = await searchAction();
      if (result.ok) {
        setPortals(result.portals);
        setRanked(result.ranked);
        setLearnedNotes(result.learnedNotes);
        setDecided({});
        setEnriched({});
        void enrichTop(result.ranked);
      } else {
        setError(result.error);
        setPortals(null);
        setRanked([]);
        setLearnedNotes([]);
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

  // « Oui, c'est un concurrent » / « Non, et voici pourquoi ». C'est cette trace
  // qui rend la recherche suivante meilleure.
  function handleDecision(entry: RankedCandidate, payload: DecisionPayload) {
    setDecided((current) => ({ ...current, [entry.candidate.url]: payload.decision }));
    const formData = new FormData();
    formData.set('listing_url', entry.candidate.url);
    formData.set('decision', payload.decision);
    if (payload.reason) {
      formData.set('reason', payload.reason);
    }
    formData.set('comment', payload.comment);
    if (entry.candidate.price != null) {
      formData.set('price', String(entry.candidate.price));
    }
    if (entry.candidate.surfaceArea != null) {
      formData.set('surface_area', String(entry.candidate.surfaceArea));
    }
    if (entry.candidate.roomsCount != null) {
      formData.set('rooms_count', String(entry.candidate.roomsCount));
    }
    startTransition(async () => {
      const result = await recordDecisionAction(formData);
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  const undecided = ranked.filter((entry) => decided[entry.candidate.url] == null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={runSearch} disabled={pending} className={btnPrimary}>
          {pending && portals == null ? 'Recherche en cours…' : 'Lancer la recherche'}
        </button>
        <p className={hintText}>Critères : {criteriaLabel}</p>
      </div>
      <p className="text-xs text-zinc-400 stage:text-white/40">
        La recherche interroge Green Acres, SeLoger, Bien’ici et Figaro Immobilier. Un portail qui
        refuse la lecture automatique reste accessible : ouvrez sa recherche, copiez le code de la
        page de résultats et collez-le. Chaque suggestion reste à retenir ou à écarter — rien n’est
        enregistré sans votre validation.
      </p>
      {error ? (
        <p role="alert" className={alertError}>
          {error}
        </p>
      ) : null}
      {learnedNotes.length > 0 ? (
        <div className={`${card} flex flex-col gap-1 p-3.5`}>
          <span className="font-title text-sm font-semibold text-zinc-800 stage:text-white">
            Ce que l’outil a retenu de vos choix
          </span>
          {learnedNotes.map((note) => (
            <p key={note} className={hintText}>
              {note}
            </p>
          ))}
        </div>
      ) : null}

      {undecided.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h3 className={formSectionTitle}>
            Concurrents proposés, du plus au moins ressemblant ({undecided.length})
          </h3>
          <p className={hintText}>
            Le pourcentage mesure la ressemblance avec le bien de votre client. Rien n’est masqué :
            une annonce éloignée descend dans la liste, elle ne disparaît pas.
          </p>
          {enriching > 0 ? (
            <p className={hintText}>
              Récupération des photos et des caractéristiques… ({enriching} fiche
              {enriching > 1 ? 's' : ''} restante{enriching > 1 ? 's' : ''})
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {undecided.map((entry) => (
              <RankedCandidateCard
                key={entry.candidate.url}
                ranked={entry}
                enriched={enriched[entry.candidate.url] ?? null}
                projectId={projectId}
                pending={pending}
                onDecision={(payload) => handleDecision(entry, payload)}
              />
            ))}
          </div>
        </section>
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

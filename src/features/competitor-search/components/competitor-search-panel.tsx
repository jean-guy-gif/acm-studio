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
  link as linkCls,
} from '@/components/ui/styles';

import type {
  EnrichCandidateResult,
  EnrichedCandidate,
} from '@/features/competitor-search/actions/enrich-candidate';
import type { ImportAndCreateResult } from '@/features/competitor-search/actions/import-and-create-competitor';
import type { PrepareSearchResult } from '@/features/competitor-search/actions/prepare-competitor-search';
import type { RankSearchResult } from '@/features/competitor-search/actions/rank-competitor-candidates';
import type { BatchDecision } from '@/features/competitor-search/actions/record-competitor-decisions';
import {
  closeSearchWindowViaExtension,
  openSearchWindowViaExtension,
  pingExtension,
} from '@/features/browser-extension/client';
import { ListingPasteZone } from '@/features/comparable-import/components/listing-paste-zone';
import {
  RankedCandidateCard,
  type DecisionPayload,
} from '@/features/competitor-search/components/ranked-candidate-card';
import {
  readPageViaExtension,
  type PortalRobotsCache,
} from '@/features/competitor-search/services/read-page-via-extension';
import { readPortalsSequentially } from '@/features/competitor-search/services/read-portals-sequentially';
import type { PortalSearchLink } from '@/features/competitor-search/services/build-portal-search-urls';
import type {
  CompetitorCandidate,
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
  // §10 : le serveur prépare (critères + adresses) et classe (avec l'apprentissage) ;
  // la LECTURE des quatre portails se fait par l'extension, dans le navigateur.
  prepareAction: () => Promise<PrepareSearchResult>;
  rankAction: (portals: PortalSearchResult[]) => Promise<RankSearchResult>;
  importResultsHtmlAction: (formData: FormData) => Promise<SearchResultsHtmlImport>;
  recordDecisionAction: (formData: FormData) => Promise<RecordDecisionResult>;
  // §8 — import d'un concurrent depuis le HTML lu par l'extension, et écriture des
  // décisions du lot (retenues + écartées) en un appel.
  importAction: (url: string, html: string) => Promise<ImportAndCreateResult>;
  recordDecisionsAction: (decisions: BatchDecision[]) => Promise<RecordDecisionResult>;
  enrichAction: (url: string) => Promise<EnrichCandidateResult>;
};

// Nombre de fiches complétées automatiquement après une recherche. Au-delà, le
// conseiller a déjà de quoi trancher, et chaque fiche coûte un appel au portail.
const ENRICHED_COUNT = 12;
// Seuil de ressemblance : au-dessus, on affiche ; en dessous, on plie derrière
// « Voir les N autres, moins ressemblants ». On ne masque rien (mission 36) — un
// clic révèle tout —, on coupe seulement une liste trop longue à trancher.
const SIMILARITY_THRESHOLD = 60;
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
  onRetry,
  pending,
}: {
  portal: PortalSearchResult;
  projectId: string;
  onPaste: (searchUrl: string, html: string) => void;
  onRetry: (portal: PortalSearchResult['portal']) => void;
  pending: boolean;
}) {
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
          {/* §10 : un échec « injoignable » est PASSAGER — on propose de relancer ce
              portail. Un « refused » (robots.txt) est PERMANENT — jamais de bouton
              « réessayer », seulement le collage. « empty » (coquille ou zéro carte)
              propose aussi le collage, sans relance. */}
          {portal.status === 'unreachable' ? (
            <button
              type="button"
              onClick={() => onRetry(portal.portal)}
              disabled={pending}
              className={`${btnSecondary} self-start px-3 py-1.5 text-xs`}
            >
              Relancer {portal.label}
            </button>
          ) : null}
          {/* Recette du 19/08 : cet écran demandait encore « Cmd/Ctrl+U → code
              source », alors que l'écran d'ajout d'un concurrent avait déjà
              basculé sur le geste simple. Deux écrans du même outil ne peuvent
              pas exiger deux gestes différents — surtout pas celui-là. */}
          <ListingPasteZone
            onPaste={({ html, text }) =>
              onPaste(portal.searchUrl, html.trim() !== '' ? html : text)
            }
            disabled={pending}
          />
        </div>
      )}
    </section>
  );
}

export function CompetitorSearchPanel({
  projectId,
  criteriaLabel,
  prepareAction,
  rankAction,
  importResultsHtmlAction,
  recordDecisionAction,
  importAction,
  recordDecisionsAction,
  enrichAction,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // La recherche automatique demande l'extension ; absente, on ne dégrade PAS en
  // quatre collages (§10) — on le dit et on propose l'ajout manuel par adresse.
  const [extensionMissing, setExtensionMissing] = useState(false);
  const [portals, setPortals] = useState<PortalSearchResult[] | null>(null);
  const [searchLinks, setSearchLinks] = useState<PortalSearchLink[]>([]);
  const [ranked, setRanked] = useState<RankedCandidate[]>([]);
  const [learnedNotes, setLearnedNotes] = useState<string[]>([]);
  const [decided, setDecided] = useState<Record<string, 'accepted' | 'rejected'>>({});
  const [enriched, setEnriched] = useState<Record<string, EnrichedCandidate>>({});
  const [enriching, setEnriching] = useState(0);
  const [showLessRelevant, setShowLessRelevant] = useState(false);
  // §8 — sélection du lot. On stocke les CHOIX EXPLICITES (url → coché ?) ; une carte
  // absente suit son défaut : cochée d'office au-dessus du seuil ET de type connu,
  // décochée sinon (en dessous du seuil, ou type non précisé quel que soit le score).
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [importFailures, setImportFailures] = useState<RankedCandidate[]>([]);
  const busy = pending || searching || importing;

  const defaultChecked = (entry: RankedCandidate): boolean =>
    entry.score >= SIMILARITY_THRESHOLD && entry.candidate.propertyType != null;
  const isChecked = (entry: RankedCandidate): boolean =>
    selection[entry.candidate.url] ?? defaultChecked(entry);
  const toggleSelect = (entry: RankedCandidate) =>
    setSelection((current) => ({ ...current, [entry.candidate.url]: !isChecked(entry) }));

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

  // Reclasse (serveur, avec l'apprentissage) après toute mise à jour de la liste des
  // portails — recherche, relance d'un portail, collage. Le classement est la seule
  // vue « du plus au moins ressemblant » ; sans reclassement, une carte collée ou
  // relancée n'y entrerait pas.
  async function refreshRanking(next: PortalSearchResult[]) {
    setPortals(next);
    const rank = await rankAction(next);
    if (rank.ok) {
      setRanked(rank.ranked);
      setLearnedNotes(rank.learnedNotes);
    } else {
      setError(rank.error);
    }
    return rank;
  }

  // §10 — la recherche est MENÉE PAR L'EXTENSION : le serveur prépare les adresses,
  // l'extension lit les quatre portails dans UNE seule fenêtre, l'un après l'autre.
  // Extension absente → on ne fait pas quatre collages : on le dit (extensionMissing)
  // et on renvoie vers l'ajout manuel par adresse.
  async function runSearch() {
    setError(null);
    setExtensionMissing(false);
    setSearching(true);
    try {
      const prep = await prepareAction();
      if (!prep.ok) {
        setError(prep.error);
        setPortals(null);
        setRanked([]);
        setLearnedNotes([]);
        return;
      }
      setSearchLinks(prep.links);

      const ping = await pingExtension();
      if (!ping.available) {
        setExtensionMissing(true);
        setPortals(null);
        setRanked([]);
        setLearnedNotes([]);
        return;
      }

      const win = await openSearchWindowViaExtension();
      if (!win.ok || win.windowId == null) {
        setError('La fenêtre de recherche n’a pas pu s’ouvrir. Réessayez.');
        return;
      }
      const robotsCache: PortalRobotsCache = new Map();
      let read: PortalSearchResult[];
      try {
        read = await readPortalsSequentially(prep.links, {
          readPage: (url) => readPageViaExtension(url, { windowId: win.windowId, robotsCache }),
          interPageDelayMs: 1000,
        });
      } finally {
        await closeSearchWindowViaExtension(win.windowId);
      }

      setDecided({});
      setEnriched({});
      setSelection({});
      setImportProgress(null);
      setImportFailures([]);
      const rank = await refreshRanking(read);
      if (rank.ok) {
        void enrichTop(rank.ranked);
      }
    } finally {
      setSearching(false);
    }
  }

  function handlePaste(searchUrl: string, html: string) {
    setError(null);
    const formData = new FormData();
    formData.set('url', searchUrl);
    formData.set('html', html);
    startTransition(async () => {
      const result = await importResultsHtmlAction(formData);
      if (result.ok) {
        const next = (portals ?? []).map((portal) =>
          portal.portal === result.portal.portal ? result.portal : portal,
        );
        await refreshRanking(next);
      } else {
        setError(result.error);
      }
    });
  }

  // §10 : relance d'UN portail injoignable (échec passager), par l'extension, sans
  // refaire les trois autres. Une fenêtre one-off (ouverte puis fermée par l'extension)
  // suffit pour une seule page.
  async function handleRetry(portal: PortalSearchResult['portal']) {
    const link = searchLinks.find((candidate) => candidate.portal === portal);
    if (!link) {
      return;
    }
    setError(null);
    setSearching(true);
    try {
      const ping = await pingExtension();
      if (!ping.available) {
        setExtensionMissing(true);
        return;
      }
      const robotsCache: PortalRobotsCache = new Map();
      const [one] = await readPortalsSequentially([link], {
        readPage: (url) => readPageViaExtension(url, { robotsCache }),
        interPageDelayMs: 0,
      });
      const next = (portals ?? []).map((current) => (current.portal === portal ? one : current));
      await refreshRanking(next);
    } finally {
      setSearching(false);
    }
  }

  // §8 — importe UNE fiche par l'extension : lit la page de l'annonce (robots respecté)
  // puis crée le concurrent. Renvoie l'issue, jamais ne jette : le lot isole chaque
  // fiche. `windowId` réutilise la fenêtre unique du lot ; absent = fenêtre one-off
  // (relance d'une seule fiche).
  async function importOne(
    entry: RankedCandidate,
    robotsCache: PortalRobotsCache,
    windowId?: number,
  ): Promise<boolean> {
    const read = await readPageViaExtension(entry.candidate.url, { windowId, robotsCache });
    if (!read.ok) {
      return false;
    }
    const result = await importAction(entry.candidate.url, read.html);
    return result.ok;
  }

  const decisionOf = (
    entry: RankedCandidate,
    decision: 'accepted' | 'rejected',
  ): BatchDecision => ({
    url: entry.candidate.url,
    decision,
    price: entry.candidate.price,
    surfaceArea: entry.candidate.surfaceArea,
    roomsCount: entry.candidate.roomsCount,
    city: entry.candidate.city,
    propertyType: entry.candidate.propertyType,
  });

  // §8 — la validation en lot. Au clic (le geste humain), et pas avant : les cochées
  // sont importées UNE PAR UNE dans une seule fenêtre, une seconde entre deux, avec
  // l'avancement à l'écran ; une fiche qui échoue est NOMMÉE et relançable seule, les
  // autres entrent quand même. Puis on écrit les décisions : retenues importées =
  // « accepted », décochées = « rejected » sans motif.
  async function validateBatch() {
    const pending = ranked.filter((entry) => decided[entry.candidate.url] == null);
    const checked = pending.filter((entry) => isChecked(entry));
    const unchecked = pending.filter((entry) => !isChecked(entry));
    if (checked.length === 0) {
      return;
    }
    setError(null);
    setExtensionMissing(false);
    setImportFailures([]);

    const ping = await pingExtension();
    if (!ping.available) {
      setExtensionMissing(true);
      return;
    }
    const win = await openSearchWindowViaExtension();
    if (!win.ok || win.windowId == null) {
      setError('La fenêtre d’import n’a pas pu s’ouvrir. Réessayez.');
      return;
    }

    setImporting(true);
    setImportProgress({ done: 0, total: checked.length });
    const robotsCache: PortalRobotsCache = new Map();
    const importedOk: RankedCandidate[] = [];
    const failures: RankedCandidate[] = [];
    try {
      for (let i = 0; i < checked.length; i += 1) {
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        const ok = await importOne(checked[i], robotsCache, win.windowId);
        if (ok) {
          importedOk.push(checked[i]);
        } else {
          failures.push(checked[i]);
        }
        setImportProgress({ done: importedOk.length, total: checked.length });
      }
    } finally {
      await closeSearchWindowViaExtension(win.windowId);
    }

    // Décisions écrites d'un coup : importées = retenues, décochées = écartées.
    const decisions = [
      ...importedOk.map((entry) => decisionOf(entry, 'accepted')),
      ...unchecked.map((entry) => decisionOf(entry, 'rejected')),
    ];
    if (decisions.length > 0) {
      await recordDecisionsAction(decisions);
    }

    setDecided((current) => {
      const next = { ...current };
      for (const entry of importedOk) {
        next[entry.candidate.url] = 'accepted';
      }
      for (const entry of unchecked) {
        next[entry.candidate.url] = 'rejected';
      }
      return next;
    });
    // Les échecs restent à trancher : nommés, relançables seuls.
    setImportFailures(failures);
    setImporting(false);
  }

  // Relance d'UNE fiche en échec, seule (fenêtre one-off). Réussie → retenue.
  async function retryImportOne(entry: RankedCandidate) {
    setError(null);
    const ping = await pingExtension();
    if (!ping.available) {
      setExtensionMissing(true);
      return;
    }
    setImporting(true);
    try {
      const ok = await importOne(entry, new Map());
      if (ok) {
        await recordDecisionsAction([decisionOf(entry, 'accepted')]);
        setDecided((current) => ({ ...current, [entry.candidate.url]: 'accepted' }));
        setImportFailures((current) =>
          current.filter((f) => f.candidate.url !== entry.candidate.url),
        );
      } else {
        setError(`« ${entry.candidate.title ?? entry.candidate.url} » n’a pas pu être importée.`);
      }
    } finally {
      setImporting(false);
    }
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
  // On coupe la liste au seuil de ressemblance : les plus ressemblants d'abord, le
  // reste plié derrière un bouton. Rien n'est perdu — un clic révèle tout.
  const relevant = undecided.filter((entry) => entry.score >= SIMILARITY_THRESHOLD);
  const lessRelevant = undecided.filter((entry) => entry.score < SIMILARITY_THRESHOLD);

  const checkedCount = undecided.filter((entry) => isChecked(entry)).length;

  const renderCard = (entry: RankedCandidate) => (
    <RankedCandidateCard
      key={entry.candidate.url}
      ranked={entry}
      enriched={enriched[entry.candidate.url] ?? null}
      selected={isChecked(entry)}
      onToggleSelect={() => toggleSelect(entry)}
      pending={busy}
      onDecision={(payload) => handleDecision(entry, payload)}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={runSearch} disabled={busy} className={btnPrimary}>
          {searching ? 'Recherche en cours…' : 'Lancer la recherche'}
        </button>
        <p className={hintText}>Critères : {criteriaLabel}</p>
      </div>
      {searching ? (
        // §10 : les portails sont interrogés l'un après l'autre, une seconde entre
        // deux pages — on le DIT au lieu de faire semblant d'être instantané.
        <p className={hintText}>
          Les quatre portails sont interrogés l’un après l’autre, poliment (une seconde entre deux
          pages) dans une fenêtre discrète. Cela prend quelques secondes.
        </p>
      ) : null}
      <p className="text-xs text-zinc-400 stage:text-white/40">
        La recherche interroge Green Acres, SeLoger, Bien’ici et Maisons et Appartements via
        l’extension ACM Studio. Un portail qui refuse la lecture reste accessible : ouvrez sa
        recherche, copiez le code de la page de résultats et collez-le. Chaque suggestion reste à
        retenir ou à écarter — rien n’est enregistré sans votre validation.
      </p>
      {error ? (
        <p role="alert" className={alertError}>
          {error}
        </p>
      ) : null}
      {extensionMissing ? (
        // La recherche automatique demande l'extension. Absente, on ne dégrade PAS en
        // quatre collages : on le dit, et on propose le geste qui existe déjà — ajouter
        // un concurrent par son adresse. Un clic ne devient pas huit sans le dire.
        <div className={`${card} flex flex-col gap-2 p-4`}>
          <span className="font-title text-sm font-semibold text-zinc-800 stage:text-white">
            La recherche automatique demande l’extension ACM Studio
          </span>
          <p className={hintText}>
            L’extension lit les quatre portails depuis votre navigateur. Sans elle, la recherche
            automatique n’est pas disponible — plutôt que de vous demander quatre copier-coller,
            ajoutez un concurrent par son adresse, le geste habituel.
          </p>
          <Link
            href={`/builder/${projectId}/comparables/new`}
            className={`${btnSecondary} self-start px-3 py-1.5 text-sm`}
          >
            Ajouter un concurrent par son adresse
          </Link>
        </div>
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

          {/* §8 — la validation en lot. Le bouton dit ce qu'il fait, avec le compte ;
              un lot qui écrit N fiches ne se déclenche pas derrière un libellé vague.
              L'avancement s'affiche pendant l'import (« 3 sur 8 »). */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={validateBatch}
              disabled={busy || checkedCount === 0}
              className={btnPrimary}
            >
              {importing && importProgress
                ? `Import en cours… ${importProgress.done} sur ${importProgress.total}`
                : `Retenir et importer les ${checkedCount} concurrent${checkedCount > 1 ? 's' : ''} coché${checkedCount > 1 ? 's' : ''}`}
            </button>
            <p className={hintText}>
              Les cochées sont importées dans le dossier ; les décochées sont écartées. Environ une
              seconde par fiche — rien n’est enregistré avant ce clic.
            </p>
          </div>

          {importFailures.length > 0 ? (
            <div className={`${card} flex flex-col gap-2 p-3.5`}>
              <span className="text-sm font-semibold text-amber-700 stage:text-amber-300">
                {importFailures.length} fiche{importFailures.length > 1 ? 's' : ''} n’
                {importFailures.length > 1 ? 'ont' : 'a'} pas pu être importée
                {importFailures.length > 1 ? 's' : ''} — les autres sont bien entrées.
              </span>
              {importFailures.map((entry) => (
                <div
                  key={entry.candidate.url}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <span className="text-zinc-700 stage:text-white/80">
                    {entry.candidate.title ?? entry.candidate.url}
                  </span>
                  <button
                    type="button"
                    onClick={() => retryImportOne(entry)}
                    disabled={busy}
                    className={`${btnSecondary} px-3 py-1.5 text-xs`}
                  >
                    Relancer cette fiche
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {/* Les plus ressemblants (≥ seuil). Si tout est en dessous du seuil, on
              affiche quand même le premier groupe vide-mains via lessRelevant. */}
          {relevant.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {relevant.map(renderCard)}
            </div>
          ) : (
            <p className={hintText}>
              Aucun candidat au-dessus du seuil de ressemblance. Les propositions ci-dessous sont
              plus éloignées — à vous de juger.
            </p>
          )}

          {lessRelevant.length > 0 ? (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setShowLessRelevant((value) => !value)}
                className={`${btnSecondary} self-start px-3 py-1.5 text-sm`}
              >
                {showLessRelevant
                  ? 'Masquer les moins ressemblants'
                  : `Voir les ${lessRelevant.length} autre${lessRelevant.length > 1 ? 's' : ''}, moins ressemblant${lessRelevant.length > 1 ? 's' : ''}`}
              </button>
              {showLessRelevant ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {lessRelevant.map(renderCard)}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {portals
        ? portals.map((portal) => (
            <PortalBlock
              key={portal.portal}
              portal={portal}
              projectId={projectId}
              onPaste={handlePaste}
              onRetry={handleRetry}
              pending={busy}
            />
          ))
        : null}
    </div>
  );
}

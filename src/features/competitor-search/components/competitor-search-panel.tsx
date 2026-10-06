'use client';

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

import type { ImportAndCreateResult } from '@/features/competitor-search/actions/import-and-create-competitor';
import type { PrepareSearchResult } from '@/features/competitor-search/actions/prepare-competitor-search';
import type { PrepareOpenSearchesResult } from '@/features/competitor-search/actions/prepare-open-searches';
import type {
  RememberPortalPlacesInput,
  RememberPortalPlacesResult,
} from '@/features/competitor-search/actions/remember-portal-places';
import type { RankSearchResult } from '@/features/competitor-search/actions/rank-competitor-candidates';
import type { BatchDecision } from '@/features/competitor-search/actions/record-competitor-decisions';
import type {
  StreamEstateResume,
  StreamEstateSearchResult,
} from '@/features/competitor-search/actions/search-stream-estate';
import {
  closeSearchWindowViaExtension,
  openSearchTabsViaExtension,
  openSearchWindowViaExtension,
  pingExtension,
  readSearchTabsViaExtension,
} from '@/features/browser-extension/client';
import { ExtensionRequiredNotice } from '@/features/browser-extension/extension-required-notice';
import {
  RankedCandidateCard,
  StreamEstateFactsLine,
  type DecisionPayload,
} from '@/features/competitor-search/components/ranked-candidate-card';
import {
  redirectedAwayFromListing,
  withdrawnReason,
} from '@/features/competitor-search/services/stream-estate-import';
import {
  readPageViaExtension,
  type PortalRobotsCache,
} from '@/features/competitor-search/services/read-page-via-extension';
import { batchDecisions, decisionOf } from '@/features/competitor-search/services/batch-decisions';
import { showBatchImport } from '@/features/competitor-search/services/batch-import-visibility';
import {
  canSearchMore,
  describeStreamEstateSearch,
  mergeStreamEstateNote,
  MORE_LABEL,
  resumeMemory,
  type StreamEstateSearchNote,
} from '@/features/competitor-search/services/stream-estate-summary';
import { surfaceToleranceLabel } from '@/features/competitor-search/services/describe-loosening';
import { SECTOR_NEUTRAL_MESSAGES } from '@/features/competitor-search/services/geocode-subject';
import { splitVisible, VISIBLE_CANDIDATES } from '@/features/competitor-search/services/proximity';
import { detectSearchPortal } from '@/features/competitor-search/services/extract-search-results';
import type { FilteredSearchLink } from '@/features/competitor-search/services/build-filtered-search-urls';
import {
  describeReadCounts,
  readSearchPages,
} from '@/features/competitor-search/services/read-search-pages';
import { formatEuro, formatSquareMeters } from '@/lib/format';
import {
  SEARCH_PORTAL_LABELS,
  STREAM_ESTATE_LABEL,
  STREAM_ESTATE_SEARCH_BUTTON,
  STREAM_ESTATE_SOURCE,
  type CompetitorCandidate,
  type ExcludedForMissing,
  type Loosening,
  type PortalSearchResult,
  type RankedCandidate,
  type RecordDecisionResult,
  type SectorStatus,
} from '@/features/competitor-search/types';

// Mission 61 — l'état d'admissibilité renvoyé par le classement, pour le bandeau.
type Admissibility = {
  loosening: Loosening;
  excludedForMissing: ExcludedForMissing;
  belowMinimum: boolean;
  target: number;
  minimum: number;
  rankedCount: number;
  // Le neuf : ajouté en complément (sous 3 dans l'ancien) ou tenu en réserve.
  newBuildAdded: number;
  newBuildHeld: number;
};

// Le portail d'un onglet de recherche, pour le nommer (« Cliquez une fois sur l'onglet SeLoger »).
function tabPortalLabel(tab: { url: string }): string {
  try {
    const portal = detectSearchPortal(new URL(tab.url).hostname);
    return portal ? SEARCH_PORTAL_LABELS[portal] : 'Portail';
  } catch {
    return 'Portail';
  }
}

const plural = (count: number, one: string, many: string): string =>
  `${count} ${count > 1 ? many : one}`;

const euro = (value: number | null): string => (value != null ? formatEuro(value) : '—');

type Props = {
  criteriaLabel: string;
  // Le serveur prépare les critères et classe (avec l'apprentissage) ; la LECTURE des onglets
  // de recherche se fait par l'extension, dans le navigateur.
  prepareAction: () => Promise<PrepareSearchResult>;
  rankAction: (portals: PortalSearchResult[]) => Promise<RankSearchResult>;
  recordDecisionAction: (formData: FormData) => Promise<RecordDecisionResult>;
  // §8 — import d'un concurrent depuis le HTML lu par l'extension, et écriture des
  // décisions du lot (retenues + écartées) en un appel.
  importAction: (
    url: string,
    html: string,
    propertyType: string | null,
  ) => Promise<ImportAndCreateResult>;
  recordDecisionsAction: (decisions: BatchDecision[]) => Promise<RecordDecisionResult>;
  // Mission 69 — « Ouvrir mes recherches » (adresses déjà filtrées) et l'apprentissage des
  // identifiants de commune relevés dans les onglets lus.
  prepareOpenAction: () => Promise<PrepareOpenSearchesResult>;
  rememberPlacesAction: (pages: RememberPortalPlacesInput) => Promise<RememberPortalPlacesResult>;
  // Essai Stream Estate — fourni par la page SEULEMENT si la clé est définie côté serveur ;
  // absent, le bouton n'existe pas.
  // Mission 71 — `resume` : « Chercher encore », reprise au plafond.
  streamEstateAction?: (resume?: StreamEstateResume | null) => Promise<StreamEstateSearchResult>;
};

// Mission 69 — ce que l'écran dit après « Ouvrir mes recherches ».
type OpenedSearches = {
  city: string;
  links: FilteredSearchLink[];
  opened: number;
};

// Seuil de ressemblance : sans fourchette saisie, une annonce en dessous n'est pas cochée d'office.
// L'affichage, lui, suit l'ordre « les plus proches » (étape 2) : les 10 premiers, puis le reste
// derrière « Voir les N autres ». On ne masque rien (mission 36) — un clic révèle tout.
const SIMILARITY_THRESHOLD = 60;

function CandidateCard({
  candidate,
  onImport,
  onDiscard,
  pending,
}: {
  candidate: CompetitorCandidate;
  // §3 — import EN PLACE : renvoie null si le concurrent a bien été créé (la carte est
  // alors retirée par le parent), sinon la CAUSE réelle de l'échec (affichée).
  onImport: () => Promise<string | null>;
  onDiscard: () => void;
  pending: boolean;
}) {
  const [importing, setImporting] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const photos = candidate.photoUrls;
  const shown = photos.length > 0 ? Math.min(photoIndex, photos.length - 1) : 0;
  const step = (delta: number) =>
    setPhotoIndex((index) => (index + delta + photos.length) % photos.length);
  return (
    <div
      className={`${card} group flex flex-col gap-2.5 overflow-hidden transition-colors hover:border-brand/60 stage:hover:border-brand/60`}
    >
      <div className="relative h-36 w-full">
        {photos.length > 0 ? (
          <RemoteImage
            src={photos[shown]}
            alt={candidate.title ?? 'Bien concurrent'}
            className="h-36 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            fallbackClassName="h-36 w-full"
          />
        ) : (
          <div className="flex h-36 w-full items-center justify-center bg-zinc-50 text-xs text-zinc-400 stage:bg-white/5 stage:text-white/40">
            Photo indisponible
          </div>
        )}
        {/* Défiler SUR PLACE, dans la carte : flèches + compteur, pas de lightbox. Une
            seule photo → pas de flèches (plutôt que des flèches inertes). */}
        {photos.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Photo précédente"
              onClick={() => step(-1)}
              className="absolute top-1/2 left-1 -translate-y-1/2 rounded-full bg-black/45 px-2 py-1 text-sm leading-none text-white hover:bg-black/65"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Photo suivante"
              onClick={() => step(1)}
              className="absolute top-1/2 right-1 -translate-y-1/2 rounded-full bg-black/45 px-2 py-1 text-sm leading-none text-white hover:bg-black/65"
            >
              ›
            </button>
            <span className="absolute right-1 bottom-1 rounded bg-black/45 px-1.5 py-0.5 text-[10px] text-white">
              {shown + 1}/{photos.length}
            </span>
          </>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 px-3.5 pb-3.5">
        <div className="font-title text-base leading-snug font-semibold capitalize text-zinc-900 stage:text-white">
          {candidate.title ?? 'Annonce détectée'}
        </div>
        <div className="text-sm text-zinc-500 stage:text-white/60">
          <span className="font-semibold text-brand-deep stage:text-white">
            {euro(candidate.price)}
          </span>
          {candidate.surfaceArea != null ? ` · ${formatSquareMeters(candidate.surfaceArea)}` : ''}
          {candidate.roomsCount != null ? ` · ${candidate.roomsCount} pièces` : ''}
        </div>
        {candidate.streamEstate ? <StreamEstateFactsLine facts={candidate.streamEstate} /> : null}
        <div className="mt-auto flex flex-col gap-2 pt-2 text-sm">
          {failed ? (
            // La cause réelle, visible sur la carte (pas seulement dans la console).
            <p className="text-xs font-medium text-amber-700 stage:text-amber-300">
              L’import a échoué — cause : {failed}. Réessayez, ou ouvrez l’annonce.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 text-xs">
            {/* §3 — en place : on clique, ça se fait, la carte quitte la liste. */}
            <button
              type="button"
              disabled={pending || importing}
              onClick={async () => {
                setFailed(null);
                setImporting(true);
                const reason = await onImport();
                if (reason != null) {
                  setImporting(false);
                  setFailed(reason);
                }
                // Si null, le parent retire la carte ; pas besoin de remettre l'état.
              }}
              className={`${btnPrimary} px-3 py-1.5`}
            >
              {importing ? 'Import en cours…' : 'Retenir et importer'}
            </button>
            <a
              href={candidate.url}
              target="_blank"
              rel="noreferrer noopener"
              className={`${btnSecondary} px-3 py-1.5`}
            >
              Voir l’annonce
            </a>
            <button
              type="button"
              onClick={onDiscard}
              disabled={pending || importing}
              className={`${btnSecondary} px-3 py-1.5`}
            >
              Écarter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PortalBlock({
  portal,
  onImport,
  pending,
}: {
  portal: PortalSearchResult;
  onImport: (candidate: CompetitorCandidate) => Promise<string | null>;
  pending: boolean;
}) {
  const [discarded, setDiscarded] = useState<Set<string>>(new Set());

  const visible = portal.candidates.filter((candidate) => !discarded.has(candidate.url));

  return (
    <section className={`${card} flex flex-col gap-3 p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={formSectionTitle}>{portal.label}</h2>
        {/* Essai Stream Estate : pas de page de recherche publique, donc pas de lien. */}
        {portal.searchUrl !== '' ? (
          <a
            href={portal.searchUrl}
            target="_blank"
            rel="noreferrer noopener"
            className={`${linkCls} text-sm hover:underline`}
          >
            Ouvrir la recherche {portal.label}
          </a>
        ) : null}
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
                onImport={() => onImport(candidate)}
                pending={pending}
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
        <p className="text-sm font-medium text-amber-700 stage:text-amber-300">{portal.message}</p>
      )}
    </section>
  );
}

export function CompetitorSearchPanel({
  criteriaLabel,
  prepareAction,
  rankAction,
  recordDecisionAction,
  importAction,
  recordDecisionsAction,
  prepareOpenAction,
  rememberPlacesAction,
  streamEstateAction,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Mission 74 — l'extension manque ou est trop ancienne : un seul message, sans repli.
  const [extensionIssue, setExtensionIssue] = useState<'missing' | 'outdated' | null>(null);
  const [portals, setPortals] = useState<PortalSearchResult[] | null>(null);
  // §1 (revue) — la fourchette du bien vendeur : la liste principale n'en sort pas.
  const [advisorRange, setAdvisorRange] = useState<{ min: number | null; max: number | null }>({
    min: null,
    max: null,
  });
  const [ranked, setRanked] = useState<RankedCandidate[]>([]);
  const [admissibility, setAdmissibility] = useState<Admissibility | null>(null);
  const [learnedNotes, setLearnedNotes] = useState<string[]>([]);
  // Étape 2 — le secteur : distances mesurées depuis l'adresse du bien, ou neutre (et pourquoi).
  const [sector, setSector] = useState<SectorStatus | null>(null);
  const [decided, setDecided] = useState<Record<string, 'accepted' | 'rejected'>>({});
  const [showLessRelevant, setShowLessRelevant] = useState(false);
  // §8 — sélection du lot. On stocke les CHOIX EXPLICITES (url → coché ?) ; une carte
  // absente suit son défaut : cochée d'office au-dessus du seuil ET de type connu,
  // décochée sinon (en dessous du seuil, ou type non précisé quel que soit le score).
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  // La fiche en échec ET sa cause réelle (robots ? prix ? fenêtre ?), affichée.
  const [importFailures, setImportFailures] = useState<
    { entry: RankedCandidate; reason: string }[]
  >([]);
  // Mission 69 — « Lire mes recherches » : les onglets que le conseiller a filtrés.
  const [reading, setReading] = useState(false);
  // Mission 69 — onglets ouverts, récapitulatif par portail, onglets restés sur l'écran d'attente.
  const [opening, setOpening] = useState(false);
  const [openedSearches, setOpenedSearches] = useState<OpenedSearches | null>(null);
  const [readSummary, setReadSummary] = useState<string[]>([]);
  const [waitingTabs, setWaitingTabs] = useState<string[]>([]);
  // Essai Stream Estate — recherche en cours, et ce qu'elle a coûté / rapporté.
  const [streamSearching, setStreamSearching] = useState(false);
  const [streamNote, setStreamNote] = useState<StreamEstateSearchNote | null>(null);
  const busy = pending || importing || reading || opening || streamSearching;

  // Les biens de Stream Estate restent à côté des portails quand on relit les onglets.
  const withStreamEstate = (next: PortalSearchResult[]): PortalSearchResult[] => [
    ...next.filter((portal) => portal.portal !== STREAM_ESTATE_SOURCE),
    ...(portals ?? []).filter((portal) => portal.portal === STREAM_ESTATE_SOURCE),
  ];

  // §1 (revue) — décision de Laurent, qui prime sur « on classe, on ne filtre pas » :
  // la LISTE PRINCIPALE ne contient QUE des biens dans la fourchette du bien vendeur.
  // Ce qui est au-dessus/en dessous bascule dans le repli — rien n'est masqué, mais la
  // liste que le conseiller regarde reste dans sa fourchette. Sans fourchette saisie,
  // on retombe sur le seuil de ressemblance.
  const hasRange = advisorRange.min != null || advisorRange.max != null;
  const inRange = (entry: RankedCandidate): boolean => {
    const price = entry.candidate.price;
    if (price == null) {
      return false; // sans prix, on ne peut pas confirmer la fourchette → repli
    }
    return (
      (advisorRange.min == null || price >= advisorRange.min) &&
      (advisorRange.max == null || price <= advisorRange.max)
    );
  };
  const inMainList = (entry: RankedCandidate): boolean =>
    hasRange ? inRange(entry) : entry.score >= SIMILARITY_THRESHOLD;

  // Étape 2 — l'ordre « les plus proches » : les 10 premiers non tranchés sont montrés, le reste
  // attend derrière « Voir les N autres ». Seuls les 5 premiers sont cochés d'office ; on
  // n'importe jamais une annonce que le conseiller n'a pas eue sous les yeux.
  const undecided = ranked.filter((entry) => decided[entry.candidate.url] == null);
  const { shown, others, preselected } = splitVisible(undecided);
  const preselectedUrls = new Set(preselected.map((entry) => entry.candidate.url));

  const defaultChecked = (entry: RankedCandidate): boolean =>
    preselectedUrls.has(entry.candidate.url) &&
    inMainList(entry) &&
    entry.candidate.propertyType != null;
  const isChecked = (entry: RankedCandidate): boolean =>
    selection[entry.candidate.url] ?? defaultChecked(entry);
  const toggleSelect = (entry: RankedCandidate) =>
    setSelection((current) => ({ ...current, [entry.candidate.url]: !isChecked(entry) }));

  // Reclasse (serveur, avec l'apprentissage) après toute mise à jour de la liste des
  // portails. Le classement est la seule vue « du plus au moins ressemblant ».
  async function refreshRanking(next: PortalSearchResult[]) {
    setPortals(next);
    const rank = await rankAction(next);
    if (rank.ok) {
      setRanked(rank.ranked);
      setAdmissibility({
        loosening: rank.loosening,
        excludedForMissing: rank.excludedForMissing,
        belowMinimum: rank.belowMinimum,
        target: rank.target,
        minimum: rank.minimum,
        rankedCount: rank.ranked.length,
        newBuildAdded: rank.ranked.filter((entry) => entry.newBuildComplement).length,
        newBuildHeld: rank.newBuildHeld,
      });
      setLearnedNotes(rank.learnedNotes);
      setSector(rank.sector);
    } else {
      setError(rank.error);
    }
    return rank;
  }

  // Essai Stream Estate — une recherche côté serveur (la clé n'arrive jamais ici), par crans. Ses
  // biens rejoignent les portails dans le MÊME classement. `more` : « Chercher encore » — reprend
  // exactement où la recherche s'est arrêtée au plafond, et ajoute ses biens aux précédents.
  async function searchViaStreamEstate(more = false) {
    if (!streamEstateAction) {
      return;
    }
    const previousPortal = more
      ? ((portals ?? []).find((portal) => portal.portal === STREAM_ESTATE_SOURCE) ?? null)
      : null;
    const previousNote = more ? streamNote : null;
    if (more && (previousNote?.cursor == null || previousPortal == null)) {
      return;
    }
    setError(null);
    if (!more) setStreamNote(null);
    setStreamSearching(true);
    try {
      const result = await streamEstateAction(
        more && previousNote?.cursor && previousPortal
          ? { cursor: previousNote.cursor, memory: resumeMemory(previousPortal.candidates) }
          : null,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const prep = await prepareAction();
      if (!prep.ok) {
        setError(prep.error);
        return;
      }
      setAdvisorRange({ min: prep.criteria.advisorPriceMin, max: prep.criteria.advisorPriceMax });
      const others = (portals ?? []).filter((portal) => portal.portal !== STREAM_ESTATE_SOURCE);
      const candidates = [...(previousPortal?.candidates ?? []), ...result.portal.candidates];
      await refreshRanking([
        ...others,
        {
          ...result.portal,
          candidates,
          status: candidates.length > 0 ? 'ok' : 'empty',
          message: candidates.length > 0 ? null : result.portal.message,
        },
      ]);
      setStreamNote(
        mergeStreamEstateNote(previousNote, {
          billed: result.billed,
          stop: result.stop,
          cursor: result.cursor,
          tiers: result.tiers,
          counts: result.counts,
          newBuild: result.newBuild,
          located: result.located,
          communeName: result.communeName,
          inseeCode: result.inseeCode,
        }),
      );
    } finally {
      setStreamSearching(false);
    }
  }

  // Mission 69 — « Ouvrir mes recherches » : le serveur construit les adresses filtrées depuis le
  // bien vendeur, l'extension les ouvre dans des onglets visibles.
  async function openMySearches() {
    setError(null);
    setExtensionIssue(null);
    setOpenedSearches(null);
    setReadSummary([]);
    setWaitingTabs([]);
    setOpening(true);
    try {
      const prep = await prepareOpenAction();
      if (!prep.ok) {
        setError(prep.error);
        return;
      }
      const ping = await pingExtension();
      if (!ping.available) {
        setExtensionIssue('missing');
        return;
      }
      const opened = await openSearchTabsViaExtension(prep.links.map((link) => link.url));
      if (!opened.ok) {
        if (opened.reason === 'outdated') {
          setExtensionIssue('outdated');
        } else {
          setError('Les onglets n’ont pas pu s’ouvrir. Réessayez.');
        }
        return;
      }
      setOpenedSearches({ city: prep.city, links: prep.links, opened: opened.opened });
    } finally {
      setOpening(false);
    }
  }

  // Mission 69 — « Lire mes recherches » : TOUS les onglets de recherche, d'un coup. L'extension
  // active chaque onglet le temps qu'il se construise, puis revient à ACM ; un onglet resté sur
  // l'écran d'attente est NOMMÉ, jamais lu comme une page vide. La liste fusionnée remplace la
  // précédente ; le récapitulatif dit, par portail, combien d'annonces ont été lues et retenues.
  async function readAllMySearches() {
    setError(null);
    setExtensionIssue(null);
    setReadSummary([]);
    setWaitingTabs([]);
    setReading(true);
    try {
      const ping = await pingExtension();
      if (!ping.available) {
        setExtensionIssue('missing');
        return;
      }
      const result = await readSearchTabsViaExtension();
      if (!result.ok) {
        if (result.reason === 'outdated') {
          setExtensionIssue('outdated');
        } else if (result.reason === 'none') {
          setError(
            'Aucun onglet de recherche ouvert sur SeLoger, Bien’ici, Green Acres ou Maisons et Appartements. Cliquez d’abord sur « Ouvrir mes recherches ».',
          );
        } else {
          setError('Les onglets n’ont pas pu être lus. Réessayez.');
        }
        return;
      }
      const waiting = result.pages.filter((page) => !page.ok && page.reason === 'waiting');
      setWaitingTabs([...new Set(waiting.map((page) => tabPortalLabel(page)))]);
      const pages = result.pages.flatMap((page) =>
        page.ok ? [{ html: page.html, url: page.finalUrl }] : [],
      );
      const read = readSearchPages(pages);
      if (read.portals.length === 0) {
        if (waiting.length === 0) {
          setError(
            'Aucune annonce détectée sur vos onglets de recherche. Vérifiez que chaque onglet affiche bien la liste des résultats, puis relancez.',
          );
        }
        return;
      }
      const prep = await prepareAction();
      if (!prep.ok) {
        setError(prep.error);
        return;
      }
      setAdvisorRange({ min: prep.criteria.advisorPriceMin, max: prep.criteria.advisorPriceMax });
      setDecided({});
      setSelection({});
      setImportProgress(null);
      setImportFailures([]);
      const rank = await refreshRanking(withStreamEstate(read.portals));
      if (rank.ok) {
        setReadSummary(describeReadCounts(read.counts, rank.ranked));
      }
      await rememberPlacesAction(read.learnInput).catch(() => undefined);
    } finally {
      setReading(false);
    }
  }

  // §8 — importe UNE fiche par l'extension : lit la page de l'annonce (robots respecté)
  // puis crée le concurrent. Renvoie l'ISSUE AVEC SA CAUSE, jamais un booléen nu : le
  // catch qui détruit l'information est la leçon de la mission 46 §2.4. La cause réelle
  // est journalisée ET rendue visible sur la fiche en échec. `windowId` réutilise la
  // fenêtre unique du lot ; absent = fenêtre one-off (relance d'une seule fiche).
  async function importOne(
    candidate: CompetitorCandidate,
    robotsCache: PortalRobotsCache,
    windowId?: number,
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    const url = candidate.url;
    const stream = candidate.streamEstate;
    // Essai Stream Estate : l'annonce d'ORIGINE (toujours sur un site de la liste blanche) est
    // relue par l'import existant.
    const read = await readPageViaExtension(url, { windowId, robotsCache });
    if (!read.ok) {
      const reason =
        read.reason === 'robots'
          ? 'le robots.txt de l’annonce refuse la lecture automatique'
          : read.reason === 'invalid'
            ? 'adresse d’annonce invalide'
            : 'la fiche n’a pas répondu (réseau ou fenêtre fermée)';
      console.warn(`[import] ${url} — ${reason}`);
      return { ok: false, reason };
    }
    // Essai Stream Estate : renvoyé hors de l'annonce (liste, accueil) = annonce retirée.
    if (stream && redirectedAwayFromListing(url, read.finalUrl)) {
      console.warn(`[import] ${url} — redirigée vers ${read.finalUrl}`);
      return { ok: false, reason: withdrawnReason(stream) };
    }
    // Le type lu sur la CARTE de recherche voyage jusqu'à la création : la page
    // d'annonce ne le porte pas de façon fiable, la carte oui.
    const result = await importAction(url, read.html, candidate.propertyType);
    if (!result.ok) {
      console.warn(`[import] ${url} — ${result.error}`);
      // Essai Stream Estate : une page sans prix ni donnée = annonce introuvable ou retirée.
      if (stream && result.code === 'listing_empty') {
        return { ok: false, reason: withdrawnReason(stream) };
      }
      return { ok: false, reason: result.error };
    }
    return { ok: true };
  }

  // §8 — la validation en lot. Au clic (le geste humain), et pas avant : les cochées
  // sont importées UNE PAR UNE dans une seule fenêtre, une seconde entre deux, avec
  // l'avancement à l'écran ; une fiche qui échoue est NOMMÉE et relançable seule, les
  // autres entrent quand même. Puis on écrit les décisions : seules les importées, comme
  // retenues. Une annonce non cochée (montrée ou derrière « Voir les N autres ») n'est ni
  // retenue ni écartée : elle reste dans la liste, sans trace dans l'apprentissage.
  async function validateBatch() {
    const pending = ranked.filter((entry) => decided[entry.candidate.url] == null);
    const checked = pending.filter((entry) => isChecked(entry));
    if (checked.length === 0) {
      return;
    }
    setError(null);
    setExtensionIssue(null);
    setImportFailures([]);

    const ping = await pingExtension();
    if (!ping.available) {
      setExtensionIssue('missing');
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
    const failures: { entry: RankedCandidate; reason: string }[] = [];
    try {
      for (let i = 0; i < checked.length; i += 1) {
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        const outcome = await importOne(checked[i].candidate, robotsCache, win.windowId);
        if (outcome.ok) {
          importedOk.push(checked[i]);
        } else {
          failures.push({ entry: checked[i], reason: outcome.reason });
        }
        setImportProgress({ done: importedOk.length, total: checked.length });
      }
    } finally {
      await closeSearchWindowViaExtension(win.windowId);
    }

    // Décisions écrites d'un coup : les importées seulement, comme retenues.
    const decisions = batchDecisions(importedOk);
    if (decisions.length > 0) {
      await recordDecisionsAction(decisions);
    }

    setDecided((current) => {
      const next = { ...current };
      for (const entry of importedOk) {
        next[entry.candidate.url] = 'accepted';
      }
      return next;
    });
    // Les échecs restent à trancher : nommés, relançables seuls.
    setImportFailures(failures);
    setImporting(false);
  }

  // §3 (revue) — « Retenir et importer » d'une carte de portail se fait EN PLACE,
  // comme le refus : un clic, l'import se fait (fenêtre one-off), la décision est
  // écrite, la carte quitte la liste. Aucune navigation, aucun formulaire à revalider.
  async function importFromPortal(candidate: CompetitorCandidate): Promise<string | null> {
    const ping = await pingExtension();
    if (!ping.available) {
      setExtensionIssue('missing');
      return 'l’extension ACM Studio n’a pas répondu';
    }
    const outcome = await importOne(candidate, new Map());
    if (!outcome.ok) {
      return outcome.reason;
    }
    await recordDecisionsAction([
      {
        url: candidate.url,
        decision: 'accepted',
        price: candidate.price,
        surfaceArea: candidate.surfaceArea,
        roomsCount: candidate.roomsCount,
        city: candidate.city,
        propertyType: candidate.propertyType,
      },
    ]);
    setDecided((current) => ({ ...current, [candidate.url]: 'accepted' }));
    // La carte quitte aussi l'affichage du portail (comme un refus la retire).
    setPortals((current) =>
      (current ?? []).map((portal) => ({
        ...portal,
        candidates: portal.candidates.filter((c) => c.url !== candidate.url),
      })),
    );
    return null;
  }

  // Relance d'UNE fiche en échec, seule (fenêtre one-off). Réussie → retenue.
  async function retryImportOne(entry: RankedCandidate) {
    setError(null);
    const ping = await pingExtension();
    if (!ping.available) {
      setExtensionIssue('missing');
      return;
    }
    setImporting(true);
    try {
      const outcome = await importOne(entry.candidate, new Map());
      if (outcome.ok) {
        await recordDecisionsAction([decisionOf(entry, 'accepted')]);
        setDecided((current) => ({ ...current, [entry.candidate.url]: 'accepted' }));
        setImportFailures((current) =>
          current.filter((f) => f.entry.candidate.url !== entry.candidate.url),
        );
      } else {
        setError(`« ${entry.candidate.title ?? entry.candidate.url} » : ${outcome.reason}.`);
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

  const checkedCount = undecided.filter((entry) => isChecked(entry)).length;

  const renderCard = (entry: RankedCandidate, position: number) => (
    <RankedCandidateCard
      key={entry.candidate.url}
      ranked={entry}
      position={position}
      selected={isChecked(entry)}
      onToggleSelect={() => toggleSelect(entry)}
      pending={busy}
      onDecision={(payload) => handleDecision(entry, payload)}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Mission 73 — la recherche Stream Estate est la recherche par défaut : bouton principal,
          en premier. Absent sans clé (décision Stream Estate), les portails restent alors seuls. */}
      {streamEstateAction ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => searchViaStreamEstate()}
            disabled={busy}
            className={btnPrimary}
          >
            {streamSearching ? 'Recherche en cours…' : STREAM_ESTATE_SEARCH_BUTTON}
          </button>
          <p className={hintText}>Critères : {criteriaLabel}</p>
        </div>
      ) : null}
      {/* Mission 69 — deux clics : ACM ouvre les portails déjà filtrés avec les caractéristiques
          du bien, puis lit tous les onglets d'un coup. Mission 73 : en secondaire, sous leur
          intitulé. */}
      <h3 className="font-title text-sm font-semibold text-zinc-800 stage:text-white">
        {streamEstateAction
          ? 'Ou chercher vous-même sur les portails'
          : 'Chercher vous-même sur les portails'}
      </h3>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={openMySearches} disabled={busy} className={btnSecondary}>
          {opening ? 'Ouverture…' : 'Ouvrir mes recherches'}
        </button>
        <button type="button" onClick={readAllMySearches} disabled={busy} className={btnSecondary}>
          {reading ? 'Lecture en cours…' : 'Lire mes recherches'}
        </button>
        {streamEstateAction ? null : <p className={hintText}>Critères : {criteriaLabel}</p>}
      </div>
      <p className={hintText}>
        « Ouvrir mes recherches » ouvre les portails déjà filtrés ; corrigez un filtre si besoin,
        puis « Lire mes recherches ».
      </p>
      {openedSearches ? (
        <div className={`${card} flex flex-col gap-2 p-4`}>
          <span className="font-title text-sm font-semibold text-zinc-800 stage:text-white">
            {openedSearches.opened > 0
              ? `${plural(openedSearches.opened, 'onglet ouvert', 'onglets ouverts')} à côté d’ACM`
              : 'Vos recherches sont déjà ouvertes dans vos onglets'}
          </span>
          {openedSearches.links.map((link) => (
            <div key={link.portal} className="flex flex-col gap-0.5 text-sm">
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer noopener"
                className={`${linkCls} hover:underline`}
              >
                {link.label}
                {link.needsPlace ? '' : ' — déjà filtré'}
              </a>
              {link.needsPlace ? (
                <span className="text-xs font-medium text-amber-700 stage:text-amber-300">
                  Première recherche à {openedSearches.city} sur {link.label} : réglez la commune
                  une fois, ACM s’en souviendra. Réglez aussi les filtres sur cet onglet.
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {waitingTabs.length > 0 ? (
        <p role="alert" className={alertError}>
          {waitingTabs.map((label) => `Cliquez une fois sur l’onglet ${label}`).join(' ; ')} —
          {waitingTabs.length > 1 ? ' ces pages sont restées' : ' sa page est restée'} sur l’écran
          d’attente du portail. Puis relancez « Lire mes recherches ».
        </p>
      ) : null}
      {streamNote
        ? (() => {
            // Mission 71 — la ligne de bilan : combien, à quel cran, et ce que la recherche a coûté
            // (l'API facture chaque annonce renvoyée, retenue ou non). Moins de 10 : pourquoi.
            const summary = describeStreamEstateSearch(ranked, streamNote);
            return (
              <div className={`${card} flex flex-col gap-1 p-3.5`}>
                <span className="font-title text-sm font-semibold text-zinc-800 stage:text-white">
                  {STREAM_ESTATE_LABEL} — {streamNote.communeName} ({streamNote.inseeCode})
                </span>
                <p className="text-sm font-medium text-zinc-800 stage:text-white">
                  {summary.headline}
                </p>
                {summary.details.map((line) => (
                  <p key={line} className={hintText}>
                    {line}
                  </p>
                ))}
                {/* Au plafond avant 10 : le conseiller décide de payer 20 annonces de plus. */}
                {canSearchMore(ranked, streamNote) ? (
                  <button
                    type="button"
                    onClick={() => searchViaStreamEstate(true)}
                    disabled={busy}
                    className={`${btnSecondary} mt-1 self-start px-3 py-1.5 text-sm`}
                  >
                    {streamSearching ? 'Recherche Stream Estate…' : MORE_LABEL}
                  </button>
                ) : null}
              </div>
            );
          })()
        : null}
      {readSummary.length > 0 ? (
        <div className={`${card} flex flex-col gap-1 p-3.5`}>
          <span className="font-title text-sm font-semibold text-zinc-800 stage:text-white">
            Vos recherches lues
          </span>
          {readSummary.map((line) => (
            <p key={line} className={hintText}>
              {line}
            </p>
          ))}
        </div>
      ) : null}
      {error ? (
        <p role="alert" className={alertError}>
          {error}
        </p>
      ) : null}
      {extensionIssue ? <ExtensionRequiredNotice reason={extensionIssue} /> : null}
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

      {/* Mission 61 — le desserrage est VISIBLE, et les écartés pour donnée absente sont DITS. */}
      {admissibility
        ? (() => {
            const L = admissibility.loosening;
            const ex = admissibility.excludedForMissing;
            const loosenParts: string[] = [];
            // Mission 68 — la tolérance RÉELLEMENT appliquée : « ±3 m² » quand le plancher
            // l'emporte sur le pourcentage, le pourcentage du cran sinon.
            if (L.surfaceLoosened) loosenParts.push(`${surfaceToleranceLabel(L)} de surface`);
            if (L.roomsLoosened) loosenParts.push('±1 pièce');
            const excludedLines = [
              ex.surface > 0 ? `${ex.surface} sans surface indiquée` : null,
              ex.rooms > 0 ? `${ex.rooms} sans nombre de pièces indiqué` : null,
              ex.price > 0 ? `${ex.price} sans prix indiqué` : null,
            ].filter((line): line is string => line != null);
            if (
              loosenParts.length === 0 &&
              excludedLines.length === 0 &&
              !admissibility.belowMinimum &&
              admissibility.newBuildAdded === 0 &&
              admissibility.newBuildHeld === 0
            )
              return null;
            return (
              <div className="flex flex-col gap-1.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
                {loosenParts.length > 0 ? (
                  <p>
                    Élargi à {loosenParts.join(' et ')}, faute de candidats dans les bornes serrées
                    (le prix et la commune ne bougent pas).
                  </p>
                ) : null}
                {admissibility.belowMinimum ? (
                  <p>
                    Trop peu de concurrents comparables ({admissibility.rankedCount}), même après le
                    dernier cran d’élargissement. On ne complète pas avec des biens hors bornes :
                    une liste courte et juste vaut mieux qu’une liste pleine et fausse.
                  </p>
                ) : null}
                {excludedLines.length > 0 ? (
                  <p>Écartées faute d’une donnée nécessaire : {excludedLines.join(' · ')}.</p>
                ) : null}
                {admissibility.newBuildAdded > 0 ? (
                  <p>
                    {plural(admissibility.newBuildAdded, 'bien neuf ajouté', 'biens neufs ajoutés')}{' '}
                    en fin de liste, faute de 3 concurrents dans l’ancien même après le dernier cran
                    d’élargissement.
                  </p>
                ) : null}
                {admissibility.newBuildHeld > 0 ? (
                  <p>
                    {plural(
                      admissibility.newBuildHeld,
                      'bien neuf non proposé',
                      'biens neufs non proposés',
                    )}{' '}
                    : le neuf ne vient qu’en complément, quand il reste moins de 3 concurrents dans
                    l’ancien.
                  </p>
                ) : null}
              </div>
            );
          })()
        : null}

      {/* Mission 71 §1 — le bouton d'import groupé est visible dès qu'un candidat est affiché,
          même quand le classement n'en garde aucun (il est alors désactivé). */}
      {showBatchImport(undecided, portals) ? (
        <div className="flex flex-col gap-2">
          {/* §8 — la validation en lot. Le bouton dit ce qu'il fait, avec le compte ;
              un lot qui écrit N fiches ne se déclenche pas derrière un libellé vague.
              L'avancement s'affiche pendant l'import (« 3 sur 8 »). */}
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
            Les cochées sont importées dans le dossier ; les autres restent dans la liste, sans être
            comptées comme écartées (pour écarter, « Écarter avec un motif »). Environ une seconde
            par fiche — rien n’est enregistré avant ce clic.
          </p>
        </div>
      ) : null}

      {undecided.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h3 className={formSectionTitle}>
            Concurrents proposés, du plus proche au plus éloigné ({undecided.length})
          </h3>
          <p className={hintText}>
            Les portails ne proposent que les annonces de la commune, dans votre fourchette de prix,
            avec le même nombre de pièces et une surface proche. Stream Estate commence par
            l’identique et n’élargit que s’il manque des biens ; chaque élargissement est écrit sur
            la carte. L’ordre suit le % de correspondance (secteur, surface, prix, pièces,
            stationnement, extérieur, puis état, étage, ascenseur, année, piscine, exposition) ; un
            critère non indiqué sort du calcul.
          </p>
          {sector ? (
            sector.status === 'located' ? (
              <p className={hintText}>Distances mesurées depuis « {sector.label} ».</p>
            ) : (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                {SECTOR_NEUTRAL_MESSAGES[sector.reason]}
              </p>
            )
          ) : null}
          {importFailures.length > 0 ? (
            <div className={`${card} flex flex-col gap-2 p-3.5`}>
              <span className="text-sm font-semibold text-amber-700 stage:text-amber-300">
                {importFailures.length} fiche{importFailures.length > 1 ? 's' : ''} n’
                {importFailures.length > 1 ? 'ont' : 'a'} pas pu être importée
                {importFailures.length > 1 ? 's' : ''} — les autres sont bien entrées.
              </span>
              {importFailures.map(({ entry, reason }) => (
                <div
                  key={entry.candidate.url}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <span className="min-w-0 text-zinc-700 stage:text-white/80">
                    {entry.candidate.title ?? entry.candidate.url}
                    {/* La cause réelle, visible sur la fiche en échec (pas seulement
                        dans la console) — mission 46 §2.4. */}
                    <span className="block text-xs text-amber-700 stage:text-amber-300">
                      Cause : {reason}.
                    </span>
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

          {/* Étape 2 — les 10 plus proches, numérotés dans l'ordre. */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((entry, index) => renderCard(entry, index + 1))}
          </div>

          {/* Le reste, dans le même ordre, derrière un clic : rien n'est supprimé. Seuls les 5
              premiers sont cochés d'office. */}
          {others.length > 0 ? (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setShowLessRelevant((value) => !value)}
                className={`${btnSecondary} self-start px-3 py-1.5 text-sm`}
              >
                {showLessRelevant
                  ? `Masquer les ${others.length} autre${others.length > 1 ? 's' : ''}`
                  : `Voir les ${others.length} autre${others.length > 1 ? 's' : ''}`}
              </button>
              {showLessRelevant ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {others.map((entry, index) => renderCard(entry, VISIBLE_CANDIDATES + index + 1))}
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
              onImport={importFromPortal}
              pending={busy}
            />
          ))
        : null}
    </div>
  );
}

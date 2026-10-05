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

import type { ImportAndCreateResult } from '@/features/competitor-search/actions/import-and-create-competitor';
import type { PrepareSearchResult } from '@/features/competitor-search/actions/prepare-competitor-search';
import type { PrepareOpenSearchesResult } from '@/features/competitor-search/actions/prepare-open-searches';
import type {
  RememberPortalPlacesInput,
  RememberPortalPlacesResult,
} from '@/features/competitor-search/actions/remember-portal-places';
import type { RankSearchResult } from '@/features/competitor-search/actions/rank-competitor-candidates';
import type { BatchDecision } from '@/features/competitor-search/actions/record-competitor-decisions';
import {
  closeSearchWindowViaExtension,
  openSearchTabsViaExtension,
  openSearchWindowViaExtension,
  pingExtension,
  readOpenTabViaExtension,
  readSearchTabsViaExtension,
  type OpenSearchTab,
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
import { surfaceToleranceLabel } from '@/features/competitor-search/services/describe-loosening';
import { detectSearchPortal } from '@/features/competitor-search/services/extract-search-results';
import { readPortalsSequentially } from '@/features/competitor-search/services/read-portals-sequentially';
import { readSearchPage } from '@/features/competitor-search/services/read-search-page';
import type { PortalSearchLink } from '@/features/competitor-search/services/build-portal-search-urls';
import type { FilteredSearchLink } from '@/features/competitor-search/services/build-filtered-search-urls';
import {
  describeReadCounts,
  readSearchPages,
} from '@/features/competitor-search/services/read-search-pages';
import {
  SEARCH_PORTAL_LABELS,
  type CompetitorCandidate,
  type ExcludedForMissing,
  type Loosening,
  type PortalSearchResult,
  type RankedCandidate,
  type RecordDecisionResult,
  type SearchResultsHtmlImport,
} from '@/features/competitor-search/types';

// Mission 61 — l'état d'admissibilité renvoyé par le classement, pour le bandeau.
type Admissibility = {
  loosening: Loosening;
  excludedForMissing: ExcludedForMissing;
  belowMinimum: boolean;
  target: number;
  minimum: number;
  rankedCount: number;
};

// Mission 65 — le portail d'un onglet ouvert, pour que le conseiller choisisse en lisant
// « SeLoger — Appartements à vendre – Nice », pas une adresse.
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
};

// Mission 69 — ce que l'écran dit après « Ouvrir mes recherches ».
type OpenedSearches = {
  city: string;
  links: FilteredSearchLink[];
  // null : l'extension n'a rien ouvert (absente ou trop ancienne) — les liens sont à ouvrir à la main.
  opened: number | null;
};

// Seuil de ressemblance : au-dessus, on affiche ; en dessous, on plie derrière
// « Voir les N autres, moins ressemblants ». On ne masque rien (mission 36) — un
// clic révèle tout —, on coupe seulement une liste trop longue à trancher.
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
          {candidate.surfaceArea != null ? ` · ${candidate.surfaceArea} m²` : ''}
          {candidate.roomsCount != null ? ` · ${candidate.roomsCount} pièces` : ''}
        </div>
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
  onPaste,
  onRetry,
  pending,
}: {
  portal: PortalSearchResult;
  onImport: (candidate: CompetitorCandidate) => Promise<string | null>;
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
            pageLabel="de résultats"
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
  prepareOpenAction,
  rememberPlacesAction,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // La recherche automatique demande l'extension ; absente, on ne dégrade PAS en
  // quatre collages (§10) — on le dit et on propose l'ajout manuel par adresse.
  const [extensionMissing, setExtensionMissing] = useState(false);
  const [portals, setPortals] = useState<PortalSearchResult[] | null>(null);
  const [searchLinks, setSearchLinks] = useState<PortalSearchLink[]>([]);
  // §1 (revue) — la fourchette du bien vendeur : la liste principale n'en sort pas.
  const [advisorRange, setAdvisorRange] = useState<{ min: number | null; max: number | null }>({
    min: null,
    max: null,
  });
  const [ranked, setRanked] = useState<RankedCandidate[]>([]);
  const [admissibility, setAdmissibility] = useState<Admissibility | null>(null);
  const [learnedNotes, setLearnedNotes] = useState<string[]>([]);
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
  // Mission 65 — « Lire ma recherche » : l'onglet que le conseiller a filtré lui-même.
  const [reading, setReading] = useState(false);
  // Plusieurs onglets de recherche ouverts : c'est le conseiller qui choisit.
  const [tabChoices, setTabChoices] = useState<OpenSearchTab[] | null>(null);
  // Repli sans extension (absente, ou trop ancienne pour lire un onglet) : le collage.
  const [pasteFallback, setPasteFallback] = useState<'missing' | 'outdated' | null>(null);
  // Ce qui vient d'être lu, dit tel quel (« SeLoger : 30 annonces lues… »).
  const [readNote, setReadNote] = useState<string | null>(null);
  // Mission 69 — onglets ouverts, récapitulatif par portail, onglets restés sur l'écran d'attente.
  const [opening, setOpening] = useState(false);
  const [openedSearches, setOpenedSearches] = useState<OpenedSearches | null>(null);
  const [readSummary, setReadSummary] = useState<string[]>([]);
  const [waitingTabs, setWaitingTabs] = useState<string[]>([]);
  const busy = pending || searching || importing || reading || opening;

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

  const defaultChecked = (entry: RankedCandidate): boolean =>
    inMainList(entry) && entry.candidate.propertyType != null;
  const isChecked = (entry: RankedCandidate): boolean =>
    selection[entry.candidate.url] ?? defaultChecked(entry);
  const toggleSelect = (entry: RankedCandidate) =>
    setSelection((current) => ({ ...current, [entry.candidate.url]: !isChecked(entry) }));

  // Reclasse (serveur, avec l'apprentissage) après toute mise à jour de la liste des
  // portails — recherche, relance d'un portail, collage. Le classement est la seule
  // vue « du plus au moins ressemblant » ; sans reclassement, une carte collée ou
  // relancée n'y entrerait pas.
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
      });
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
        setAdmissibility(null);
        setLearnedNotes([]);
        return;
      }
      setSearchLinks(prep.links);
      setAdvisorRange({
        min: prep.criteria.advisorPriceMin,
        max: prep.criteria.advisorPriceMax,
      });

      const ping = await pingExtension();
      if (!ping.available) {
        setExtensionMissing(true);
        setPortals(null);
        setRanked([]);
        setAdmissibility(null);
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
      setSelection({});
      setImportProgress(null);
      setImportFailures([]);
      await refreshRanking(read);
    } finally {
      setSearching(false);
    }
  }

  // Mission 65 — une page de résultats filtrée PAR LE CONSEILLER (onglet lu par l'extension,
  // ou code collé) suit le même chemin que la recherche automatique : lecture des cartes,
  // neuf et doublons écartés, puis classement serveur avec les quatre filtres (M61). Elle
  // remplace le résultat du même portail et laisse les autres en place.
  async function integrateSearchPage(html: string, pageUrl: string | null) {
    const read = readSearchPage(html, pageUrl);
    if (!read.ok) {
      setError(
        read.reason === 'unknown_portal'
          ? 'Portail non reconnu. Ouvrez une page de résultats SeLoger, Bien’ici, Green Acres ou Maisons et Appartements.'
          : 'Aucune annonce détectée sur cette page. Vérifiez qu’il s’agit bien d’une page de résultats SeLoger, Bien’ici, Green Acres ou Maisons et Appartements, avec la liste affichée.',
      );
      return;
    }
    const prep = await prepareAction();
    if (!prep.ok) {
      setError(prep.error);
      return;
    }
    setSearchLinks(prep.links);
    setAdvisorRange({ min: prep.criteria.advisorPriceMin, max: prep.criteria.advisorPriceMax });
    const excluded = [
      read.excludedNewBuild > 0
        ? plural(read.excludedNewBuild, 'programme neuf écarté', 'programmes neufs écartés')
        : null,
      read.excludedDuplicates > 0
        ? plural(read.excludedDuplicates, 'doublon écarté', 'doublons écartés')
        : null,
    ].filter((part): part is string => part != null);
    setReadNote(
      `${read.portal.label} : ${plural(read.cardsRead, 'annonce lue', 'annonces lues')} sur votre page${
        excluded.length > 0 ? ` (${excluded.join(', ')})` : ''
      }. Seules celles qui correspondent au bien de votre client sont proposées ci-dessous.`,
    );
    setPasteFallback(null);
    const others = (portals ?? []).filter((portal) => portal.portal !== read.portal.portal);
    await refreshRanking([...others, read.portal]);
    // Mission 69 — une recherche faite à la main apprend l'identifiant de sa commune (si les
    // cartes la confirment). Un échec n'interrompt rien.
    if (pageUrl != null) {
      await rememberPlacesAction([
        { url: pageUrl, cardCities: read.portal.candidates.map((candidate) => candidate.city) },
      ]).catch(() => undefined);
    }
  }

  // Mission 69 — « Ouvrir mes recherches » : le serveur construit les adresses filtrées depuis le
  // bien vendeur, l'extension les ouvre dans des onglets visibles. Sans extension (ou trop
  // ancienne), les mêmes liens restent à ouvrir à la main.
  async function openMySearches() {
    setError(null);
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
        setOpenedSearches({ city: prep.city, links: prep.links, opened: null });
        return;
      }
      const opened = await openSearchTabsViaExtension(prep.links.map((link) => link.url));
      if (!opened.ok && opened.reason === 'error') {
        setError('Les onglets n’ont pas pu s’ouvrir. Réessayez, ou ouvrez les liens ci-dessous.');
      }
      setOpenedSearches({
        city: prep.city,
        links: prep.links,
        opened: opened.ok ? opened.opened : null,
      });
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
    setExtensionMissing(false);
    setPasteFallback(null);
    setTabChoices(null);
    setReadNote(null);
    setReadSummary([]);
    setWaitingTabs([]);
    setReading(true);
    try {
      const ping = await pingExtension();
      if (!ping.available) {
        setPasteFallback('missing');
        return;
      }
      const result = await readSearchTabsViaExtension();
      if (!result.ok) {
        if (result.reason === 'outdated') {
          setPasteFallback('outdated');
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
      setSearchLinks(prep.links);
      setAdvisorRange({ min: prep.criteria.advisorPriceMin, max: prep.criteria.advisorPriceMax });
      setDecided({});
      setSelection({});
      setImportProgress(null);
      setImportFailures([]);
      const rank = await refreshRanking(read.portals);
      if (rank.ok) {
        setReadSummary(describeReadCounts(read.counts, rank.ranked));
      }
      await rememberPlacesAction(read.learnInput).catch(() => undefined);
    } finally {
      setReading(false);
    }
  }

  // « Lire ma recherche » : AUCUNE requête au portail — l'extension lit l'onglet tel qu'il
  // est affiché. `tabId` = l'onglet choisi quand plusieurs recherches sont ouvertes.
  async function readMySearch(tabId?: number) {
    setError(null);
    setExtensionMissing(false);
    setPasteFallback(null);
    setTabChoices(null);
    setReadNote(null);
    setReading(true);
    try {
      const ping = await pingExtension();
      if (!ping.available) {
        setPasteFallback('missing');
        return;
      }
      const result = await readOpenTabViaExtension(tabId);
      if (!result.ok) {
        if (result.reason === 'outdated') {
          setPasteFallback('outdated');
        } else if (result.reason === 'none') {
          setError(
            'Aucun onglet de recherche ouvert sur SeLoger, Bien’ici, Green Acres ou Maisons et Appartements. Faites votre recherche filtrée sur le portail, laissez l’onglet ouvert et affiché au moins une fois, puis cliquez à nouveau.',
          );
        } else {
          setError('L’onglet n’a pas pu être lu. Réaffichez-le un instant, puis réessayez.');
        }
        return;
      }
      if (result.kind === 'choose') {
        setTabChoices(result.tabs);
        return;
      }
      await integrateSearchPage(result.html, result.finalUrl);
    } finally {
      setReading(false);
    }
  }

  // Repli sans extension : le code de la page de résultats, collé. Pas d'adresse — le
  // portail est reconnu aux marqueurs de ses cartes.
  async function handleSearchPaste(html: string) {
    setError(null);
    setReadNote(null);
    setReading(true);
    try {
      await integrateSearchPage(html, null);
    } finally {
      setReading(false);
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
    // Le type lu sur la CARTE de recherche voyage jusqu'à la création : la page
    // d'annonce ne le porte pas de façon fiable, la carte oui.
    const result = await importAction(url, read.html, candidate.propertyType);
    if (!result.ok) {
      console.warn(`[import] ${url} — ${result.error}`);
      return { ok: false, reason: result.error };
    }
    return { ok: true };
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

  // §3 (revue) — « Retenir et importer » d'une carte de portail se fait EN PLACE,
  // comme le refus : un clic, l'import se fait (fenêtre one-off), la décision est
  // écrite, la carte quitte la liste. Aucune navigation, aucun formulaire à revalider.
  async function importFromPortal(candidate: CompetitorCandidate): Promise<string | null> {
    const ping = await pingExtension();
    if (!ping.available) {
      setExtensionMissing(true);
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
      setExtensionMissing(true);
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

  const undecided = ranked.filter((entry) => decided[entry.candidate.url] == null);
  // Liste principale = dans la fourchette (ou, à défaut de fourchette, au-dessus du
  // seuil) ; le reste bascule dans le repli. Rien n'est perdu — un clic révèle tout.
  const relevant = undecided.filter((entry) => inMainList(entry));
  const lessRelevant = undecided.filter((entry) => !inMainList(entry));

  const checkedCount = undecided.filter((entry) => isChecked(entry)).length;

  const renderCard = (entry: RankedCandidate) => (
    <RankedCandidateCard
      key={entry.candidate.url}
      ranked={entry}
      selected={isChecked(entry)}
      onToggleSelect={() => toggleSelect(entry)}
      pending={busy}
      onDecision={(payload) => handleDecision(entry, payload)}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Mission 69 — deux clics : ACM ouvre les portails déjà filtrés avec les caractéristiques
          du bien, puis lit tous les onglets d'un coup. La lecture d'un seul onglet (mission 65)
          reste possible. La recherche automatique reste disponible, en second. */}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={openMySearches} disabled={busy} className={btnPrimary}>
          {opening ? 'Ouverture…' : 'Ouvrir mes recherches'}
        </button>
        <button type="button" onClick={readAllMySearches} disabled={busy} className={btnPrimary}>
          {reading ? 'Lecture en cours…' : 'Lire mes recherches'}
        </button>
        <button
          type="button"
          onClick={() => readMySearch()}
          disabled={busy}
          className={`${btnSecondary} px-3 py-1.5 text-sm`}
        >
          Lire un seul onglet
        </button>
        <p className={hintText}>Critères : {criteriaLabel}</p>
      </div>
      <p className={hintText}>
        « Ouvrir mes recherches » ouvre les quatre portails, déjà filtrés avec le type, la commune,
        les pièces, la surface et votre fourchette. Corrigez un filtre sur le portail si besoin,
        puis « Lire mes recherches ».
      </p>
      {openedSearches ? (
        <div className={`${card} flex flex-col gap-2 p-4`}>
          <span className="font-title text-sm font-semibold text-zinc-800 stage:text-white">
            {openedSearches.opened != null
              ? openedSearches.opened > 0
                ? `${plural(openedSearches.opened, 'onglet ouvert', 'onglets ouverts')} à côté d’ACM`
                : 'Vos recherches sont déjà ouvertes dans vos onglets'
              : 'Ouvrez vos recherches (l’extension ACM Studio 0.3.0 les ouvre en un clic)'}
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
      {tabChoices ? (
        // Plusieurs recherches ouvertes : on ne devine pas laquelle, le conseiller choisit.
        <div className={`${card} flex flex-col gap-2 p-4`}>
          <span className="font-title text-sm font-semibold text-zinc-800 stage:text-white">
            Plusieurs recherches sont ouvertes — laquelle lire ?
          </span>
          {tabChoices.map((tab) => (
            <button
              key={tab.tabId}
              type="button"
              onClick={() => readMySearch(tab.tabId)}
              disabled={busy}
              className={`${btnSecondary} justify-start px-3 py-1.5 text-left text-sm`}
            >
              {tabPortalLabel(tab)} — {tab.title.trim() !== '' ? tab.title : tab.url}
            </button>
          ))}
        </div>
      ) : null}
      {pasteFallback ? (
        // Critère 4 — sans extension, le collage de la page de résultats reste le repli.
        <div className={`${card} flex flex-col gap-2 p-4`}>
          <span className="font-title text-sm font-semibold text-zinc-800 stage:text-white">
            {pasteFallback === 'missing'
              ? 'L’extension ACM Studio n’a pas répondu — collez votre page de résultats'
              : 'Votre extension ACM Studio est trop ancienne pour lire un onglet — collez votre page de résultats'}
          </span>
          <p className={hintText}>
            {pasteFallback === 'outdated'
              ? 'Mettez l’extension à jour (version 0.2.0) pour lire l’onglet en un clic. En attendant, '
              : 'Sans l’extension, '}
            le repli est le collage : sur l’onglet de votre recherche filtrée, copiez la page de
            résultats et collez-la ci-dessous. Le portail est reconnu tout seul.
          </p>
          <ListingPasteZone
            onPaste={({ html, text }) => handleSearchPaste(html.trim() !== '' ? html : text)}
            disabled={busy}
            pageLabel="de résultats"
          />
        </div>
      ) : null}
      {readNote ? <p className={hintText}>{readNote}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={runSearch} disabled={busy} className={btnSecondary}>
          {searching ? 'Recherche en cours…' : 'Lancer la recherche automatique'}
        </button>
        <p className={hintText}>
          En second : elle ne lit que la première page, non filtrée, de chaque portail.
        </p>
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
        « Lire mes recherches » et « Lire un seul onglet » lisent vos onglets de recherche tels
        qu’ils sont affichés, via l’extension ACM Studio (chaque onglet est affiché un instant, le
        temps que sa page se construise) : aucune nouvelle requête n’est envoyée au portail. Sans
        l’extension, le repli est le collage de la page de résultats. La recherche automatique
        interroge Green Acres, SeLoger, Bien’ici et Maisons et Appartements ; un portail qui refuse
        la lecture reste accessible : ouvrez sa recherche, copiez le code de la page de résultats et
        collez-le. Chaque suggestion reste à retenir ou à écarter — rien n’est enregistré sans votre
        validation.
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
              !admissibility.belowMinimum
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
              </div>
            );
          })()
        : null}

      {undecided.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h3 className={formSectionTitle}>
            Concurrents proposés, du plus au moins ressemblant ({undecided.length})
          </h3>
          <p className={hintText}>
            Seules les annonces de la commune, dans votre fourchette de prix, avec le même nombre de
            pièces et une surface proche sont proposées ; tout élargissement est signalé. Le
            pourcentage mesure la ressemblance avec le bien de votre client.
          </p>
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

          {/* Les plus ressemblants (≥ seuil). Si tout est en dessous du seuil, on
              affiche quand même le premier groupe vide-mains via lessRelevant. */}
          {relevant.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {relevant.map(renderCard)}
            </div>
          ) : (
            <p className={hintText}>
              {hasRange
                ? 'Aucun candidat dans votre fourchette de prix. Les propositions ci-dessous sont hors fourchette — à vous de juger.'
                : 'Aucun candidat au-dessus du seuil de ressemblance. Les propositions ci-dessous sont plus éloignées — à vous de juger.'}
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
                  ? hasRange
                    ? 'Masquer les biens hors fourchette'
                    : 'Masquer les moins ressemblants'
                  : hasRange
                    ? `Voir les ${lessRelevant.length} autre${lessRelevant.length > 1 ? 's' : ''}, hors de votre fourchette`
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
              onImport={importFromPortal}
              onPaste={handlePaste}
              onRetry={handleRetry}
              pending={busy}
            />
          ))
        : null}
    </div>
  );
}

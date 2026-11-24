'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  alertError,
  alertOk,
  badgeBrand,
  badgeNeutral,
  btnPrimary,
  btnSecondary,
  card,
  hintText,
  link,
  sectionTitle,
} from '@/components/ui/styles';
import { pingExtension } from '@/features/browser-extension/client';
import { missingExtensionIssue } from '@/features/browser-extension/extension-issue';
import {
  ExtensionRequiredNotice,
  type ExtensionIssue,
} from '@/features/browser-extension/extension-required-notice';
import { listingPayload } from '@/features/competitor-search/services/listing-payload';
import { runPaidSearch } from '@/features/competitor-search/services/paid-search-guard';
import { readPageViaExtension } from '@/features/competitor-search/services/read-page-via-extension';
import { resumeMemory } from '@/features/competitor-search/services/stream-estate-summary';
import { useDemoMode } from '@/features/demo/components/demo-mode-provider';
import { undoDismissal } from '@/features/buyer-dismissals/actions/dismiss';
import { DismissControl } from '@/features/buyer-dismissals/components/dismiss-control';
import { dismissalKey } from '@/features/buyer-dismissals/services/dismissal-key';
import {
  countSeen,
  currentSeenLabel,
  isClosedForBuyer,
  seenLine,
  type CurrentSeenReason,
} from '@/features/buyers/services/seen-properties';
import { importIdealListing } from '@/features/ideal-properties/actions/import-ideal-listing';
import { saveIdealSelection } from '@/features/ideal-properties/actions/save-ideal-selection';
import {
  searchIdealProperties,
  type IdealSearchResult,
} from '@/features/ideal-properties/actions/search-ideal-properties';
import {
  excludedLine,
  toVerifyLabels,
  type CategorizedCandidate,
} from '@/features/ideal-properties/services/categorize-ideal';
import { idealLabel } from '@/features/ideal-properties/services/ideal-label';
import { SoftBanner, SoftWhy } from '@/features/soft-ranking/components/soft-why';
import {
  orderBySoftScore,
  orderWithinGroups,
  reasonsOfRanking,
  softScore,
  whySummary,
} from '@/features/soft-ranking/services/judgments';
import type { SimpleReason, SoftReasons, SoftRanking } from '@/features/soft-ranking/types';
import { idealPageLayout, selectionKey } from '@/features/ideal-properties/services/ideal-page';
import type { SelectionItemInput } from '@/features/ideal-properties/services/ideal-selection';
import {
  seenOnLabel,
  selectionChanged,
  SELECTION_TOO_MANY,
} from '@/features/ideal-properties/services/ideal-selection-labels';
import {
  IDEAL_CATEGORIES,
  IDEAL_CATEGORY_HINTS,
  IDEAL_CATEGORY_LABELS,
  MAX_IDEAL_SELECTION,
  type IdealCategory,
} from '@/features/ideal-properties/types';
import {
  BUYER_GROUP_LABELS,
  BUYER_GROUPS,
  type BuyerHit,
  type BuyerReconciliation,
} from '@/features/meeting-conclusion/services/buyer-reconciliation';
import { PropertySheetView } from '@/features/property-sheet/components/property-sheet-view';
import { usePropertySheet } from '@/features/property-sheet/components/use-property-sheet';
import {
  buildPropertySheet,
  sheetFromCandidate,
} from '@/features/property-sheet/services/property-sheet';
import { sheetFactsFromSelectionListing } from '@/features/property-sheet/services/sheet-sources';
import type { CompetitorCandidate } from '@/features/competitor-search/types';
import { formatEuro } from '@/lib/format';
import { displayPhotoUrl } from '@/lib/photo-url';

// Mission 118 (partie B) — « Trouver les biens idéaux », sur un seul écran, réservé au conseiller :
//   1. ce que l'agence a déjà — le rapprochement de M86, gratuit, rendu d'abord ;
//   2. le marché — la recherche Stream Estate déduite de la fiche, payante : avertissement avant,
//      le ping de l'extension d'abord (M93), « Chercher encore » au plafond ; simulée en démo (M114) ;
//   3. la sélection : jusqu'à trois biens cochés, « Retenir la sélection ».
// Une recherche n'est pas une disponibilité : « affiché le », jamais « disponible ».

// Lancement, mission 5 — sans montant : la recherche compte dans le forfait de l'agence.
export const PAID_MARKET_WARNING =
  'Recherche sur le marché, comptée dans le forfait du mois. Les critères sont ceux de la fiche.';
export const MARKET_BUTTON = 'Trouver sur le marché';
export const RETAIN_BUTTON = 'Retenir la sélection';

type Market = IdealSearchResult & { ok: true };

const keyOf = selectionKey;

// Le rang d'un bien dans son groupe (« Pourquoi 2e »), une fois la liste rangée.
function withRanks<T>(
  items: readonly T[],
  groupOf: (item: T) => string,
): { item: T; rank: number }[] {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const rank = (seen.get(groupOf(item)) ?? 0) + 1;
    seen.set(groupOf(item), rank);
    return { item, rank };
  });
}

const softScoreOfReasons = (reasons: SoftReasons | undefined): number =>
  reasons && 'judgments' in reasons ? softScore(reasons.judgments) : 0;

// Mission 152 (partie B) — un toucher sur le libellé ou la photo ouvre la fiche complète.
const openSheetLink =
  'text-left font-title text-base font-bold text-zinc-900 underline-offset-2 hover:text-brand-deep hover:underline focus-visible:underline stage:text-white';

const dayLabel = (day: string): string => {
  const [, month, date] = day.split('-');
  return `${date}/${month}`;
};

const CATEGORY_TONE: Record<IdealCategory, string> = {
  strong:
    'border-emerald-200 bg-emerald-50 text-emerald-800 stage:border-emerald-400/30 stage:bg-emerald-500/10 stage:text-emerald-200',
  compromise:
    'border-amber-200 bg-amber-50 text-amber-800 stage:border-amber-400/30 stage:bg-amber-500/10 stage:text-amber-200',
  explore:
    'border-sky-200 bg-sky-50 text-sky-800 stage:border-sky-400/30 stage:bg-sky-500/10 stage:text-sky-200',
};

function agencyItem(hit: BuyerHit): SelectionItemInput {
  const { candidate } = hit;
  const competitor = candidate.group === 'competitor';
  return {
    source: competitor ? 'competitor' : 'project',
    reference: competitor ? candidate.key.replace(/^competitor:/, '') : candidate.projectId,
    label: idealLabel(candidate),
    listedPrice: candidate.price,
    category: 'agency',
    gaps: [hit.note, hit.condominiumNote].filter((part): part is string => part != null),
    snapshot: null,
  };
}

function marketItem(entry: CategorizedCandidate, seenOn: string | null = null): SelectionItemInput {
  const { candidate } = entry;
  return {
    seenOn,
    source: 'listing',
    reference: candidate.url,
    label: idealLabel(candidate),
    listedPrice: candidate.price,
    category: entry.category,
    gaps: [...entry.gaps, ...toVerifyLabels(entry)],
    snapshot: candidate as unknown as Record<string, unknown>,
  };
}

export function IdealPropertiesPanel({
  buyerId,
  agency,
  marketReady,
  marketBlocked,
  budgetWarning,
  current = [],
  presented = false,
  watch = null,
  dismissed = [],
  seen = [],
  currentSeen = {},
  mandatesUnread = false,
  buyerName = null,
  budgetMax = null,
  savedItemIds = {},
  softLabels = [],
  softOpen = false,
  agencyMentions = {},
  watchReasons = {},
}: {
  // Mission 151 (partie B) — ce qui compte pour eux (planches 4 et 4 b) : les critères doux de la
  // fiche, en mots ; vide, rien ne change. `softOpen` : la lecture par l'IA est ouverte pour
  // l'agence ; `agencyMentions` : les mots trouvés dans les biens de l'agence avant la recherche
  // (classement simplifié) ; `watchReasons` : ce que la veille a jugé la nuit.
  softLabels?: string[];
  softOpen?: boolean;
  agencyMentions?: Record<string, string[]>;
  watchReasons?: Record<string, SoftReasons>;
  buyerId: string;
  // Mission 152 (partie B) — pour la barre de la fiche complète (« Pour M. et Mme Arnaud ») et
  // l'écart au budget.
  buyerName?: string | null;
  budgetMax?: number | null;
  // Les biens de la sélection enregistrée (`source:reference` → leur ligne), pour lire leur fiche
  // au serveur.
  savedItemIds?: Record<string, string>;
  agency: BuyerReconciliation;
  // Essai de Jean-Guy (26/10) : la sélection actuelle, cochée en arrivant.
  current?: SelectionItemInput[];
  // Sa présentation est terminée : le bandeau propose de la revoir.
  presented?: boolean;
  // La fiche permet la recherche du marché (un type, une commune) ; sinon la raison.
  marketReady: boolean;
  marketBlocked: string | null;
  budgetWarning: string | null;
  // Mission 136 — ce que la veille a trouvé cette semaine : le jour du passage, ses biens rangés.
  watch?: { seenOn: string; entries: CategorizedCandidate[] } | null;
  // Mission 139 — ce que le conseiller a écarté pour lui (la clé de chaque bien) ; null : la
  // lecture a échoué (M98).
  dismissed?: string[] | null;
  // Lancement, mission 3 — ce qu'il a déjà vu (envoyé, visité, refusé), par la clé de chaque
  // bien : jamais reproposé dans les listes ; la sélection actuelle, elle, reste dans son bandeau.
  seen?: { key: string; reason: 'sent' | 'visited' | 'refused' }[];
  // Ce qu'il a dit des biens de sa sélection actuelle (`source:reference` → refusé, écarté, visité) :
  // un bien refusé ou écarté n'y est plus coché et ne se recoche pas.
  currentSeen?: Record<string, CurrentSeenReason>;
  // Mission 145 — les offres de l'agence n'ont pas pu être lues : aucun mandat n'est proposé, et
  // l'écran le dit (M98).
  mandatesUnread?: boolean;
}) {
  const demo = useDemoMode();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [searching, setSearching] = useState(false);
  const [market, setMarket] = useState<Market | null>(null);
  // Mission 151 (partie B) — le classement reçu avec la recherche : son état (complet ou
  // simplifié, et pourquoi) et, par bien, ses raisons.
  const [rankState, setRankState] = useState<
    { mode: 'full' } | { mode: 'simple'; reason: SimpleReason }
  >({ mode: 'simple', reason: softOpen ? 'before' : 'closed' });
  const [reasons, setReasons] = useState<Record<string, SoftReasons>>({});
  const [error, setError] = useState<string | null>(null);
  const [extensionIssue, setExtensionIssue] = useState<ExtensionIssue | null>(null);
  // Lancement, mission 3 — un bien de sa sélection qu'il a refusé, ou écarté pour lui, n'est plus
  // coché en arrivant : la prochaine sélection ne le reprend pas.
  const closed = (item: SelectionItemInput) => isClosedForBuyer(currentSeen[keyOf(item)]);
  const [selected, setSelected] = useState<Map<string, SelectionItemInput>>(
    () => new Map(current.filter((item) => !closed(item)).map((item) => [keyOf(item), item])),
  );
  // La sélection enregistrée : « Retenir » ne s'active que si la sélection cochée en diffère.
  const [baseline, setBaseline] = useState<SelectionItemInput[]>(current);
  const changed = selectionChanged([...selected.values()], baseline);
  // Mission 146 (partie B) — un seul plein : « Retenir » quand la sélection cochée change, sinon
  // « Présenter » une sélection retenue ; la recherche payante reste en contour.
  const retainLeads = changed && selected.size > 0;
  const [saving, startSaving] = useTransition();
  // Mission 139 — écartés : cachés aussitôt ; ceux de cette visite de la page s'annulent encore.
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(dismissed ?? []));
  const [justDismissed, setJustDismissed] = useState<{ key: string; label: string }[]>([]);
  const [undoError, setUndoError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [importNote, setImportNote] = useState<string | null>(null);
  // Mission 152 (partie B) — la fiche complète ouverte, et le bien qu'elle retient.
  const sheet = usePropertySheet();
  const [sheetItem, setSheetItem] = useState<{
    item: SelectionItemInput;
    rankLine: string | null;
  } | null>(null);
  const closeSheet = () => {
    sheet.close();
    setSheetItem(null);
  };
  // Fiche ouverte : son « Retenir ce bien » est le seul plein de l'écran (M146).
  const pageLeads = sheetItem == null;
  // Une annonce que l'écran a déjà (la recherche, la veille, la sélection) s'ouvre sur place ;
  // un bien de l'agence se lit au serveur.
  const openMarketSheet = (
    item: SelectionItemInput,
    candidate: CompetitorCandidate,
    seenOn: string | null,
    rankLine: string | null,
  ) => {
    setSheetItem({ item, rankLine });
    sheet.openSheet(sheetFromCandidate(candidate, item.label, seenOn));
  };
  const openAgencySheet = (item: SelectionItemInput, rankLine: string | null) => {
    setSheetItem({ item, rankLine });
    sheet.openTarget({
      kind: item.source === 'competitor' ? 'competitor' : 'project',
      id: item.reference,
    });
  };
  // Un bien de la sélection enregistrée se lit au serveur, la même fiche que sur la fiche
  // acquéreur (ce que l'import a lu compris) ; un bien seulement coché, d'après ce que la recherche
  // en a dit, relu champ par champ (jamais une forme supposée).
  const openItemSheet = (item: SelectionItemInput) => {
    const itemId = savedItemIds[keyOf(item)];
    setSheetItem({ item, rankLine: null });
    if (itemId) {
      sheet.openTarget({ kind: 'selection-item', id: itemId });
      return;
    }
    if (item.source !== 'listing') {
      openAgencySheet(item, null);
      return;
    }
    sheet.openSheet(
      buildPropertySheet(
        sheetFactsFromSelectionListing({
          label: item.label,
          reference: item.reference,
          listedPrice: item.listedPrice,
          priceSeenOn: item.seenOn ?? null,
          imported: null,
          snapshot: item.snapshot,
        }),
      ),
    );
  };

  const detect = demo ? async () => ({ available: true }) : () => pingExtension();

  const search = async (more: boolean) => {
    setConfirming(false);
    setError(null);
    setExtensionIssue(null);
    setSearching(true);
    try {
      const resume =
        more && market?.cursor
          ? { cursor: market.cursor, memory: resumeMemory(market.portal.candidates, null) }
          : null;
      const agencyKeys = resume
        ? []
        : BUYER_GROUPS.flatMap((group) => agency.matches[group].map((hit) => hit.candidate.key));
      const outcome = await runPaidSearch(detect, () =>
        searchIdealProperties(buyerId, resume, agencyKeys),
      );
      if (!outcome.ran) {
        setExtensionIssue(missingExtensionIssue());
        return;
      }
      const result = outcome.result;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      absorbRanking(result.ranking, more);
      if (more && market) {
        // « Chercher encore » : les biens de plus s'ajoutent, le coût se cumule ; dans chaque
        // catégorie, anciens et nouveaux se rangent ensemble — ce qui compte pour eux, puis le %,
        // puis le prix (Jean-Guy, 12/11).
        const candidates = [...market.portal.candidates, ...result.portal.candidates];
        const combined = {
          ...reasons,
          ...(result.ranking ? reasonsOfRanking(result.ranking) : {}),
        };
        const together = (category: IdealCategory) =>
          orderBySoftScore(
            [
              ...market.categorized.byCategory[category],
              ...result.categorized.byCategory[category],
            ].sort(
              (a, b) =>
                (b.percent ?? -1) - (a.percent ?? -1) ||
                (a.candidate.price ?? Number.MAX_SAFE_INTEGER) -
                  (b.candidate.price ?? Number.MAX_SAFE_INTEGER),
            ),
            (entry) => softScoreOfReasons(combined[entry.candidate.url]),
          );
        const merged: Market = {
          ...result,
          portal: { ...result.portal, candidates },
          billed: market.billed + result.billed,
          categorized: {
            byCategory: {
              strong: together('strong'),
              compromise: together('compromise'),
              explore: together('explore'),
            },
            excluded: {
              count: market.categorized.excluded.count + result.categorized.excluded.count,
              reasons: result.categorized.excluded.reasons,
            },
          },
        };
        setMarket(merged);
      } else {
        setMarket(result);
      }
    } finally {
      setSearching(false);
    }
  };

  const absorbRanking = (ranking: SoftRanking | null, more: boolean) => {
    if (ranking == null) return;
    const received = reasonsOfRanking(ranking);
    setReasons((current) => (more ? { ...current, ...received } : received));
    // « Chercher encore » : un classement simplifié ce jour-là se dit, même après un complet —
    // le bandeau ne dit jamais « Rangés par » pour des cartes qui n'ont que les mots trouvés.
    if (!more || ranking.mode === 'simple') {
      setRankState(
        ranking.mode === 'full' ? { mode: 'full' } : { mode: 'simple', reason: ranking.reason },
      );
    }
  };
  // Les raisons d'un bien : celles du classement ; en classement complet, un bien sans texte
  // « ne dit rien » ; avant la recherche, les mots trouvés au chargement (agence) ou par la veille.
  const reasonsOf = (key: string, before?: SoftReasons): SoftReasons | undefined => {
    if (softLabels.length === 0) return undefined;
    return reasons[key] ?? (rankState.mode === 'full' ? { noText: true } : before);
  };
  const scoreOf = (key: string): number => {
    const found = reasons[key];
    return found && 'judgments' in found ? softScore(found.judgments) : 0;
  };

  const toggle = (item: SelectionItemInput) => {
    setSaved(null);
    setSelected((current) => {
      const next = new Map(current);
      const key = keyOf(item);
      if (next.has(key)) next.delete(key);
      else if (next.size < MAX_IDEAL_SELECTION) next.set(key, item);
      return next;
    });
  };
  const full = selected.size >= MAX_IDEAL_SELECTION;

  const retain = () => {
    setError(null);
    setImportNote(null);
    startSaving(async () => {
      const result = await saveIdealSelection(
        buyerId,
        [...selected.values()],
        market?.seenOn ?? null,
      ).catch(() => ({
        ok: false as const,
        error: 'La sélection n’a pas pu être enregistrée. Réessayez.',
      }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(
        `Sélection retenue : ${result.selection.items.length} bien${result.selection.items.length > 1 ? 's' : ''}.`,
      );
      setBaseline([...selected.values()]);
      // Les annonces du marché retenues s'importent comme des concurrents, par l'extension.
      if (result.toImport.length > 0) {
        let imported = 0;
        const robotsCache = new Map();
        for (const { itemId, url } of result.toImport) {
          setImportNote(`Import des annonces retenues… ${imported} sur ${result.toImport.length}`);
          const read = await readPageViaExtension(url, { robotsCache }).catch(() => null);
          if (read?.ok) {
            const done = await importIdealListing(
              itemId,
              listingPayload(url, read.html, null),
            ).catch(() => ({ ok: false as const }));
            if (done.ok) imported += 1;
          }
        }
        setImportNote(
          imported === result.toImport.length
            ? `${imported} annonce${imported > 1 ? 's' : ''} importée${imported > 1 ? 's' : ''}.`
            : `${imported} annonce${imported > 1 ? 's' : ''} importée${imported > 1 ? 's' : ''} sur ${result.toImport.length} ; les autres gardent les données de la recherche.`,
        );
      }
      router.refresh();
    });
  };

  // La clé du bien, celle de la boucle (M134) : une annonce par son identité publiée.
  const targetKey = (item: SelectionItemInput, listingUrl: string | null): string =>
    dismissalKey(
      item.source === 'project'
        ? { source: 'project', projectId: item.reference }
        : item.source === 'competitor'
          ? { source: 'competitor', competitorId: item.reference, listingUrl }
          : { source: 'listing', url: item.reference },
    );
  const isHidden = (item: SelectionItemInput, listingUrl: string | null) =>
    hidden.has(targetKey(item, listingUrl));
  // Lancement, mission 3 — déjà envoyé, visité ou refusé : hors des listes, et compté.
  const seenReasons = new Map(seen.map((fact) => [fact.key, fact.reason]));
  const seenReason = (item: SelectionItemInput, listingUrl: string | null) =>
    isHidden(item, listingUrl) ? undefined : seenReasons.get(targetKey(item, listingUrl));

  const actions = (item: SelectionItemInput) => (
    <div className="flex shrink-0 flex-col items-end gap-1">
      {checkbox(item)}
      {selected.has(keyOf(item)) ? null : (
        <DismissControl
          buyerId={buyerId}
          target={{ source: item.source, reference: item.reference }}
          label={item.label}
          onDismissed={(key) => {
            setHidden((current) => new Set([...current, key]));
            setJustDismissed((current) => [...current, { key, label: item.label }]);
          }}
        />
      )}
    </div>
  );

  const checkbox = (item: SelectionItemInput) => {
    const key = keyOf(item);
    const checked = selected.has(key);
    return (
      <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-zinc-700 stage:text-white/80">
        <input
          type="checkbox"
          className="h-4 w-4 accent-brand"
          checked={checked}
          disabled={(!checked && full) || closed(item)}
          onChange={() => toggle(item)}
          aria-label={`Retenir ${item.label}`}
        />
        Retenir
      </label>
    );
  };

  // Le bandeau « Sélection actuelle » (essai de Jean-Guy, 26/10) et les listes sans doublon : la
  // règle vit dans `idealPageLayout`.
  const allAgencyHits = BUYER_GROUPS.flatMap((group) =>
    agency.matches[group].map((hit) => ({ group, hit })),
  );
  const asEntry = (hit: BuyerHit) => ({
    item: agencyItem(hit),
    listingUrl: hit.candidate.listingUrl,
  });
  const layout = idealPageLayout({
    baseline,
    selected: [...selected.values()],
    agency: allAgencyHits.map(({ hit }) => asEntry(hit)),
  });
  const bannerItems = layout.banner;
  // Ce qu'il a déjà vu n'a pas pu être lu : rien n'est proposé, jamais lu comme « rien de vu » (M98).
  const seenUnread = dismissed == null;
  const agencyOpen = allAgencyHits.filter(
    ({ hit }) =>
      !seenUnread &&
      layout.showAgency(asEntry(hit)) &&
      !isHidden(agencyItem(hit), hit.candidate.listingUrl),
  );
  const agencyHits = agencyOpen.filter(
    ({ hit }) => seenReason(agencyItem(hit), hit.candidate.listingUrl) == null,
  );
  const agencySeenLine = seenLine(
    countSeen(agencyOpen.map(({ hit }) => seenReason(agencyItem(hit), hit.candidate.listingUrl))),
  );
  const marketOpen = (entry: CategorizedCandidate): boolean =>
    !seenUnread &&
    layout.showMarket({ item: marketItem(entry), listingUrl: entry.candidate.url }) &&
    !isHidden(marketItem(entry), entry.candidate.url);
  const showMarket = (entry: CategorizedCandidate): boolean =>
    marketOpen(entry) && seenReason(marketItem(entry), entry.candidate.url) == null;

  const watchEntries = (watch?.entries ?? []).filter(showMarket);
  // Mission 151 (partie B) — pendant la recherche et sa lecture, le message d'attente prend la
  // place des résultats (planche 4 b).
  const waiting = searching && softLabels.length > 0 && softOpen;
  // Un bien de la veille, déjà en tête, ne se répète pas dans les annonces du marché.
  const watchUrls = new Set(watchEntries.map((entry) => entry.candidate.url));
  // Les annonces du marché (la veille et la recherche, chacune une fois) qu'il a déjà vues.
  const marketSeen = new Map<string, 'sent' | 'visited' | 'refused'>();
  for (const entry of [
    ...(watch?.entries ?? []),
    ...(market
      ? IDEAL_CATEGORIES.flatMap((category) => market.categorized.byCategory[category])
      : []),
  ]) {
    const reason = marketOpen(entry)
      ? seenReason(marketItem(entry), entry.candidate.url)
      : undefined;
    if (reason) marketSeen.set(entry.candidate.url, reason);
  }
  const marketSeenLine = seenLine(countSeen([...marketSeen.values()]));

  // Une annonce du marché : sa photo, son libellé neutre, son prix « affiché le », ses critères.
  const hitRow = (
    entry: CategorizedCandidate,
    seenOn: string,
    rank: number,
    testId = 'ideal-market-hit',
  ) => {
    const item = marketItem(entry, seenOn);
    const photo = entry.candidate.photoUrls[0];
    const rankLine = [
      IDEAL_CATEGORY_LABELS[entry.category],
      entry.criteriaTotal > 0
        ? `${entry.criteriaOk} critère${entry.criteriaOk > 1 ? 's' : ''} sur ${entry.criteriaTotal}`
        : null,
      ...entry.gaps,
      ...toVerifyLabels(entry),
      whySummary(reasonsOf(entry.candidate.url, watchReasons[entry.candidate.url])),
    ]
      .filter((part): part is string => part != null)
      .join(' · ');
    const open = () => openMarketSheet(item, entry.candidate, seenOn, rankLine);
    return (
      <li
        key={entry.candidate.url}
        data-testid={testId}
        data-category={entry.category}
        className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${CATEGORY_TONE[entry.category]}`}
      >
        {photo ? (
          <button type="button" className="shrink-0" tabIndex={-1} aria-hidden onClick={open}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayPhotoUrl(photo)}
              alt=""
              className="h-16 w-24 rounded-lg bg-zinc-100 object-cover"
            />
          </button>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <button
            type="button"
            className={openSheetLink}
            data-testid="open-property-sheet"
            onClick={open}
          >
            {item.label}
          </button>
          <span className="text-sm">
            {[
              entry.candidate.price != null ? formatEuro(entry.candidate.price) : null,
              seenOnLabel(seenOn),
              entry.criteriaTotal > 0
                ? `${entry.criteriaOk} critère${entry.criteriaOk > 1 ? 's' : ''} sur ${entry.criteriaTotal}`
                : null,
            ]
              .filter((part): part is string => part != null)
              .join(' · ')}
          </span>
          {entry.gaps.length > 0 ? <span className="text-xs">{entry.gaps.join(' · ')}</span> : null}
          {toVerifyLabels(entry).length > 0 ? (
            <span className="text-xs">{toVerifyLabels(entry).join(' · ')}</span>
          ) : null}
        </div>
        {actions(item)}
        {softLabels.length > 0 ? (
          <div className="basis-full">
            <SoftWhy
              reasons={reasonsOf(entry.candidate.url, watchReasons[entry.candidate.url])}
              rank={rank}
              onOpen={open}
            />
          </div>
        ) : null}
      </li>
    );
  };

  // Mission 152 (partie B) — la barre de la fiche, sous le pouce : « Retenir ce bien », le seul
  // plein, coche le bien dans la sélection (trois au plus, M118), que « Retenir la sélection »
  // enregistre ensuite ; retenu, « Retenu ✓ · Retirer » en contour.
  const sheetFooter = (item: SelectionItemInput) => {
    const checked = selected.has(keyOf(item));
    const count = selected.size;
    return (
      <>
        <span className="text-sm text-zinc-700" data-testid="sheet-selection-count">
          {buyerName ? <strong className="font-semibold">Pour {buyerName}</strong> : null}
          {buyerName ? ' · ' : ''}
          {count} bien{count > 1 ? 's' : ''} sélectionné{count > 1 ? 's' : ''} sur{' '}
          {MAX_IDEAL_SELECTION}
        </span>
        {checked ? (
          <button
            type="button"
            className={btnSecondary}
            data-testid="sheet-unretain"
            onClick={() => toggle(item)}
          >
            Retenu ✓ · Retirer
          </button>
        ) : (
          <button
            type="button"
            className={btnPrimary}
            data-testid="sheet-retain"
            disabled={full}
            onClick={() => toggle(item)}
          >
            {full ? 'Sélection complète' : 'Retenir ce bien'}
          </button>
        )}
      </>
    );
  };

  return (
    <div className="flex flex-col gap-6" data-testid="ideal-properties">
      {dismissed == null ? (
        <p role="alert" className="text-sm font-semibold text-red-700">
          Ce qu’il a déjà reçu, visité ou refusé n’a pas pu être lu : rechargez la page. En
          attendant, aucun bien ne lui est proposé ici.
        </p>
      ) : null}
      {justDismissed.length > 0 ? (
        <div className="flex flex-col gap-1" data-testid="dismissed-now" role="status">
          {justDismissed.map((entry) => (
            <p key={entry.key} className="text-sm text-zinc-700 stage:text-white/80">
              Écarté pour lui : {entry.label} ·{' '}
              <button
                type="button"
                className="font-semibold text-brand-darker underline"
                data-testid="dismiss-undo"
                onClick={() => {
                  setUndoError(null);
                  void undoDismissal(buyerId, entry.key)
                    .then((result) => {
                      if (!result.ok) {
                        setUndoError(result.error);
                        return;
                      }
                      setHidden((current) => {
                        const next = new Set(current);
                        next.delete(entry.key);
                        return next;
                      });
                      setJustDismissed((current) =>
                        current.filter((other) => other.key !== entry.key),
                      );
                    })
                    .catch(() => setUndoError('Connexion perdue : réessayez.'));
                }}
              >
                Annuler
              </button>
            </p>
          ))}
          {undoError ? (
            <p role="alert" className="text-sm font-semibold text-red-700">
              {undoError}
            </p>
          ) : null}
        </div>
      ) : null}
      {/* Essai de Jean-Guy (26/10) : la sélection n'apparaît qu'une fois, ici, chaque bien avec sa
          case — une annonce du marché se décoche sans relancer une recherche payante. */}
      {bannerItems.length > 0 ? (
        <section className={`${card} flex flex-col gap-3 p-5`} data-testid="ideal-current">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className={sectionTitle}>
              Sélection actuelle :{' '}
              {baseline.length > 0
                ? baseline.map((_, index) => String.fromCharCode(65 + index)).join(', ')
                : 'aucune'}
            </h2>
            {baseline.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/presentation/${buyerId}`}
                  className={retainLeads || !pageLeads ? btnSecondary : btnPrimary}
                >
                  {presented ? 'Revoir la présentation' : 'Présenter'}
                </Link>
                <Link href={`/acquereurs/${buyerId}/dossier`} className={btnSecondary}>
                  Dossier acquéreur
                </Link>
              </div>
            ) : null}
          </div>
          <ul className="flex flex-col gap-2">
            {bannerItems.map((item, index) => (
              <li
                key={keyOf(item)}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 px-4 py-3 stage:border-white/10"
                data-testid="ideal-current-item"
                data-letter={index < baseline.length ? String.fromCharCode(65 + index) : undefined}
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <button
                    type="button"
                    className={openSheetLink}
                    data-testid="open-property-sheet"
                    onClick={() => openItemSheet(item)}
                  >
                    {index < baseline.length ? `${String.fromCharCode(65 + index)} · ` : ''}
                    {item.label}
                  </button>
                  <span className="text-sm text-zinc-600 stage:text-white/70">
                    {[
                      item.listedPrice != null ? formatEuro(item.listedPrice) : null,
                      item.source === 'listing' ? 'Annonce du marché' : 'Dans l’agence',
                      index < baseline.length ? null : 'À retenir',
                    ]
                      .filter((part): part is string => part != null)
                      .join(' · ')}
                  </span>
                  {currentSeenLabel(currentSeen[keyOf(item)]) ? (
                    <span
                      className="text-sm font-semibold text-amber-700 stage:text-amber-300"
                      data-testid="ideal-current-seen"
                    >
                      {currentSeenLabel(currentSeen[keyOf(item)])}
                    </span>
                  ) : null}
                </span>
                {checkbox(item)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {/* Mission 151 (partie B) — comment les biens sont rangés (planches 4 et 4 b). */}
      {softLabels.length > 0 ? <SoftBanner state={rankState} labels={softLabels} /> : null}
      {/* Mission 136 — « Nouveau cette semaine » : la veille de la nuit, en tête, prêt à retenir. */}
      {watchEntries.length > 0 && watch && !waiting ? (
        <section
          id="nouveau"
          className={`${card} flex flex-col gap-3 p-5`}
          data-testid="ideal-watch"
        >
          <div className="flex flex-col gap-0.5">
            <h2 className={sectionTitle}>Nouveau cette semaine</h2>
            <p className={hintText}>
              Trouvés par la veille le {dayLabel(watch.seenOn)} : arrivés sur le marché depuis sa
              recherche précédente. À vérifier avant de les proposer.
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {withRanks(
              orderWithinGroups(
                watchEntries,
                (entry) => entry.category,
                (entry) =>
                  scoreOf(entry.candidate.url) ||
                  softScoreOfReasons(watchReasons[entry.candidate.url]),
              ),
              (entry) => entry.category,
            ).map(({ item: entry, rank }) => hitRow(entry, watch.seenOn, rank, 'ideal-watch-hit'))}
          </ul>
        </section>
      ) : null}
      <section
        className={`${card} flex flex-col gap-3 p-5 ${waiting ? 'hidden' : ''}`}
        data-testid="ideal-agency"
      >
        <div className="flex flex-col gap-0.5">
          <h2 className={sectionTitle}>Ce que l’agence a déjà</h2>
          <p className={hintText}>
            Vos mandats signés sans offre acceptée, et les concurrents à prospecter qui
            correspondent à sa recherche. Ne compte pas dans le forfait.
          </p>
        </div>
        {mandatesUnread ? (
          <p role="alert" className="text-sm font-semibold text-red-700">
            Vos mandats n’ont pas pu être lus : rechargez la page.
          </p>
        ) : null}
        {allAgencyHits.length > 0 && agencyOpen.length === 0 && !seenUnread ? (
          <p className="text-sm text-zinc-600 stage:text-white/70">
            Les biens de l’agence qui correspondent sont dans la sélection actuelle.
          </p>
        ) : null}
        {agencySeenLine ? (
          <p className={hintText} data-testid="ideal-agency-seen">
            {agencySeenLine}
          </p>
        ) : null}
        {allAgencyHits.length === 0 ? (
          <p className="text-sm text-zinc-600 stage:text-white/70">
            Rien de ce côté pour l’instant : aucun bien de l’agence ne correspond exactement.
            {agency.near.length > 0
              ? ` ${agency.near.length} bien${agency.near.length > 1 ? 's' : ''} proche${agency.near.length > 1 ? 's' : ''} mais hors critères.`
              : ''}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {withRanks(
              orderWithinGroups(
                agencyHits,
                ({ group }) => group,
                ({ hit }) => scoreOf(hit.candidate.key),
              ),
              ({ group }) => group,
            ).map(({ item: { group, hit }, rank }) => {
              const item = agencyItem(hit);
              const agencyReasons = reasonsOf(hit.candidate.key, {
                mentions: agencyMentions[hit.candidate.key] ?? [],
              });
              const rankLine = [
                BUYER_GROUP_LABELS[group],
                hit.note,
                hit.condominiumNote,
                whySummary(agencyReasons),
              ]
                .filter((part): part is string => part != null)
                .join(' · ');
              return (
                <li
                  key={hit.candidate.key}
                  data-testid="ideal-agency-hit"
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 px-4 py-3 stage:border-white/10"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className={openSheetLink}
                        data-testid="open-property-sheet"
                        onClick={() => openAgencySheet(item, rankLine)}
                      >
                        {item.label}
                      </button>
                      <span className={badgeNeutral}>{BUYER_GROUP_LABELS[group]}</span>
                    </div>
                    <span className="text-sm text-zinc-600 stage:text-white/70">
                      {[
                        hit.candidate.price != null ? formatEuro(hit.candidate.price) : null,
                        `Pour : ${hit.candidate.sellerName}`,
                        hit.note,
                        hit.condominiumNote,
                      ]
                        .filter((part): part is string => part != null)
                        .join(' · ')}
                    </span>
                  </div>
                  {actions(item)}
                  {softLabels.length > 0 ? (
                    <div className="basis-full">
                      <SoftWhy
                        reasons={agencyReasons}
                        rank={rank}
                        onOpen={() => openAgencySheet(item, rankLine)}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={`${card} flex flex-col gap-3 p-5`} data-testid="ideal-market">
        <div className="flex flex-col gap-0.5">
          <h2 className={sectionTitle}>Le marché</h2>
          <p className={hintText}>
            Les annonces en vente qui répondent à la fiche, rangées en trois catégories d’après ses
            indispensables ; un indispensable contredit écarte le bien.
          </p>
        </div>
        {budgetWarning ? <p className={hintText}>{budgetWarning}</p> : null}
        {marketSeenLine ? (
          <p className={hintText} data-testid="ideal-market-seen">
            {marketSeenLine}
          </p>
        ) : null}
        {extensionIssue ? (
          <ExtensionRequiredNotice
            reason={extensionIssue}
            onRetry={async () => setExtensionIssue(null)}
          />
        ) : null}
        {/* Mission 151 (partie B) — l'attente pendant la recherche (planche 4 b). */}
        {waiting ? (
          <div
            className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 px-4 py-5 text-center stage:border-white/10"
            role="status"
            data-testid="soft-waiting"
          >
            <span className="font-semibold text-brand-deep stage:text-brand">
              Recherche du marché…
            </span>
            <span className="text-sm text-zinc-700 stage:text-white/80">
              Puis lecture des annonces pour ce qui compte pour eux : {softLabels.join(', ')}.
            </span>
            <span className={hintText}>
              Jusqu’à 30 secondes. Si la lecture tarde, les biens s’affichent en classement
              simplifié.
            </span>
          </div>
        ) : null}
        {!marketReady ? (
          <p role="alert" className={alertError}>
            {marketBlocked}{' '}
            <Link href={`/acquereurs/${buyerId}`} className={link}>
              Modifier la fiche
            </Link>
          </p>
        ) : market == null ? (
          confirming ? (
            <div
              data-testid="ideal-paid-confirm"
              className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 stage:border-amber-400/30 stage:bg-amber-500/10 stage:text-amber-200"
            >
              <span>{PAID_MARKET_WARNING}</span>
              <button type="button" className={btnSecondary} onClick={() => void search(false)}>
                Lancer la recherche
              </button>
              <button
                type="button"
                className={`${link} text-xs`}
                onClick={() => setConfirming(false)}
              >
                Annuler
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className={btnSecondary}
                disabled={searching || seenUnread}
                onClick={() => setConfirming(true)}
              >
                {searching ? 'Recherche…' : MARKET_BUTTON}
              </button>
            </div>
          )
        ) : (
          <>
            <p
              className="text-sm text-zinc-700 stage:text-white/80"
              data-testid="ideal-market-summary"
            >
              {market.portal.candidates.length} bien{market.portal.candidates.length > 1 ? 's' : ''}{' '}
              reçu
              {market.portal.candidates.length > 1 ? 's' : ''} sur {market.communes.join(', ')} ·{' '}
              {market.billed} annonce{market.billed > 1 ? 's' : ''} comptée
              {market.billed > 1 ? 's' : ''}
              {excludedLine(market.categorized.excluded)
                ? ` · ${excludedLine(market.categorized.excluded)}`
                : ''}
            </p>
            {IDEAL_CATEGORIES.map((category) => {
              const entries = market.categorized.byCategory[category].filter(
                (entry) => showMarket(entry) && !watchUrls.has(entry.candidate.url),
              );
              return (
                <div
                  key={category}
                  className="flex flex-col gap-2"
                  data-testid={`ideal-category-${category}`}
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="font-title text-base font-semibold text-zinc-900 stage:text-white">
                      {IDEAL_CATEGORY_LABELS[category]}
                    </h3>
                    <span className={badgeBrand}>{entries.length}</span>
                    <span className={hintText}>{IDEAL_CATEGORY_HINTS[category]}</span>
                  </div>
                  {entries.length === 0 ? (
                    <p className="text-xs text-zinc-500 stage:text-white/50">
                      Aucun bien dans cette catégorie.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {entries.map((entry, index) => hitRow(entry, market.seenOn, index + 1))}
                    </ul>
                  )}
                </div>
              );
            })}
            {market.stop === 'cap' && market.cursor ? (
              <button
                type="button"
                className={`${btnSecondary} self-start`}
                disabled={searching}
                onClick={() => void search(true)}
              >
                {searching ? 'Recherche…' : 'Chercher encore (20 annonces)'}
              </button>
            ) : null}
          </>
        )}
      </section>

      {error ? (
        <p role="alert" className={alertError}>
          {error}
        </p>
      ) : null}
      {saved ? (
        <p role="status" className={alertOk} data-testid="ideal-saved">
          {saved} {importNote}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={retainLeads && pageLeads ? btnPrimary : btnSecondary}
          disabled={saving || selected.size === 0 || !changed}
          onClick={retain}
          data-testid="ideal-retain"
        >
          {saving
            ? 'Enregistrement…'
            : `${RETAIN_BUTTON} (${selected.size}/${MAX_IDEAL_SELECTION})`}
        </button>
        {full ? <span className={hintText}>{SELECTION_TOO_MANY}</span> : null}
      </div>
      {sheet.state && sheetItem ? (
        <PropertySheetView
          state={sheet.state}
          onClose={closeSheet}
          backLabel="Ses biens idéaux"
          budgetMax={budgetMax}
          rankLine={sheetItem.rankLine}
          footer={sheetFooter(sheetItem.item)}
        />
      ) : null}
    </div>
  );
}

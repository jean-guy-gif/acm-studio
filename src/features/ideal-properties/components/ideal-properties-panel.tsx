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
import {
  runPaidSearch,
  STREAM_ESTATE_MAX_COST,
} from '@/features/competitor-search/services/paid-search-guard';
import { readPageViaExtension } from '@/features/competitor-search/services/read-page-via-extension';
import { resumeMemory } from '@/features/competitor-search/services/stream-estate-summary';
import { useDemoMode } from '@/features/demo/components/demo-mode-provider';
import { importIdealListing } from '@/features/ideal-properties/actions/import-ideal-listing';
import { saveIdealSelection } from '@/features/ideal-properties/actions/save-ideal-selection';
import {
  searchIdealProperties,
  type IdealSearchResult,
} from '@/features/ideal-properties/actions/search-ideal-properties';
import {
  excludedLine,
  type CategorizedCandidate,
} from '@/features/ideal-properties/services/categorize-ideal';
import { idealLabel } from '@/features/ideal-properties/services/ideal-label';
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
import { formatEuro } from '@/lib/format';
import { displayPhotoUrl } from '@/lib/photo-url';

// Mission 118 (partie B) — « Trouver les biens idéaux », sur un seul écran, réservé au conseiller :
//   1. ce que l'agence a déjà — le rapprochement de M86, gratuit, rendu d'abord ;
//   2. le marché — la recherche Stream Estate déduite de la fiche, payante : avertissement avant,
//      le ping de l'extension d'abord (M93), « Chercher encore » au plafond ; simulée en démo (M114) ;
//   3. la sélection : jusqu'à trois biens cochés, « Retenir la sélection ».
// Une recherche n'est pas une disponibilité : « affiché le », jamais « disponible ».

export const PAID_MARKET_WARNING = `Recherche payante sur le marché : jusqu’à ${STREAM_ESTATE_MAX_COST}. Les critères sont ceux de la fiche.`;
export const MARKET_BUTTON = 'Trouver sur le marché';
export const RETAIN_BUTTON = 'Retenir la sélection';

type Market = IdealSearchResult & { ok: true };

const keyOf = selectionKey;

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
    gaps: hit.note ? [hit.note] : [],
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
    gaps: [...entry.gaps, ...entry.toCheck.map((label) => `À vérifier : ${label}`)],
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
}: {
  buyerId: string;
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
}) {
  const demo = useDemoMode();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [searching, setSearching] = useState(false);
  const [market, setMarket] = useState<Market | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extensionIssue, setExtensionIssue] = useState<ExtensionIssue | null>(null);
  const [selected, setSelected] = useState<Map<string, SelectionItemInput>>(
    () => new Map(current.map((item) => [keyOf(item), item])),
  );
  // La sélection enregistrée : « Retenir » ne s'active que si la sélection cochée en diffère.
  const [baseline, setBaseline] = useState<SelectionItemInput[]>(current);
  const changed = selectionChanged([...selected.values()], baseline);
  const [saving, startSaving] = useTransition();
  const [saved, setSaved] = useState<string | null>(null);
  const [importNote, setImportNote] = useState<string | null>(null);

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
      const outcome = await runPaidSearch(detect, () => searchIdealProperties(buyerId, resume));
      if (!outcome.ran) {
        setExtensionIssue(missingExtensionIssue());
        return;
      }
      const result = outcome.result;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (more && market) {
        // « Chercher encore » : les biens de plus s'ajoutent, le coût se cumule.
        const candidates = [...market.portal.candidates, ...result.portal.candidates];
        const merged: Market = {
          ...result,
          portal: { ...result.portal, candidates },
          billed: market.billed + result.billed,
          categorized: {
            byCategory: {
              strong: [
                ...market.categorized.byCategory.strong,
                ...result.categorized.byCategory.strong,
              ],
              compromise: [
                ...market.categorized.byCategory.compromise,
                ...result.categorized.byCategory.compromise,
              ],
              explore: [
                ...market.categorized.byCategory.explore,
                ...result.categorized.byCategory.explore,
              ],
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

  const checkbox = (item: SelectionItemInput) => {
    const key = keyOf(item);
    const checked = selected.has(key);
    return (
      <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-zinc-700 stage:text-white/80">
        <input
          type="checkbox"
          className="h-4 w-4 accent-brand"
          checked={checked}
          disabled={!checked && full}
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
  const agencyHits = allAgencyHits.filter(({ hit }) => layout.showAgency(asEntry(hit)));
  const showMarket = (entry: CategorizedCandidate): boolean =>
    layout.showMarket({ item: marketItem(entry), listingUrl: entry.candidate.url });

  const watchEntries = (watch?.entries ?? []).filter(showMarket);
  // Un bien de la veille, déjà en tête, ne se répète pas dans les annonces du marché.
  const watchUrls = new Set(watchEntries.map((entry) => entry.candidate.url));

  // Une annonce du marché : sa photo, son libellé neutre, son prix « affiché le », ses critères.
  const hitRow = (entry: CategorizedCandidate, seenOn: string, testId = 'ideal-market-hit') => {
    const item = marketItem(entry, seenOn);
    const photo = entry.candidate.photoUrls[0];
    return (
      <li
        key={entry.candidate.url}
        data-testid={testId}
        data-category={entry.category}
        className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${CATEGORY_TONE[entry.category]}`}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayPhotoUrl(photo)}
            alt=""
            className="h-16 w-24 shrink-0 rounded-lg bg-zinc-100 object-cover"
          />
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-title text-base font-bold text-zinc-900 stage:text-white">
            {item.label}
          </span>
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
          {entry.toCheck.length > 0 ? (
            <span className="text-xs">À vérifier : {entry.toCheck.join(', ')}</span>
          ) : null}
        </div>
        {checkbox(item)}
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-6" data-testid="ideal-properties">
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
                <Link href={`/presentation/${buyerId}`} className={btnPrimary}>
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
                  <span className="font-title text-base font-bold text-zinc-900 stage:text-white">
                    {index < baseline.length ? `${String.fromCharCode(65 + index)} · ` : ''}
                    {item.label}
                  </span>
                  <span className="text-sm text-zinc-600 stage:text-white/70">
                    {[
                      item.listedPrice != null ? formatEuro(item.listedPrice) : null,
                      item.source === 'listing' ? 'Annonce du marché' : 'Dans l’agence',
                      index < baseline.length ? null : 'À retenir',
                    ]
                      .filter((part): part is string => part != null)
                      .join(' · ')}
                  </span>
                </span>
                {checkbox(item)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {/* Mission 136 — « Nouveau cette semaine » : la veille de la nuit, en tête, prêt à retenir. */}
      {watchEntries.length > 0 && watch ? (
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
            {watchEntries.map((entry) => hitRow(entry, watch.seenOn, 'ideal-watch-hit'))}
          </ul>
        </section>
      ) : null}
      <section className={`${card} flex flex-col gap-3 p-5`} data-testid="ideal-agency">
        <div className="flex flex-col gap-0.5">
          <h2 className={sectionTitle}>Ce que l’agence a déjà</h2>
          <p className={hintText}>
            Vos mandats signés, vos vendeurs à relancer et les concurrents à prospecter qui
            correspondent à sa recherche. Gratuit.
          </p>
        </div>
        {allAgencyHits.length > 0 && agencyHits.length === 0 ? (
          <p className="text-sm text-zinc-600 stage:text-white/70">
            Les biens de l’agence qui correspondent sont dans la sélection actuelle.
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
            {agencyHits.map(({ group, hit }) => {
              const item = agencyItem(hit);
              return (
                <li
                  key={hit.candidate.key}
                  data-testid="ideal-agency-hit"
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 px-4 py-3 stage:border-white/10"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-title text-base font-bold text-zinc-900 stage:text-white">
                        {item.label}
                      </span>
                      <span className={badgeNeutral}>{BUYER_GROUP_LABELS[group]}</span>
                    </div>
                    <span className="text-sm text-zinc-600 stage:text-white/70">
                      {[
                        hit.candidate.price != null ? formatEuro(hit.candidate.price) : null,
                        `Pour : ${hit.candidate.sellerName}`,
                        hit.note,
                      ]
                        .filter((part): part is string => part != null)
                        .join(' · ')}
                    </span>
                  </div>
                  {checkbox(item)}
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
        {extensionIssue ? (
          <ExtensionRequiredNotice
            reason={extensionIssue}
            onRetry={async () => setExtensionIssue(null)}
          />
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
              <button type="button" className={btnPrimary} onClick={() => void search(false)}>
                Lancer et payer
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
                className={btnPrimary}
                disabled={searching}
                onClick={() => setConfirming(true)}
              >
                {searching ? 'Recherche…' : MARKET_BUTTON}
              </button>
              <span className={hintText}>
                Coût maximal : {STREAM_ESTATE_MAX_COST} par recherche
              </span>
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
              {market.billed} annonce{market.billed > 1 ? 's' : ''} facturée
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
                      {entries.map((entry) => hitRow(entry, market.seenOn))}
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
                {searching ? 'Recherche…' : 'Chercher encore (20 annonces, 0,20 €)'}
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
          className={btnPrimary}
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
    </div>
  );
}

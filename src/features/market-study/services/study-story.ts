import { studyPrintPages } from '@/features/market-study/services/study-print';
import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';
import type { ComparisonCriterion } from '@/features/live-seller/constants';
import { daysLabel } from '@/features/market-update/services/meeting-days';
import type {
  MarketStudyCompetitor,
  MarketStudyRanking,
  MarketStudyStory,
  StudyCard,
  StudyChapter,
  StudyTile,
} from '@/features/market-study/types';
import type { NeighbourhoodDocumentContent } from '@/features/neighbourhood-link/components/neighbourhood-document';
import {
  shortLinkAddress,
  type NeighbourhoodDocumentLink,
} from '@/features/neighbourhood-link/services/neighbourhood-link';
import {
  isShowableBlock,
  PLANNING_CATEGORIES,
  SALES_COUNTED_SINCE,
  type NeighbourhoodSale,
} from '@/features/neighbourhood-link/services/neighbourhood-blocks';
import { neighbourhoodView } from '@/features/neighbourhood-link/services/neighbourhood-view';
import type { SellerSynthesis } from '@/features/seller-synthesis/types';
import { isPropertyType } from '@/features/subject-property/services/property-type-choice';
import { clientTexts, type TextLanguage } from '@/lib/client-texts';
import type { StudyCivility, StudyKind } from '@/lib/client-texts/study-types';
import {
  formatDay,
  formatEuro,
  formatEuroPerSquareMeter,
  formatMeters,
  formatMonth,
  formatNumber,
  formatSquareMeters,
} from '@/lib/format';

// Mission 163 A — l'Étude de marché en fil conducteur (maquette M163-fil-conducteur, validée par
// Jean-Guy le 20/11). Pur : les pages, leurs titres-conclusions et « L'avis de … » sont composés ici,
// une fois, depuis les chiffres du dossier, avec les phrases écrites de `client-texts` ; jamais par
// une IA, jamais une valeur du bien. Un chapitre sans données disparaît du résumé et de la
// numérotation (remplace M162, « le titre reste »).

export type StudySubject = {
  propertyType: string | null;
  city: string | null;
  district: string | null;
  surface: number | null;
  rooms: number | null;
  landArea: number | null;
};

export type StudyStoryInput = {
  language: TextLanguage;
  madeAt: string;
  sellerName: string;
  subject: StudySubject | null;
  competitors: MarketStudyCompetitor[];
  ranking: MarketStudyRanking;
  agency: SellerSynthesis['agency'];
  quartier: NeighbourhoodDocumentContent | null;
  // Le lien « Vivre ici » du bien, montré sur la page du quartier.
  neighbourhood?: NeighbourhoodDocumentLink | null;
  // La police de la charte de l'agence (`printFontOf`) : elle décide des lignes de chaque texte
  // imprimé, donc des pages.
  brandFont?: string | null;
};

// Sans les ventes cochées une par une (M163 B) : les six plus proches du bien.
export const STUDY_SALES_KEPT = 6;

// ─── La mise en page A4 : des hauteurs en millimètres, pour savoir sur quelle page tombe chaque
// chapitre (le résumé les cite). Page de 297 mm, marges 10 et 16 mm : 271 mm utiles.
const PAGE_MM = 271;
const BAND_MM = 56;
const AVIS_MM = 42;
const CARD_BASE_MM = 46;
const CARD_LINE_MM = 5.5;
const CARD_MIN_MM = 62;
const CARD_GAP_MM = 4;
const CARDS_PER_PAGE = 3;
// Le classement : ce qui tient sur la page du bandeau, puis par page de suite.
// Le classement se coupe à ces nombres de lignes, page par page : le résumé cite ses vraies pages.
const RANKING_ROWS_FIRST = 9;
const RANKING_ROWS_NEXT = 18;
// Le quartier : au-delà de cette hauteur estimée, « Comment en parler », Vivre ici et l'avis passent
// sur une seconde page, explicitement.
const QUARTIER_ONE_PAGE_MM = 262;

const positive = (value: number | null | undefined): number | null =>
  value != null && Number.isFinite(value) && value > 0 ? value : null;

export function studyKind(propertyType: string | null): StudyKind {
  const type = normalizePropertyType(propertyType);
  return type === 'house' ? 'maison' : type === 'apartment' ? 'appartement' : 'bien';
}

// La formule de politesse se lit dans le nom du dossier (décision de Jean-Guy, 20/11) : « Mme »,
// « M. », « M. et Mme »… ; un nom qui ne dit pas la civilité n'en a pas.
export function studyCivility(name: string): StudyCivility | null {
  const n = name.trim().toLowerCase();
  const her = '(mme|madame|mrs\\.?|ms\\.?|mlle|mademoiselle)';
  const him = '(m\\.|mr\\.?|monsieur)';
  // « M. et Mme Lopez », mais aussi « M. Martin et Mme Durand ».
  const both = new RegExp(
    `^(${him}(\\s.*)?\\s(et|and|&)\\s+${her}|${her}(\\s.*)?\\s(et|and|&)\\s+${him})(\\s|$)`,
  );
  if (both.test(n)) return 'both';
  if (new RegExp(`^${her}(\\s|$)`).test(n)) return 'madame';
  if (new RegExp(`^${him}(\\s|$)`).test(n)) return 'monsieur';
  return null;
}

const initialsOf = (name: string | null): string =>
  (name ?? '')
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

// La hauteur estimée d'une fiche de concurrent, selon ses lignes.
export function cardHeight(card: StudyCard): number {
  const lines = Math.max(card.diffs.length, 1) + (card.equivalentOn ? 1.4 : 0);
  return Math.max(CARD_MIN_MM, CARD_BASE_MM + lines * CARD_LINE_MM) + CARD_GAP_MM;
}

// Trois fiches par page au plus, jamais coupées ; l'avis et la source suivent la dernière, sur la
// même page quand ils y tiennent, sinon la dernière fiche passe sur une page avec eux.
export function packCards(cards: StudyCard[]): StudyCard[][] {
  const pages: StudyCard[][] = [];
  const room = (index: number) => (index === 0 ? PAGE_MM - BAND_MM : PAGE_MM);
  let page: StudyCard[] = [];
  let used = 0;
  for (const card of cards) {
    const height = cardHeight(card);
    if (page.length > 0 && (page.length >= CARDS_PER_PAGE || used + height > room(pages.length))) {
      pages.push(page);
      page = [];
      used = 0;
    }
    page.push(card);
    used += height;
  }
  if (page.length > 0) {
    if (used + AVIS_MM > room(pages.length) && page.length > 1) {
      const last = page.pop()!;
      pages.push(page);
      page = [last];
    }
    pages.push(page);
  }
  return pages;
}

export function rankingPages(rows: number): number {
  return rows <= RANKING_ROWS_FIRST
    ? 1
    : 1 + Math.ceil((rows - RANKING_ROWS_FIRST) / RANKING_ROWS_NEXT);
}

// Les lignes du classement, découpées page par page (le document coupe exactement là).
export function rankingChunks<T>(rows: T[]): T[][] {
  const chunks: T[][] = [rows.slice(0, RANKING_ROWS_FIRST)];
  for (let i = RANKING_ROWS_FIRST; i < rows.length; i += RANKING_ROWS_NEXT)
    chunks.push(rows.slice(i, i + RANKING_ROWS_NEXT));
  return chunks;
}

// La hauteur estimée de la page du quartier, en millimètres.
export function quartierHeight(parts: {
  tileLines: number;
  riskCells: number;
  condominium: boolean;
  vivreIci: boolean;
  avis: boolean;
}): number {
  // Mesuré à l'impression sur le dossier de démonstration (20/11) : le bandeau sur trois lignes,
  // les cases, la grille des risques par rangée de deux, « Comment en parler », la copropriété et
  // Vivre ici côte à côte, l'avis, la date et les espaces.
  return (
    BAND_MM +
    (parts.tileLines > 0 ? 22 + parts.tileLines * 5 : 0) +
    (parts.riskCells > 0 ? 18 + Math.ceil(parts.riskCells / 2) * 12.5 : 0) +
    24 +
    (parts.condominium ? 38 : parts.vivreIci ? 26 : 0) +
    (parts.avis ? 22 : 0) +
    18
  );
}

// Les six ventes les plus proches du bien : le moins d'écart de pièces, puis de surface, puis la
// plus récente.
export function closestSales(
  list: NeighbourhoodSale[],
  subject: { rooms: number | null; surface: number | null },
  kept = STUDY_SALES_KEPT,
): number[] {
  const gap = (value: number | null, own: number | null) =>
    value == null || own == null ? Infinity : Math.abs(value - own);
  return list
    .map((sale, index) => ({ sale, index }))
    .sort(
      (a, b) =>
        gap(a.sale.rooms, subject.rooms) - gap(b.sale.rooms, subject.rooms) ||
        gap(a.sale.surface, subject.surface) - gap(b.sale.surface, subject.surface) ||
        b.sale.month.localeCompare(a.sale.month) ||
        a.index - b.index,
    )
    .slice(0, kept)
    .map((entry) => entry.index);
}

export function buildStudyStory(input: StudyStoryInput): MarketStudyStory {
  const { language, agency, ranking } = input;
  const texts = clientTexts(language);
  const s = texts.documents.marketStudy.story;
  const r = texts.documents.marketUpdate.ranking;
  const q = texts.quartier;
  const kind = studyKind(input.subject?.propertyType ?? null);
  const euro = (value: number) => formatEuro(value, { language });
  const meters = (value: number) => formatMeters(value, { language });
  const day = formatDay(input.madeAt, language);
  const commune = input.subject?.city?.trim() || null;
  const advisorName = agency.advisorName?.trim() || null;
  const avisBy = s.avisBy(advisorName);

  // ─── 01 · Les biens en vente ───────────────────────────────────────────────────────────────────
  const shown = input.competitors.length;
  const inSale = input.competitors.filter((item) => item.goneAt == null);
  const salePrices = inSale.map((item) => item.price).filter((price) => price > 0);
  const priceRange =
    salePrices.length > 0
      ? { from: euro(Math.min(...salePrices)), to: euro(Math.max(...salePrices)) }
      : null;
  const advantages = new Set<ComparisonCriterion>();
  const weaknesses = new Map<ComparisonCriterion, string>();
  let advantaged = 0;
  let weaker = 0;
  const cards: StudyCard[] = input.competitors.map((item) => {
    const differing = item.features.filter((feature) => feature.status !== 'same');
    const equal = item.features.filter((feature) => feature.status === 'same');
    // Les phrases ne comptent que les biens encore en vente : une annonce retirée a sa fiche, mais
    // elle n'est plus un bien que les acheteurs compareront (comme au classement).
    const listed = item.goneAt == null;
    if (listed && differing.some((feature) => feature.status === 'competitor_advantage'))
      advantaged += 1;
    if (listed && differing.some((feature) => feature.status === 'competitor_weakness'))
      weaker += 1;
    for (const feature of listed ? differing : []) {
      if (!feature.criterion) continue;
      if (feature.status === 'competitor_advantage') advantages.add(feature.criterion);
      else if (feature.sellerValue && !weaknesses.has(feature.criterion))
        weaknesses.set(feature.criterion, feature.sellerValue);
    }
    const bare = (criterion: ComparisonCriterion | undefined, label: string) =>
      criterion ? s.competitors.criterionBare[criterion] : label.toLowerCase();
    return {
      id: item.id,
      kicker: texts.live.competitorReview.competitor(item.position),
      label: item.label,
      photoUrl: item.photoUrls[0] ?? null,
      price: euro(item.price),
      perSquareMeter: item.pricePerSquareMeter
        ? formatEuroPerSquareMeter(item.pricePerSquareMeter, { language })
        : null,
      since: item.goneAt
        ? {
            label: texts.documents.marketStudy.listing,
            value: texts.documents.marketStudy.removedOn(
              formatDay(item.goneAt, language, 'numeric'),
            ),
          }
        : item.daysOnMarket
          ? { label: texts.documents.common.since, value: daysLabel(item.daysOnMarket, language) }
          : null,
      drop: item.priceDrop
        ? { label: texts.live.analysis.dropped, value: euro(item.priceDrop.amount) }
        : null,
      diffs: differing.map((feature) => ({
        label: feature.label,
        value: feature.sellerValue
          ? `${feature.value} ${s.competitors.youValue(feature.sellerValue)}`
          : feature.value,
        status: feature.status as 'competitor_advantage' | 'competitor_weakness',
      })),
      equivalentOn:
        differing.length > 0 && equal.length > 0
          ? s.competitors.equivalentOn(
              equal.map((feature) => bare(feature.criterion, feature.label)).join(', '),
            )
          : null,
      equivalentAll:
        differing.length === 0 && equal.length > 0 ? s.competitors.equivalentAll(kind) : null,
    };
  });
  const criterionNames = (criteria: ComparisonCriterion[]) =>
    criteria.map((criterion) => s.competitors.criterion[criterion]);
  const against =
    advantages.size > 0 ? (advantaged > 1 ? s.or : s.and)(criterionNames([...advantages])) : null;
  const strongCriteria = [...weaknesses.keys()];
  const strong =
    strongCriteria.length > 0 ? (weaker > 1 ? s.or : s.and)(criterionNames(strongCriteria)) : null;
  // Un atout du bien : au moins un bien en vente est moins bon, et aucun n'est meilleur.
  const ownStrengths = strongCriteria.filter((criterion) => !advantages.has(criterion));
  const strengths =
    ownStrengths.length > 0
      ? s.and(
          ownStrengths
            .slice(0, 3)
            .map((criterion) => s.competitors.strength[criterion](weaknesses.get(criterion)!)),
        )
      : null;
  const onlySurface = advantages.size === 1 && advantages.has('surface');

  // ─── 02 · Les ventes réelles ──────────────────────────────────────────────────────────────────
  const blocks = input.quartier?.blocks ?? null;
  const checked = (key: Parameters<typeof isShowableBlock>[1]) =>
    blocks != null && input.quartier!.keys.includes(key) && isShowableBlock(blocks, key);
  const salesBlock = checked('ventes') && blocks!.ventes!.list.length > 0 ? blocks!.ventes! : null;

  // ─── 04 · Le quartier ─────────────────────────────────────────────────────────────────────────
  const view = <K extends 'urbanisme' | 'permis' | 'risques' | 'population' | 'copropriete'>(
    key: K,
  ) => (checked(key) ? neighbourhoodView(blocks!, key, texts, language) : null);
  const planningView = view('urbanisme');
  const permitsView = view('permis');
  const risksView = view('risques');
  const populationView = view('population');
  const condominiumView = view('copropriete');
  const hasQuartier =
    planningView != null ||
    permitsView != null ||
    risksView != null ||
    populationView != null ||
    condominiumView != null;

  // ─── Les chapitres présents, leurs numéros et leurs pages ─────────────────────────────────────
  const competitorPages = shown > 0 ? packCards(cards) : [];
  const hasRanking = ranking.subject != null && ranking.rows.some((row) => !row.subject);
  const chapters: StudyChapter[] = [
    shown > 0 ? 'competitors' : null,
    salesBlock ? 'sales' : null,
    hasRanking ? 'ranking' : null,
    hasQuartier ? 'quartier' : null,
  ].filter((chapter): chapter is StudyChapter => chapter != null);
  const numberOf = (chapter: StudyChapter) =>
    String(chapters.indexOf(chapter) + 1).padStart(2, '0');

  // ─── Les sources, citées à la dernière page ───────────────────────────────────────────────────
  const names = (keys: ('urbanisme' | 'permis' | 'risques' | 'population' | 'copropriete')[]) =>
    keys
      .filter((key) =>
        key === 'urbanisme'
          ? planningView
          : key === 'permis'
            ? permitsView
            : key === 'risques'
              ? risksView
              : key === 'population'
                ? populationView
                : condominiumView,
      )
      .map((key) => q.sources[key]);
  const sources = [
    shown > 0 ? { label: s.next.sourceRows.competitors, value: s.next.competitorsSource } : null,
    salesBlock ? { label: s.next.sourceRows.sales, value: q.sources.ventes } : null,
    // Correctifs 163 — le libellé suit les blocs réellement montrés : « Habitants » sans risques.
    planningView || permitsView
      ? {
          label:
            planningView && permitsView
              ? s.next.sourceRows.planning
              : planningView
                ? s.next.sourceRows.planningOnly
                : s.next.sourceRows.permitsOnly,
          value: names(['urbanisme', 'permis']).join(' · '),
        }
      : null,
    risksView || populationView
      ? {
          label:
            risksView && populationView
              ? s.next.sourceRows.risks
              : risksView
                ? s.next.sourceRows.risksOnly
                : s.next.sourceRows.peopleOnly,
          value: names(['risques', 'population']).join(' · '),
        }
      : null,
    condominiumView ? { label: s.next.sourceRows.condominium, value: q.sources.copropriete } : null,
  ].filter((row): row is { label: string; value: string } => row != null);

  // ─── Les chapitres ────────────────────────────────────────────────────────────────────────────
  const competitors: MarketStudyStory['competitors'] =
    shown > 0
      ? {
          band: {
            number: numberOf('competitors'),
            title: s.competitors.title(inSale.length, kind),
            lead: s.competitors.lead(inSale.length, kind, priceRange),
          },
          faceTo: s.competitors.faceTo(kind),
          pages: competitorPages,
          avis:
            inSale.length > 0
              ? s.competitors.avis(inSale.length, kind, advantaged, against, onlySurface, strengths)
              : null,
          source: s.competitors.source(day),
        }
      : null;

  let sales: MarketStudyStory['sales'] = null;
  let salesItem: { title: string; sub: string } | null = null;
  if (salesBlock) {
    const list = salesBlock.list;
    const since = salesBlock.since ?? SALES_COUNTED_SINCE;
    const keptIndexes = closestSales(list, {
      rooms: positive(input.subject?.rooms),
      surface: positive(input.subject?.surface),
    });
    const kept = keptIndexes
      .map((index) => ({ index, sale: list[index]! }))
      .sort((a, b) => b.sale.month.localeCompare(a.sale.month) || a.index - b.index);
    const markOf = new Map(kept.map((entry, i) => [entry.index, i + 1]));
    const prices = list.map((sale) => sale.price);
    const surfaceRange =
      salesBlock.surfaceMin != null && salesBlock.surfaceMax != null
        ? {
            from: formatNumber(salesBlock.surfaceMin, { language }),
            to: formatSquareMeters(salesBlock.surfaceMax, { language }),
          }
        : null;
    const keptSurfaces = kept
      .map((entry) => entry.sale.surface)
      .filter((value): value is number => value != null);
    const keptRooms = kept
      .map((entry) => entry.sale.rooms)
      .filter((value): value is number => value != null);
    const radius = salesBlock.listRadius != null ? meters(salesBlock.listRadius) : null;
    // Ce qui rapproche les ventes retenues du bien : le nombre de pièces, puis la surface (l'ordre de
    // `closestSales`) ; sans l'un ni l'autre pour le bien, ce sont les plus récentes.
    const keptFacts = [
      s.sales.rooms(keptRooms),
      keptSurfaces.length > 0
        ? s.sales.surface({
            from: formatNumber(Math.min(...keptSurfaces), { language }),
            to: formatSquareMeters(Math.max(...keptSurfaces), { language }),
          })
        : null,
    ].filter((fact): fact is string => fact != null);
    const ownRooms = positive(input.subject?.rooms) != null;
    const ownSurface = positive(input.subject?.surface) != null;
    const likeness =
      ownRooms || ownSurface
        ? {
            rooms: ownRooms,
            surface: ownSurface,
            facts: keptFacts.length > 0 ? keptFacts.join(', ') : null,
          }
        : null;
    const low = Math.min(...prices);
    const high = Math.max(...prices);
    const short = (value: number) =>
      q.sales.shortPrice(formatNumber(Math.round(value / 1000), { language }));
    sales = {
      band: {
        number: numberOf('sales'),
        title: s.sales.title(list.length, kind),
        lead: s.sales.lead(list.length, since, radius, surfaceRange, {
          from: euro(low),
          to: euro(high),
        }),
      },
      points: list.map((sale, index) => ({
        month: sale.month,
        price: sale.price,
        mark: markOf.get(index) ?? null,
      })),
      low: short(low),
      high: short(high),
      legendKept: s.sales.legendKept(kept.length),
      legendOthers:
        list.length > kept.length ? s.sales.legendOthers(list.length - kept.length) : null,
      tableTitle: s.sales.tableTitle(list.length, kept.length, kind, likeness != null),
      tableNote: likeness && kept.length < list.length ? s.sales.tableNote(likeness) : null,
      columns: q.sales.columns,
      rows: kept.map((entry, i) => ({
        mark: i + 1,
        month: formatMonth(entry.sale.month, language),
        street: entry.sale.street,
        rooms: entry.sale.rooms != null ? String(entry.sale.rooms) : null,
        surface:
          entry.sale.surface != null ? formatSquareMeters(entry.sale.surface, { language }) : null,
        distance: entry.sale.distance != null ? meters(entry.sale.distance) : null,
        price: euro(entry.sale.price),
      })),
      readTitle: s.sales.readTitle,
      read: s.sales.read,
      avis: s.sales.avis(
        kept.length,
        kind,
        s.sales.rooms(keptRooms),
        keptSurfaces.length > 0
          ? s.sales.surface({
              from: formatNumber(Math.min(...keptSurfaces), { language }),
              to: formatSquareMeters(Math.max(...keptSurfaces), { language }),
            })
          : null,
      ),
      // M159 — la date du choix : un document envoyé ne change plus.
      source: [
        q.source(q.sources.ventes, salesBlock.date ? formatDay(salesBlock.date, language) : null),
        `${s.sales.privacy} ${q.frozen(formatDay(input.quartier!.takenAt, language))}`,
      ].join('. '),
    };
    salesItem = {
      title: s.sales.item(list.length, kind, surfaceRange, since),
      sub: s.sales.itemSub(list.length, kept.length, kind, likeness),
    };
  }

  const subject = ranking.subject;
  const cheaper = subject ? subject.rank - 1 : 0;
  const rankingChapter: MarketStudyStory['ranking'] =
    hasRanking && subject
      ? {
          band: {
            number: numberOf('ranking'),
            title: s.ranking.title(euro(subject.price), cheaper, kind),
            lead: s.ranking.lead(subject.total - 1, kind),
          },
          verdictNote: s.ranking.verdictNote,
          avis: s.ranking.avis(cheaper, kind, strengths),
          source: s.ranking.source(day, subject.proposed, kind),
        }
      : null;

  let quartier: MarketStudyStory['quartier'] = null;
  let quartierItem: { title: string; sub: string } | null = null;
  if (hasQuartier) {
    const planning = blocks!.urbanisme;
    const permits = blocks!.permis;
    const risks = blocks!.risques;
    const parcelCount = planning
      ? PLANNING_CATEGORIES.reduce((sum, category) => sum + planning.parcel.counts[category], 0)
      : 0;
    const radius = permits?.radius != null ? meters(permits.radius) : meters(300);
    const permitsCount = permits?.build.length ?? 0;
    const permitsPhrase = permitsView ? s.quartier.permits(permitsCount, radius) : null;
    const conclusion = planningView
      ? parcelCount === 0
        ? s.quartier.parcelNothing
        : s.quartier.parcelCount(parcelCount)
      : permitsPhrase
        ? permitsPhrase
        : risksView
          ? s.quartier.risks
          : s.quartier.figures;
    const dwellings = permits?.build
      .map((permit) => permit.dwellings)
      .filter((value): value is number => value != null);
    const avis = risks?.floodArea
      ? s.quartier.avisFlood
      : permitsView
        ? s.quartier.avisPermits(
            permitsCount,
            // « en tout » seulement quand chaque permis dit son nombre de logements.
            dwellings && dwellings.length > 0 && dwellings.length === permitsCount
              ? dwellings.reduce((a, b) => a + b, 0)
              : null,
            radius,
          )
        : planningView
          ? s.quartier.avisParcel(parcelCount)
          : risksView
            ? s.quartier.avisRisks
            : null;
    const tile = (
      found: ReturnType<typeof view>,
      detail: (legend: { title: string; text: string }[]) => string[],
    ): StudyTile | null =>
      found && found.kind === 'rings'
        ? {
            title: found.title,
            headline: found.headline,
            detail: detail(found.legend),
            source: found.source,
          }
        : null;
    const cells: { title: string; text: string }[] = [];
    if (risksView && risksView.kind === 'risks') {
      for (const gauge of risksView.gauges)
        cells.push({ title: gauge.title, text: `${gauge.caption} · ${gauge.scale.toLowerCase()}` });
      if (risksView.flood)
        cells.push({ title: risksView.flood.title, text: risksView.flood.caption });
      if (risksView.disasters)
        cells.push({
          title: risksView.disasters.title,
          text: `${risksView.disasters.caption} · ${risksView.disasters.scale.toLowerCase()}`,
        });
    }
    if (populationView && populationView.kind === 'population')
      cells.push({
        title: s.quartier.residents,
        text: `${populationView.groups
          .map((group) => `${group.value} ${group.label}`)
          .join(
            ' · ',
          )} · ${populationView.scale.charAt(0).toLowerCase()}${populationView.scale.slice(1)}`,
      });
    quartier = {
      band: {
        number: numberOf('quartier'),
        title: s.quartier.title(conclusion),
        lead: s.quartier.lead(
          (
            [
              planningView ? 'planning' : null,
              permitsView ? 'permits' : null,
              risksView ? 'risks' : null,
              populationView ? 'population' : null,
              condominiumView ? 'condominium' : null,
            ] as const
          ).filter((part): part is NonNullable<typeof part> => part != null),
        ),
      },
      planning: tile(planningView, (legend) =>
        legend
          .slice(1)
          .filter((line) => line.text !== q.nothing)
          .map((line) => `${line.title}${language === 'en' ? ':' : ' :'} ${line.text}`),
      ),
      permits: tile(permitsView, (legend) =>
        legend.map((line) => [line.title, line.text].filter(Boolean).join(' · ')),
      ),
      risks:
        cells.length > 0
          ? {
              title: risksView?.title ?? populationView!.title,
              cells,
              source: [
                [risksView ? q.sources.risques : null, populationView ? q.sources.population : null]
                  .filter(Boolean)
                  .join(' · '),
                risksView ? s.quartier.risksNote : null,
              ]
                .filter(Boolean)
                .join('. '),
            }
          : null,
      condominium:
        condominiumView && condominiumView.kind === 'condominium'
          ? {
              title: condominiumView.title,
              headline: condominiumView.headline,
              detail: [
                condominiumView.scale,
                // Le nombre de lots est déjà dans la phrase : seul le syndic s'ajoute.
                ...condominiumView.chips
                  .filter((chip) => chip.text !== q.condominium.lots)
                  .map((chip) => `${chip.big} ${chip.text}`),
              ],
              source: condominiumView.source,
            }
          : null,
      talkTitle: s.quartier.talkTitle,
      split: false,
      talk: s.quartier.talk,
      frozen: q.frozen(formatDay(input.quartier!.takenAt, language)),
      avis,
    };
    quartier.split =
      quartierHeight({
        tileLines: Math.max(
          quartier.planning ? quartier.planning.detail.length + 2 : 0,
          quartier.permits ? quartier.permits.detail.length + 2 : 0,
        ),
        riskCells: cells.length,
        condominium: quartier.condominium != null,
        vivreIci: input.neighbourhood != null,
        avis: avis != null,
      }) > QUARTIER_ONE_PAGE_MM;
    const capital = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
    quartierItem = {
      title: s.quartier.item(conclusion),
      sub: [
        permitsPhrase && planningView ? capital(permitsPhrase) : null,
        risksView ? s.quartier.riskPapers : null,
      ]
        .filter(Boolean)
        .join(' '),
    };
  }

  // ─── Le résumé, page 2 : la place du prix en tête ─────────────────────────────────────────────
  const items: MarketStudyStory['summary']['items'] = [];
  // La page de chaque chapitre est posée une fois les pages imprimées décidées (plus bas).
  if (rankingChapter && subject) {
    items.push({
      chapter: 'ranking',
      number: 0,
      title: [
        { text: `${s.ranking.itemBefore}${subject.rank}` },
        { text: r.ordinal(subject.rank), sup: true },
        { text: s.ranking.itemAfter(subject.total, cheaper, kind) },
      ],
      sub: s.ranking.itemSub(euro(subject.price), subject.proposed, cheaper, kind),
      page: '',
      tier: subject.tier,
    });
  }
  if (competitors) {
    items.push({
      chapter: 'competitors',
      number: 0,
      title: [{ text: s.competitors.item(inSale.length, kind, priceRange) }],
      sub:
        inSale.length > 0
          ? s.competitors.itemSub(inSale.length, advantaged, against, weaker, strong, kind)
          : '',
      page: '',
      tier: null,
    });
  }
  if (salesItem) {
    items.push({
      chapter: 'sales',
      number: 0,
      title: [{ text: salesItem.title }],
      sub: salesItem.sub,
      page: '',
      tier: null,
    });
  }
  if (quartierItem) {
    items.push({
      chapter: 'quartier',
      number: 0,
      title: [{ text: quartierItem.title }],
      sub: quartierItem.sub,
      page: '',
      tier: null,
    });
  }
  items.forEach((item, index) => {
    item.number = index + 1;
  });

  const kpis: MarketStudyStory['summary']['kpis'] = [];
  if (inSale.length > 0)
    kpis.push({
      value: String(inSale.length),
      sup: null,
      rest: null,
      label: s.summary.kpiCompetitors(inSale.length, kind),
    });
  if (salesBlock)
    kpis.push({
      value: String(salesBlock.list.length),
      sup: null,
      rest: null,
      label: s.summary.kpiSales(
        salesBlock.list.length,
        kind,
        salesBlock.since ?? SALES_COUNTED_SINCE,
      ),
    });
  if (rankingChapter && subject)
    kpis.push({
      value: String(subject.rank),
      sup: r.ordinal(subject.rank),
      rest: r.of(subject.total),
      label: s.summary.kpiPlace,
    });
  // Correctifs 163 — à la place des sources (« 1 source, citée page 7 », qui n'apprenait rien) :
  // depuis combien de temps la moitié des biens en vente attendent un acheteur, lu sur leurs fiches
  // (la médiane basse : au moins la moitié le sont depuis ce temps ou plus). Sans deux durées
  // connues, pas de chiffre.
  // Une durée reconstituée (sans date de publication) est dite « environ », comme sur sa fiche.
  const waits = inSale
    .map((item) => item.daysOnMarket)
    .filter(
      (wait): wait is { days: number; approximate: boolean } => wait != null && wait.days >= 0,
    )
    .sort((a, b) => a.days - b.days);
  if (waits.length >= 2) {
    const half = waits[Math.floor((waits.length - 1) / 2)]!;
    kpis.push({
      value: String(half.days),
      sup: null,
      rest: s.summary.kpiDays(half.days, half.approximate),
      label: s.summary.kpiDaysLabel(kind),
    });
  }

  // ─── La couverture ────────────────────────────────────────────────────────────────────────────
  const property = input.subject;
  const canonical = property ? normalizePropertyType(property.propertyType) : null;
  const typeLabel =
    canonical != null && isPropertyType(canonical) ? texts.labels.propertyType[canonical] : null;
  const rooms = positive(property?.rooms);
  const surface = positive(property?.surface);
  const land = kind === 'maison' ? positive(property?.landArea) : null;
  const line = [
    typeLabel,
    rooms ? texts.common.rooms(rooms) : null,
    surface ? formatSquareMeters(surface, { language }) : null,
    land ? s.coverLand(formatSquareMeters(land, { language })) : null,
    property?.district?.trim() || null,
  ].filter(Boolean);
  const civility = studyCivility(input.sellerName);
  const salutation = civility ? s.salutation(civility, input.sellerName) : null;
  const agreed = subject ? euro(subject.price) : null;
  const priceKind = subject ? (subject.proposed ? 'proposed' : 'agreed') : null;

  const story: Omit<MarketStudyStory, 'print'> = {
    footer: s.footer(kind, commune, day),
    advisor: {
      name: advisorName,
      initials: initialsOf(advisorName ?? agency.name),
      photoUrl: agency.advisorPhotoUrl ?? null,
      by: avisBy,
    },
    cover: {
      kicker: s.kicker,
      title: s.coverTitle(kind, commune),
      line: line.length > 0 ? line.join(' · ') : null,
      preparedFor: s.preparedFor,
      by: s.preparedBy(advisorName, agency.name, day),
      contact: [agency.advisorPhone, agency.advisorEmail].filter(Boolean).join(' · ') || null,
    },
    summary: {
      title: s.summary.title(items.length, kind),
      lead: s.summary.lead(salutation, salesBlock != null),
      kpis,
      items,
      howTitle: s.summary.howTitle,
      how: s.summary.how(shown > 0, salesBlock != null, hasQuartier, kind),
      valueTitle: s.summary.valueTitle(kind),
      value: s.summary.value(agreed, subject?.proposed ?? false),
    },
    competitors,
    sales,
    ranking: rankingChapter,
    quartier,
    next: {
      title: s.next.title,
      steps: s.next.steps(kind),
      papersTitle: s.next.papersTitle,
      papers: s.next.papers(kind),
      questionsTitle: s.next.questionsTitle,
      contact: s.next.contact,
      isTitle: s.next.isTitle,
      is: s.next.is(kind, day, salesBlock != null, priceKind),
      sources,
      mentions: [
        agency.name,
        agency.postalAddress,
        agency.professionalCard
          ? `Carte professionnelle ${agency.professionalCard}${
              agency.professionalCardIssuer ? ` délivrée par ${agency.professionalCardIssuer}` : ''
            }`
          : null,
        agency.financialGuarantee?.trim() || 'Ne peut recevoir aucun fonds',
      ]
        .filter(Boolean)
        .join(' · '),
    },
  };

  // Correctifs 163 — les pages imprimées, puis les renvois du résumé vers elles : la page où
  // commence chaque chapitre (là où s'imprime son titre).
  const link = input.neighbourhood ?? null;
  const pages = studyPrintPages(story, {
    language,
    font: input.brandFont ?? null,
    vivreIci: link
      ? {
          heading: texts.neighbourhood.heading,
          text: link.printAddress
            ? texts.neighbourhood.scan(shortLinkAddress(link.url))
            : texts.neighbourhood.scanOnly,
          valid: link.validUntil
            ? texts.neighbourhood.validUntil(formatDay(link.validUntil, language, 'long'))
            : null,
        }
      : null,
    rankingRows: ranking.rows.map((row) => ({ subject: row.subject, detail: row.detail })),
    advisorQr: agency.advisorQr != null,
  });
  for (const item of items) {
    const at = pages.findIndex((page) =>
      page.units.some((unit) => unit.kind === 'band' && unit.chapter === item.chapter),
    );
    item.page = s.summary.page(at + 1);
  }
  return { ...story, print: { pages } };
}

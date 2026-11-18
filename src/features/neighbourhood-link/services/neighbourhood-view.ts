import type { RingBand } from '@/features/neighbourhood-link/components/neighbourhood-drawings';
import type {
  NeighbourhoodBlockKey,
  NeighbourhoodBlocks,
  PlanningLevel,
} from '@/features/neighbourhood-link/services/neighbourhood-blocks';
import {
  isShowableBlock,
  PLANNING_CATEGORIES,
  SALES_COUNTED_SINCE,
} from '@/features/neighbourhood-link/services/neighbourhood-blocks';
import type { ClientLanguage } from '@/lib/client-language';
import type { ClientTexts } from '@/lib/client-texts/types';
import {
  formatDay,
  formatEuro,
  formatMeters,
  formatMonth,
  formatNumber,
  formatSquareMeters,
} from '@/lib/format';

// Mission 159 — ce que dit chaque bloc du quartier, composé une fois pour le Live et pour les
// documents : des phrases recomposées depuis les chiffres, dans la langue du dossier (Jean-Guy,
// 17/11). « Rien de relevé », jamais « rien de prévu » ; chaque fait dit son échelle (la parcelle,
// à moins de N mètres, l'adresse du bien, la commune). Aucune moyenne, aucune comparaison. Pur.

// Les distances de la planche : la parcelle, à moins de 40 m, de 40 à 300 m.
const NEAR = 40;
const AROUND = 300;
// Les permis listés à l'écran, les plus proches d'abord.
const PERMITS_SHOWN = 4;

export type Gauge = {
  title: string;
  scale: string;
  value: number;
  labels: { number?: string; word: string }[];
  caption: string;
};

export type NeighbourhoodView =
  | {
      kind: 'rings';
      block: 'urbanisme' | 'permis';
      title: string;
      headline: string;
      scale: string;
      inner: RingBand;
      outer: RingBand;
      legend: { title: string; text: string }[];
      diagram: string | null;
      source: string | null;
    }
  | {
      kind: 'risks';
      title: string;
      headline: string;
      gauges: Gauge[];
      disasters: { title: string; scale: string; count: string; caption: string } | null;
      flood: { title: string; scale: string; caption: string } | null;
      source: string | null;
    }
  | {
      kind: 'population';
      title: string;
      headline: string;
      scale: string;
      groups: {
        value: string;
        label: string;
        pictograms: number;
        note: string | null;
        icon: 'person' | 'home';
      }[];
      source: string | null;
    }
  | {
      kind: 'condominium';
      title: string;
      headline: string;
      scale: string;
      lots: number;
      period: { from: number | null; to: number | null };
      built: string;
      today: string;
      chips: { big: string; text: string }[];
      source: string | null;
    }
  | {
      kind: 'sales';
      title: string;
      headline: string;
      scale: string | null;
      timeline: { month: string; price: number; label: string }[];
      cards: { price: string; month: string; street: string | null; facts: string }[];
      legend: string;
      source: string | null;
    };

const total = (level: PlanningLevel) =>
  PLANNING_CATEGORIES.reduce((sum, category) => sum + level.counts[category], 0);

export function neighbourhoodView(
  blocks: NeighbourhoodBlocks,
  key: NeighbourhoodBlockKey,
  texts: ClientTexts,
  language: ClientLanguage,
): NeighbourhoodView | null {
  const t = texts.quartier;
  // Un bloc qui ne dirait rien n'a pas d'écran (jamais un écran vide).
  if (!isShowableBlock(blocks, key)) return null;
  const meters = (value: number) => formatMeters(value, { language });
  const day = (value: string | null) => (value ? formatDay(value, language) : null);
  // La source publique, nommée par ACM dans la langue du vendeur ; le jour vient de la vue.
  const source = (block: { date: string | null }) => t.source(t.sources[key], day(block.date));
  const number = (value: number) => formatNumber(value, { language, maxDecimals: 1 });

  if (key === 'urbanisme') {
    const block = blocks.urbanisme;
    if (!block) return null;
    const describe = (level: PlanningLevel) => {
      if (total(level) === 0) return t.nothing;
      const items = PLANNING_CATEGORIES.filter((category) => level.counts[category] > 0).map(
        (category) => t.planning.item(category, level.counts[category]),
      );
      return [
        items.join(', '),
        level.nearest != null ? t.planning.nearest(meters(level.nearest)) : null,
      ]
        .filter(Boolean)
        .join(', ');
    };
    const near = total(block.within40);
    const around = total(block.within300);
    return {
      kind: 'rings',
      block: 'urbanisme',
      title: t.planning.title,
      headline: t.planning.headline(total(block.parcel), near, meters(NEAR)),
      scale: t.within(meters(AROUND)),
      inner: near
        ? {
            range: t.range('0', meters(NEAR)),
            count: String(near),
            label: t.planning.count(near),
            hit: true,
          }
        : { range: t.range('0', meters(NEAR)), count: t.nothing, hit: false },
      outer: around
        ? {
            range: t.range(String(NEAR), meters(AROUND)),
            count: String(around),
            label: t.planning.count(around),
            sub:
              block.within300.nearest != null
                ? t.planning.nearest(meters(block.within300.nearest))
                : undefined,
            hit: true,
          }
        : { range: t.range(String(NEAR), meters(AROUND)), count: t.nothing, hit: false },
      legend: [
        { title: t.planning.parcel, text: describe(block.parcel) },
        { title: t.range('0', meters(NEAR)), text: describe(block.within40) },
        { title: t.range(String(NEAR), meters(AROUND)), text: describe(block.within300) },
      ],
      diagram: t.diagram,
      source: source(block),
    };
  }

  if (key === 'permis') {
    const block = blocks.permis;
    if (!block) return null;
    const radius = block.radius ?? AROUND;
    const near = block.build.filter((permit) => permit.distance != null && permit.distance < NEAR);
    const around = block.build.filter((permit) => !near.includes(permit));
    const at = around
      .map((permit) => permit.distance)
      .filter((distance): distance is number => distance != null)
      .sort((a, b) => a - b)
      .map(meters);
    return {
      kind: 'rings',
      block: 'permis',
      title: t.permits.title,
      headline: t.permits.headline(block.build.length, meters(radius), block.since),
      scale: t.within(meters(radius)),
      inner: near.length
        ? {
            range: t.range('0', meters(NEAR)),
            count: `${near.length} ${t.permits.count(near.length)}`,
            hit: true,
          }
        : { range: t.range('0', meters(NEAR)), count: t.permits.none, hit: false },
      outer: around.length
        ? {
            range: t.range(String(NEAR), meters(radius)),
            count: String(around.length),
            label: t.permits.count(around.length),
            sub: at.length > 0 && at.length <= 3 ? t.permits.at(at) : undefined,
            hit: true,
          }
        : { range: t.range(String(NEAR), meters(radius)), count: t.permits.none, hit: false },
      // Les quatre plus proches seulement, pour que l'écran tienne sans défiler (M148 B) ; les
      // autres sont comptés dessous.
      legend: [
        ...[...block.build]
          .sort((x, y) => (x.distance ?? Infinity) - (y.distance ?? Infinity))
          .slice(0, PERMITS_SHOWN)
          .map((permit) => ({
            title: permit.street ?? '',
            text: t.permits.line({
              dwellings: permit.dwellings,
              surface:
                permit.surface != null ? formatSquareMeters(permit.surface, { language }) : null,
              state: permit.state,
              month: permit.authorizedOn
                ? formatMonth(permit.authorizedOn.slice(0, 7), language)
                : null,
              distance: permit.distance != null ? meters(permit.distance) : null,
            }),
          })),
        ...(block.build.length > PERMITS_SHOWN
          ? [
              {
                title: '',
                text: t.permits.more(block.build.length - PERMITS_SHOWN, meters(radius)),
              },
            ]
          : []),
      ],
      diagram: t.diagram,
      source: source(block),
    };
  }

  if (key === 'risques') {
    const block = blocks.risques;
    if (!block) return null;
    const r = t.risks;
    const gauges: Gauge[] = [];
    if (block.earthquake != null)
      gauges.push({
        title: r.earthquake,
        scale: t.scale.commune,
        value: block.earthquake,
        labels: r.earthquakeLevels.map((word, i) => ({ number: String(i + 1), word })),
        caption: r.earthquakeCaption(block.earthquake),
      });
    if (block.clay != null)
      gauges.push({
        title: r.clay,
        scale: t.scale.address,
        value: block.clay,
        labels: r.clayLevels.map((word) => ({ word })),
        caption: r.clayCaption(block.clay),
      });
    if (block.radon != null)
      gauges.push({
        title: r.radon,
        scale: t.scale.commune,
        value: block.radon,
        labels: r.radonLevels.map((word, i) => ({ number: String(i + 1), word })),
        caption: r.radonCaption(block.radon),
      });
    return {
      kind: 'risks',
      title: r.title,
      headline: r.headline(block.earthquake, block.clay),
      gauges,
      disasters: block.disasters
        ? {
            title: r.disasters,
            scale: t.scale.commune,
            count: String(block.disasters.count),
            caption: r.disastersCaption(block.disasters.count, day(block.disasters.latest)),
          }
        : null,
      flood: block.floodArea
        ? { title: r.flood, scale: t.scale.commune, caption: r.floodCaption(block.floodArea) }
        : null,
      source: source(block),
    };
  }

  if (key === 'population') {
    const block = blocks.population;
    if (!block || block.inhabitants == null) return null;
    const p = t.population;
    const groups: Extract<NeighbourhoodView, { kind: 'population' }>['groups'] = [];
    const counted = (value: number, label: string, icon: 'person' | 'home') => {
      const unit = pictogramUnitOf(value);
      groups.push({
        value: formatNumber(value, { language }),
        label,
        pictograms: Math.floor(value / unit),
        note: unit > 1 ? p.pictogram(formatNumber(unit, { language }), label) : null,
        icon,
      });
    };
    counted(block.inhabitants, p.inhabitants, 'person');
    if (block.households != null) counted(block.households, p.households, 'home');
    if (block.peoplePerHousehold != null)
      groups.push({
        value: number(block.peoplePerHousehold),
        label: p.perHousehold,
        // Des personnes entières seulement : « 2,2 » s'écrit, deux personnes se dessinent.
        pictograms: Math.floor(block.peoplePerHousehold),
        note: null,
        icon: 'person',
      });
    return {
      kind: 'population',
      title: p.title,
      headline: p.headline(formatNumber(block.inhabitants, { language })),
      scale: p.within(meters(block.radius ?? AROUND)),
      groups,
      source: source(block),
    };
  }

  if (key === 'copropriete') {
    const block = blocks.copropriete;
    if (!block) return null;
    const c = t.condominium;
    const chips: { big: string; text: string }[] = [];
    if (block.dwellingLots != null) chips.push({ big: String(block.dwellingLots), text: c.lots });
    if (block.syndicMandateActive) chips.push({ big: c.syndic, text: c.syndicActive });
    else if (block.syndicMandateEnded)
      chips.push({
        big: c.syndic,
        text: c.syndicEnded(formatDay(block.syndicMandateEnded, language)),
      });
    return {
      kind: 'condominium',
      title: c.title,
      headline: c.headline(block.dwellingLots, block.builtFrom, block.builtTo),
      scale: block.linkedToAddress ? c.atAddress : c.near(meters(block.distance ?? 0)),
      lots: Math.min(block.dwellingLots ?? 0, 12),
      period: { from: block.builtFrom, to: block.builtTo },
      built: c.built,
      today: c.today,
      chips,
      source: source(block),
    };
  }

  const block = blocks.ventes;
  if (!block) return null;
  const s = t.sales;
  return {
    kind: 'sales',
    title: s.title,
    headline: block.list.length
      ? s.headline(block.list.length, block.type, block.rooms, block.since ?? SALES_COUNTED_SINCE)
      : s.none,
    scale: block.listRadius != null ? s.within(meters(block.listRadius)) : null,
    timeline: block.list.map((sale) => ({
      month: sale.month,
      price: sale.price,
      label: s.shortPrice(formatNumber(Math.round(sale.price / 1000), { language })),
    })),
    cards: block.list.map((sale) => ({
      price: formatEuro(sale.price, { language }),
      month: formatMonth(sale.month, language),
      street: sale.street,
      facts: [
        sale.surface != null ? formatSquareMeters(sale.surface, { language }) : null,
        sale.distance != null ? s.about(meters(sale.distance)) : null,
      ]
        .filter(Boolean)
        .join(' · '),
    })),
    legend: s.legend,
    source: source(block),
  };
}

// Des pictogrammes entiers, douze au plus (planche M159-2, correction 3).
function pictogramUnitOf(value: number): number {
  for (const unit of [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000]) {
    if (Math.floor(value / unit) <= 12) return unit;
  }
  return 100000;
}

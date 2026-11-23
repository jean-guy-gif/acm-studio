import type {
  MarketStudyStory,
  StudyCard,
  StudyChapter,
  StudyTile,
} from '@/features/market-study/types';

// Correctifs 163 — l'Étude imprimée (retours de Jean-Guy du 23/11) : les pages se remplissent. Les
// blocs se suivent, chapitres compris, et un bloc ne passe à la page suivante que s'il n'y tient
// pas ; un titre de chapitre reste avec son premier bloc. Le code, et non le navigateur, décide des
// pages : chaque page porte son numéro écrit dans la page (« 3 / 6 »), et le résumé cite les pages où
// commencent les chapitres. Pur : des hauteurs estimées en millimètres, mesurées à l'impression sur
// les dossiers de démonstration (23/11), un peu larges par prudence. L'écran ne change pas.
// L'avis du conseiller (Jean-Guy, 23/11) : quand il tient avec son chapitre, il y reste ; sinon il
// ouvre la page suivante, et le dernier bloc ne descend pas avec lui. Un avis n'est jamais seul sur
// une page : ce qui suit (le chapitre suivant ou « La suite ») commence sur la même page.

// Une page A4 de 297 mm, imprimée sans marge : 10 mm en haut, 16 mm en bas pour le numéro.
export const PRINT_PAGE_MM = 296;
export const PRINT_TOP_MM = 10;
export const PRINT_BOTTOM_MM = 16;
export const PRINT_ROOM_MM = PRINT_PAGE_MM - PRINT_TOP_MM - PRINT_BOTTOM_MM;
// Le paginateur garde quelques millimètres de côté : une hauteur estimée un peu courte ne fait jamais
// déborder une page.
export const PRINT_SAFETY_MM = 2;
// L'espace entre deux blocs, à l'impression (print:gap-[3mm]).
export const PRINT_GAP_MM = 3;

export type PrintUnitKind =
  | 'cover'
  | 'summary-head'
  | 'summary-items'
  | 'summary-how'
  | 'band'
  | 'card'
  | 'avis'
  | 'sales-frise'
  | 'sales-table'
  | 'sales-read'
  | 'ranking-head'
  | 'ranking-row'
  | 'ranking-legend'
  | 'quartier-tiles'
  | 'quartier-risks'
  | 'quartier-talk'
  | 'quartier-extra'
  | 'next-head'
  | 'next-papers'
  | 'next-vivre'
  | 'next-contact'
  | 'next-is'
  | 'next-mentions';

export type PrintUnit = {
  kind: PrintUnitKind;
  // La hauteur estimée du bloc, l'espace qui le suit compris.
  mm: number;
  // `true` : un titre (ou une tête de tableau) qui ne reste jamais seul en bas d'une page.
  // `'soft'` : le même lien, qui cède seulement quand le groupe ne tient pas sur une page entière
  // (« La suite » derrière un avis qui, sans elle, serait seul sur sa page).
  keepWithNext?: boolean | 'soft';
  // Ce qu'un bloc coûte de plus quand il ouvre une suite de blocs du même genre sur une page : la
  // tête du tableau du classement, répétée sur chaque page.
  runStartMm?: number;
  chapter?: StudyChapter;
  // La fiche (index dans l'ordre des concurrents) ou la ligne du classement.
  index?: number;
};

export type PrintPage = { units: PrintUnit[]; mm: number };

// ─── Le paginateur ────────────────────────────────────────────────────────────────────────────────

const unitCost = (unit: PrintUnit, previous: PrintUnit | undefined): number =>
  unit.mm + (unit.runStartMm && previous?.kind !== unit.kind ? unit.runStartMm : 0);

// Les blocs dans l'ordre : chaque groupe (un titre et ce qui le suit) va sur la page en cours s'il y
// tient, sinon sur une page neuve. Un groupe plus haut qu'une page entière se défait à son lien
// souple ; sinon il reste seul sur la sienne.
// L'avis du conseiller a ses règles (Jean-Guy, 23/11) :
//  1. il reste avec son chapitre quand il tient derrière son dernier bloc ;
//  2. sinon il ouvre la page suivante, et ce qui suit commence sur la même page (jamais seul) ;
//  3. si ce qui suit ne tient pas sous lui, le dernier bloc de son chapitre descend avec lui ;
//  4. et si même cela est impossible (un classement entier de 12 lignes), « La suite » commence
//     sous lui et finit sur la page d'après.
export function paginateUnits(
  units: PrintUnit[],
  room = PRINT_ROOM_MM - PRINT_SAFETY_MM,
): PrintPage[] {
  const pages: PrintPage[] = [];
  let page: PrintPage = { units: [], mm: 0 };
  const cost = (group: PrintUnit[], previous: PrintUnit | undefined) =>
    group.reduce((sum, unit, k) => sum + unitCost(unit, k === 0 ? previous : group[k - 1]), 0);
  // Le dernier bloc d'une page n'a pas d'espace après lui.
  const fitsAlone = (group: PrintUnit[]) => cost(group, undefined) - PRINT_GAP_MM <= room;
  const fitsHere = (group: PrintUnit[]) =>
    page.units.length === 0 || page.mm + cost(group, page.units.at(-1)) - PRINT_GAP_MM <= room;
  // Un titre et ce qui le suit : les blocs liés à partir de `start`.
  const chain = (start: number) => {
    let end = start;
    while (end < units.length - 1 && units[end]!.keepWithNext) end += 1;
    return units.slice(start, end + 1);
  };
  const shrink = (group: PrintUnit[]) => {
    let kept = group;
    while (!fitsAlone(kept)) {
      const soft = kept.slice(0, -1).findLastIndex((unit) => unit.keepWithNext === 'soft');
      if (soft < 0) break;
      kept = kept.slice(0, soft + 1);
    }
    return kept;
  };

  let i = 0;
  while (i < units.length) {
    let group = shrink(chain(i));
    const first = group[0]!;
    const after = units[i + group.length];
    if (first.kind === 'avis') {
      // Règle 2 (et 4) : l'avis qui ne tient pas avec son chapitre emmène ce qui suit.
      if (!fitsHere(group) && after) {
        const led = shrink([first, ...chain(i + 1)]);
        if (led.length > 1 && fitsAlone(led)) group = led;
      }
    } else if (after?.kind === 'avis') {
      // `group` finit un chapitre, son avis le suit. Règle 3 : quand l'avis ne tiendra pas
      // derrière lui et que ce qui suit ne tient pas sous l'avis, ils descendent ensemble.
      const here = fitsHere(group);
      const used = (here ? page.mm : 0) + cost(group, here ? page.units.at(-1) : undefined);
      const stays = used + after.mm - PRINT_GAP_MM <= room;
      const following = chain(i + group.length + 1);
      if (!stays && !fitsAlone([after, ...following]) && fitsAlone([...group, after]))
        group = [...group, after];
    }
    if (!fitsHere(group)) {
      pages.push(page);
      page = { units: [], mm: 0 };
    }
    page.mm += cost(group, page.units.at(-1));
    page.units.push(...group);
    i += group.length;
  }
  if (page.units.length > 0) pages.push(page);
  return pages;
}

// ─── Les hauteurs estimées ────────────────────────────────────────────────────────────────────────

// Le nombre de lignes d'un texte coupé aux mots, pour un nombre de caractères par ligne.
export function textLines(text: string | null | undefined, perLine: number): number {
  if (!text) return 0;
  let lines = 1;
  let used = 0;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const length = word.length;
    if (used === 0) used = length;
    else if (used + 1 + length <= perLine) used += 1 + length;
    else {
      lines += 1;
      used = length;
    }
  }
  return lines;
}

// Les caractères par ligne, mesurés à l'impression (texte courant de 14 px, colonne de 182 mm).
const CPL = {
  bandTitle: 46,
  bandLead: 92,
  summaryTitle: 86,
  summarySub: 92,
  kpi: 28,
  half: 50,
  avis: 82,
  source: 145,
  full: 100,
  fullSmall: 112,
  talk: 112,
  is: 116,
  tileHead: 44,
  tileSmall: 56,
  third: 34,
  cardValue: 36,
  cardSmall: 78,
};

const bandMm = (title: string, lead: string, numbered = true) =>
  (numbered ? 24.2 : 18.2) +
  8.2 * textLines(title, CPL.bandTitle) +
  5.3 * textLines(lead, CPL.bandLead) +
  PRINT_GAP_MM;

const avisMm = (avis: string | null, source: string) =>
  (avis ? 8.4 + 5.25 * textLines(avis, CPL.avis) + PRINT_GAP_MM : 0) +
  3.5 * textLines(source, CPL.source) +
  PRINT_GAP_MM;

export function cardMm(card: StudyCard): number {
  const wraps = card.diffs.reduce(
    (sum, line) => sum + Math.max(0, textLines(line.value, CPL.cardValue) - 1),
    0,
  );
  const lines =
    42.5 +
    6.75 * card.diffs.length +
    4.6 * wraps +
    3.8 * Math.max(0, textLines(card.equivalentOn, CPL.cardSmall) - 1);
  return Math.max(62.5, card.diffs.length > 0 ? lines : 62.5) + PRINT_GAP_MM;
}

const tileMm = (tile: StudyTile, wide: boolean) =>
  4.6 +
  3.9 +
  5.1 * textLines(tile.headline, wide ? CPL.full : CPL.tileHead) +
  3.8 *
    tile.detail.reduce(
      (sum, line) => sum + textLines(line, wide ? CPL.fullSmall : CPL.tileSmall),
      0,
    ) +
  (tile.source ? 1 + 3.6 * textLines(tile.source, wide ? CPL.source : CPL.tileSmall) : 0) +
  1.5;

// Le classement se lit entier jusqu'à ce nombre de lignes, le bien du vendeur compris.
export const RANKING_WHOLE_ROWS = 12;

export type PrintFlags = {
  // Le lien « Vivre ici » du bien : imprimé avec le quartier, sinon sur la dernière page.
  vivreIci: boolean;
  // Les lignes du classement : celle du bien est plus haute, une ligne sans détail plus basse.
  rankingRows: { subject: boolean; detail: string | null }[];
};

// Les blocs de l'Étude, dans l'ordre du fil, avec leur hauteur estimée.
export function studyPrintUnits(
  story: Omit<MarketStudyStory, 'print'>,
  flags: PrintFlags,
): PrintUnit[] {
  const units: PrintUnit[] = [{ kind: 'cover', mm: PRINT_ROOM_MM }];
  const g = PRINT_GAP_MM;
  const summary = story.summary;
  const kpiLabel = Math.max(0, ...summary.kpis.map((kpi) => textLines(kpi.label, CPL.kpi)));
  units.push({
    kind: 'summary-head',
    mm:
      bandMm(summary.title, summary.lead, false) + (summary.kpis.length ? 13 + 3.7 * kpiLabel : 0),
  });
  units.push({
    kind: 'summary-items',
    mm:
      summary.items.reduce(
        (sum, item) =>
          sum +
          5.8 +
          4.6 * textLines(item.title.map((part) => part.text).join(''), CPL.summaryTitle) +
          (item.sub ? 0.5 + 4.65 * textLines(item.sub, CPL.summarySub) : 0) +
          (item.tier ? 2.7 : 0),
        0,
      ) + g,
  });
  units.push({
    kind: 'summary-how',
    mm:
      7.5 + 5 * Math.max(textLines(summary.how, CPL.half), textLines(summary.value, CPL.half)) + g,
  });

  const competitors = story.competitors;
  if (competitors) {
    units.push({
      kind: 'band',
      chapter: 'competitors',
      mm: bandMm(competitors.band.title, competitors.band.lead),
      keepWithNext: true,
    });
    competitors.pages.flat().forEach((card, index) => {
      units.push({ kind: 'card', chapter: 'competitors', index, mm: cardMm(card) });
    });
    units.push({
      kind: 'avis',
      chapter: 'competitors',
      mm: avisMm(competitors.avis, competitors.source),
    });
  }

  const sales = story.sales;
  if (sales) {
    units.push({
      kind: 'band',
      chapter: 'sales',
      mm: bandMm(sales.band.title, sales.band.lead),
      keepWithNext: true,
    });
    units.push({
      kind: 'sales-frise',
      chapter: 'sales',
      mm:
        54.2 +
        g +
        3.8 * textLines(`${sales.legendKept} ${sales.legendOthers ?? ''}`, CPL.fullSmall) +
        g,
    });
    units.push({
      kind: 'sales-table',
      chapter: 'sales',
      mm:
        6.6 +
        1 +
        (sales.tableNote ? 4.7 * textLines(sales.tableNote, CPL.fullSmall) : 0) +
        5.4 +
        8.3 * sales.rows.length +
        g,
    });
    units.push({
      kind: 'sales-read',
      chapter: 'sales',
      mm: 7.6 + 5.1 * sales.read.reduce((sum, line) => sum + textLines(line, CPL.full), 0) + g,
    });
    units.push({ kind: 'avis', chapter: 'sales', mm: avisMm(sales.avis, sales.source) });
  }

  const ranking = story.ranking;
  if (ranking) {
    units.push({
      kind: 'band',
      chapter: 'ranking',
      mm: bandMm(ranking.band.title, ranking.band.lead),
      keepWithNext: true,
    });
    units.push({
      kind: 'ranking-head',
      chapter: 'ranking',
      mm: 16.6 + 4.7 * textLines(ranking.verdictNote, 88) + g + 4.4 + g,
      keepWithNext: true,
    });
    flags.rankingRows.forEach((row, index, rows) => {
      units.push({
        kind: 'ranking-row',
        chapter: 'ranking',
        index,
        mm: row.subject ? 16.4 : row.detail ? 12.6 : 8,
        runStartMm: 5.6,
        // Le classement ne se coupe jamais (Jean-Guy, 23/11) : jusqu'à 12 lignes, le titre, le
        // verdict, la réglette, toutes les lignes et la légende vont ensemble, sur une page neuve
        // s'ils ne tiennent pas ; au-delà, il continue sur la page suivante, sa tête répétée, la
        // dernière ligne toujours avec la légende.
        keepWithNext: rows.length <= RANKING_WHOLE_ROWS || index === rows.length - 1,
      });
    });
    units.push({ kind: 'ranking-legend', chapter: 'ranking', mm: 4 + g });
    units.push({ kind: 'avis', chapter: 'ranking', mm: avisMm(ranking.avis, ranking.source) });
  }

  const quartier = story.quartier;
  if (quartier) {
    units.push({
      kind: 'band',
      chapter: 'quartier',
      mm: bandMm(quartier.band.title, quartier.band.lead),
      keepWithNext: true,
    });
    const tiles = [quartier.planning, quartier.permits].filter(
      (tile): tile is StudyTile => tile != null,
    );
    if (tiles.length > 0)
      units.push({
        kind: 'quartier-tiles',
        chapter: 'quartier',
        mm: Math.max(...tiles.map((tile) => tileMm(tile, tiles.length === 1))) + g,
      });
    if (quartier.risks) {
      const rows: number[] = [];
      quartier.risks.cells.forEach((cell, index) => {
        const lines = textLines(cell.text, 54);
        const row = Math.floor(index / 2);
        rows[row] = Math.max(rows[row] ?? 0, lines);
      });
      units.push({
        kind: 'quartier-risks',
        chapter: 'quartier',
        mm:
          4.6 +
          3.9 +
          1.2 +
          rows.reduce((sum, lines) => sum + 4.9 + 3.8 * lines + 2.4, 0) +
          1 +
          3.6 * textLines(quartier.risks.source, CPL.source) +
          g,
      });
    }
    units.push({
      kind: 'quartier-talk',
      chapter: 'quartier',
      mm:
        7.5 +
        4.65 *
          quartier.talk.reduce(
            (sum, line) => sum + textLines(`${line.lead} ${line.text}`, CPL.talk),
            0,
          ) +
        g,
    });
    if (quartier.condominium || flags.vivreIci) {
      const condominium = quartier.condominium ? tileMm(quartier.condominium, !flags.vivreIci) : 0;
      units.push({
        kind: 'quartier-extra',
        chapter: 'quartier',
        mm:
          (quartier.condominium && flags.vivreIci
            ? Math.max(condominium, VIVRE_ICI_MM)
            : condominium + (flags.vivreIci ? VIVRE_ICI_MM : 0)) + g,
      });
    }
    units.push({ kind: 'avis', chapter: 'quartier', mm: avisMm(quartier.avis, quartier.frozen) });
  }

  const next = story.next;
  units.push({
    kind: 'next-head',
    mm:
      5 +
      8.8 * textLines(next.title, CPL.bandTitle) +
      4.9 +
      7.2 +
      1 +
      6.6 +
      4.7 * Math.max(...next.steps.map((step) => textLines(step.text, CPL.third))) +
      6 +
      2 +
      g,
    keepWithNext: true,
  });
  // « La suite » ne se coupe pas (Jean-Guy, 23/11) : ses étapes, les papiers, le conseiller, « Ce que
  // cette étude est… », les sources et les mentions vont ensemble, sur une page neuve s'ils ne
  // tiennent pas (sa fin restait seule sur une dernière page presque vide). Elle tient toujours sur
  // une page.
  units.push({
    kind: 'next-papers',
    mm:
      Math.max(
        7.6 + next.papers.reduce((sum, paper) => sum + 2.3 + 4.7 * textLines(paper, CPL.half), 0),
        // Les lignes pour ses questions, à l'impression.
        7.6 + 6 * 7.5,
      ) + g,
    // Le seul lien qui peut céder : derrière un avis qui, sans elle, serait seul sur sa page.
    keepWithNext: 'soft',
  });
  if (!story.quartier && flags.vivreIci)
    units.push({ kind: 'next-vivre', mm: VIVRE_ICI_MM + g, keepWithNext: true });
  units.push({ kind: 'next-contact', mm: 21 + g, keepWithNext: true });
  units.push({
    kind: 'next-is',
    keepWithNext: true,
    mm:
      7.6 +
      4.7 * textLines(next.is, CPL.is) +
      (next.sources.length
        ? 2 + next.sources.reduce((sum, row) => sum + 2.2 + 3.8 * textLines(row.value, 90), 0)
        : 0) +
      g,
  });
  units.push({ kind: 'next-mentions', mm: 8.4 + g });

  return units;
}

// Le bloc « Vivre ici » imprimé : son QR code et la ligne qui le dit.
const VIVRE_ICI_MM = 30;

// Les pages imprimées de l'Étude : la couverture seule, puis le fil.
export function studyPrintPages(
  story: Omit<MarketStudyStory, 'print'>,
  flags: PrintFlags,
): PrintPage[] {
  const [cover, ...rest] = studyPrintUnits(story, flags);
  return [{ units: [cover!], mm: cover!.mm }, ...paginateUnits(rest)];
}

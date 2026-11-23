import metrics from '@/features/market-study/services/print-font-metrics.generated.json';
import type {
  MarketStudyStory,
  StudyCard,
  StudyChapter,
  StudyTile,
} from '@/features/market-study/types';
import { clientTexts, type TextLanguage } from '@/lib/client-texts';

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
//  3. si ce qui suit ne tient pas sous lui sur une page entière (un classement de 11 ou 12 lignes,
//     ou « La suite » d'un appartement avec son lien « Vivre ici », qui remplit presque une page),
//     le dernier bloc de son chapitre descend avec lui ;
//  4. et si même cela est impossible (ce dernier bloc est un classement entier, qui ne tient pas
//     sur une page avec son avis), « La suite » commence sous lui et finit sur la page d'après,
//     coupée à son seul lien souple, après les papiers.
// Les replis 3 et 4 sont rares (moins de 2 % des Études balayées par les tests) : ils cèdent, l'un
// sur « le dernier bloc ne descend pas », l'autre sur « « La suite » ne se coupe pas », pour tenir
// « un avis n'est jamais seul sur une page ».
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
// Chaque bloc est décrit par sa géométrie imprimée (marges, tailles, interlignes : les classes du
// document, texte courant de 14 px) et chaque texte est mis en lignes avec la largeur réelle de ses
// caractères dans la police de l'agence (`print-font-metrics.generated.json`, mesurée par
// `scripts/print-font-metrics.mjs`). Compter les caractères ne tenait ni d'une langue à l'autre ni
// d'une police à l'autre : des pages sortaient de leur feuille (relecture du 23/11). Le banc
// `npm run banc:etude` mesure un millier d'Études, dans les deux langues et les sept polices.

// Un millimètre par pixel CSS, et le texte courant de l'impression (`html{font-size:14px}`).
const MM = 25.4 / 96;
const REM = 14;
// La colonne du texte : 210 mm moins deux marges de 14 mm.
const CONTENT = 182 / MM;
const GAP = PRINT_GAP_MM / MM;

type Weight = 400 | 600 | 700;
type TextStyle = {
  // La taille en pixels, à l'impression.
  size: number;
  weight?: Weight;
  // Un titre (`font-title`) : la police des titres, et son interlettrage de 0,01 em.
  title?: boolean;
};
type Run = { text: string; style: TextStyle };

const CHAR_INDEX = new Map([...metrics.chars].map((char, index) => [char, index]));
const WIDTHS: Record<string, Record<string, number[]>> = metrics.widths;
// Un caractère inconnu compte comme le plus large.
const UNKNOWN_CHAR = 1100;
// Le texte imprimé est crêné : mesuré, il fait de 98,7 % à 100,1 % de la somme de ses caractères.
// Cette marge couvre l'arrondi ; plus large, elle compterait une ligne de trop aux textes qui
// tiennent tout juste (la source sous l'avis des biens en vente).
const WIDTH_MARGIN = 1.003;

// La police de la charte d'une agence, lue dans ses déclarations (`--font-title: var(--font-x)`,
// écrites par `brandingFontDeclarations`) ; null sans police choisie.
export function printFontOf(brandDeclarations: string): string | null {
  const key = /--font-title:\s*var\(--font-([a-z-]+)\)/.exec(brandDeclarations)?.[1];
  return key && key in WIDTHS ? key : null;
}

// Les polices où un texte peut s'imprimer. Les titres : la police de l'agence, sinon Rajdhani. Le
// texte courant : la police de l'agence dans l'outil, Montserrat sur le lien public (la charte n'y
// touche que les titres) : on compte le caractère le plus large des deux.
const fontsOf = (font: string | null, title: boolean): string[] =>
  title
    ? [font ?? 'rajdhani']
    : font && font !== 'montserrat'
      ? [font, 'montserrat']
      : ['montserrat'];

function textWidth(text: string, style: TextStyle, font: string | null): number {
  const fonts = fontsOf(font, style.title ?? false);
  const weight = String(style.weight ?? 400);
  let width = 0;
  for (const char of text) {
    const index = CHAR_INDEX.get(char);
    let advance = 0;
    for (const name of fonts)
      advance = Math.max(advance, index == null ? UNKNOWN_CHAR : WIDTHS[name]![weight]![index]!);
    width += advance + (style.title ? 10 : 0);
  }
  return (width * style.size * WIDTH_MARGIN) / 1000;
}

// Le nombre de lignes d'un texte dans une colonne de `width` pixels, coupé aux espaces et après un
// trait d'union, comme le navigateur. Plusieurs passages de styles différents se suivent sur la
// même ligne (un mot en gras, puis la phrase).
export function lineCount(runs: Run[], width: number, font: string | null): number {
  let lines = 0;
  let used = 0;
  for (const run of runs) {
    const space = textWidth(' ', run.style, font);
    for (const word of run.text.split(/[ \n\t]+/).filter(Boolean)) {
      word.split(/(?<=-)/).forEach((part, k) => {
        const size = textWidth(part, run.style, font);
        const gap = k === 0 && used > 0 ? space : 0;
        if (lines === 0) lines = 1;
        if (used > 0 && used + gap + size > width) {
          lines += 1;
          used = size;
        } else used += gap + size;
      });
    }
  }
  return lines;
}

const BODY: TextStyle = { size: 0.9 * REM };
const SMALL: TextStyle = { size: 0.875 * REM };
const TINY: TextStyle = { size: 0.75 * REM };
const SOURCE: TextStyle = { size: 0.68 * REM };
const bold = (style: TextStyle): TextStyle => ({ ...style, weight: 700 });
const title = (rem: number): TextStyle => ({ size: rem * REM, weight: 700, title: true });
// Les interlignes : le texte courant (1,5), `text-sm` (17,5 px), `text-xs` (14 px), `leading-snug`.
const LINE = { body: 0.9 * REM * 1.5, small: 17.5, tiny: 14, source: 0.68 * REM * 1.375, h3: 24.5 };

export type PrintContext = {
  language: TextLanguage;
  // La police de la charte de l'agence (`printFontOf`), ou null : Montserrat et Rajdhani.
  font: string | null;
  // Le lien « Vivre ici » du bien, imprimé avec le quartier, sinon sur la dernière page : son
  // titre, sa phrase (coupée n'importe où, c'est une adresse) et sa date de validité.
  vivreIci: { heading: string; text: string; valid: string | null } | null;
  // Les lignes du classement : celle du bien est plus haute, une ligne sans détail plus basse.
  rankingRows: { subject: boolean; detail: string | null }[];
  // Le QR code de la carte de contact du conseiller, sur la dernière page.
  advisorQr: boolean;
};

// Le classement se lit entier jusqu'à ce nombre de lignes, le bien du vendeur compris.
export const RANKING_WHOLE_ROWS = 12;

// Les blocs de l'Étude, dans l'ordre du fil, avec leur hauteur estimée.
export function studyPrintUnits(
  story: Omit<MarketStudyStory, 'print'>,
  context: PrintContext,
): PrintUnit[] {
  const { font } = context;
  const lines = (text: string | null | undefined, width: number, style: TextStyle) =>
    text ? lineCount([{ text, style }], width, font) : 0;
  // Une hauteur en pixels devient des millimètres, l'espace qui suit le bloc compris.
  const mm = (pixels: number) => (pixels + GAP) * MM;
  const units: PrintUnit[] = [{ kind: 'cover', mm: PRINT_ROOM_MM }];

  // Un bandeau : marges de 9 et 6 mm, le numéro du chapitre, le titre, le chapeau.
  const BAND_PADDING = (9 + 6) / MM;
  const band = (heading: string, lead: string, numbered: boolean) =>
    BAND_PADDING +
    (numbered ? 27.5 : 0) +
    lines(heading, 175 / MM, title(2.1)) * 2.1 * REM * 1.05 +
    (lead ? 8.75 + lines(lead, 165 / MM, { size: 0.95 * REM }) * 0.95 * REM * 1.5 : 0);

  // L'avis du conseiller (sa ligne, sa phrase), puis la source du chapitre.
  const avis = (text: string | null, source: string) =>
    (text
      ? 7 +
        1.5 +
        14 +
        14 +
        1.75 +
        lines(text, CONTENT - 49, { size: 1.02 * REM, weight: 600 }) * 1.02 * REM * 1.375 +
        GAP
      : 0) +
    lines(source, CONTENT, SOURCE) * LINE.source;

  // Une case du quartier : son titre, sa phrase en gras, ses lignes, sa source.
  const tile = (item: StudyTile, width: number) =>
    2 +
    14 +
    13.86 +
    1.75 +
    lines(item.headline, width - 30, bold(BODY)) * 0.9 * REM * 1.375 +
    item.detail.reduce((sum, line) => sum + 1.75 + lines(line, width - 30, TINY) * LINE.tiny, 0) +
    (item.source ? 5.25 + lines(item.source, width - 30, SOURCE) * LINE.source : 0);

  // Le lien « Vivre ici » : son QR code de 70 px, ou ses lignes si elles sont plus hautes.
  const vivreIci = (width: number) => {
    const link = context.vivreIci;
    if (!link) return 0;
    const column = width - 124;
    return (
      26.5 +
      Math.max(
        70,
        lines(link.heading, column, title(1)) * 21 +
          3.5 +
          Math.max(1, Math.ceil(textWidth(link.text, SMALL, font) / column)) * LINE.small +
          (link.valid ? 3.5 + lines(link.valid, column, TINY) * LINE.tiny : 0),
      )
    );
  };
  const HALF = (CONTENT - 10.5) / 2;

  // ─── Ce que cette étude vous apprend ─────────────────────────────────────────────────────────
  const summary = story.summary;
  const kpiColumn = (CONTENT - 3 * 14) / 4;
  units.push({
    kind: 'summary-head',
    mm: mm(
      band(summary.title, summary.lead, false) +
        (summary.kpis.length
          ? 17.5 +
            Math.max(
              ...summary.kpis.map(
                (kpi) =>
                  lines(
                    `${kpi.value}${kpi.sup ?? ''}${kpi.rest ? ` ${kpi.rest}` : ''}`,
                    kpiColumn,
                    title(2.25),
                  ) *
                    2.25 *
                    REM +
                  3.5 +
                  lines(kpi.label, kpiColumn, TINY) * LINE.tiny,
              ),
            )
          : 0),
    ),
  });
  // Le renvoi (« page 3 ») n'est connu qu'une fois les pages décidées : sa place est réservée.
  const reference = textWidth('page 00', TINY, font);
  units.push({
    kind: 'summary-items',
    mm: mm(
      summary.items.reduce((sum, item) => {
        const width = CONTENT - 28 - 14 - 14 - reference - (item.tier ? 24 : 0);
        const text =
          lines(item.title.map((part) => part.text).join(''), width, bold(BODY)) *
            0.9 *
            REM *
            1.375 +
          (item.sub ? 1.75 + lines(item.sub, width, SMALL) * LINE.small : 0);
        return sum + Math.max(31.5, text) + 21 + (item.tier ? 10 : 1);
      }, 0),
    ),
  });
  const column = (CONTENT - 21) / 2;
  units.push({
    kind: 'summary-how',
    mm: mm(
      Math.max(
        lines(summary.howTitle, column, title(1.125)) * LINE.h3 +
          3.5 +
          lines(summary.how, column, BODY) * LINE.body,
        lines(summary.valueTitle, column, title(1.125)) * LINE.h3 +
          3.5 +
          lines(summary.value, column, BODY) * LINE.body,
      ),
    ),
  });

  // ─── Les biens en vente ──────────────────────────────────────────────────────────────────────
  const competitors = story.competitors;
  if (competitors) {
    const chips = clientTexts(context.language).common.grid.status;
    const chip = (status: keyof typeof chips) =>
      textWidth(chips[status], { size: 0.66 * REM }, font) + 16;
    const card = (item: StudyCard) => {
      const width = CONTENT - 2 - (item.photoUrl ? 58 / MM : 0) - 28;
      const half = (width - 10.5) / 2;
      const figures = Math.max(
        13.02 + 21 + (item.perSquareMeter ? LINE.tiny : 0),
        item.since
          ? 13.02 +
              lines(item.since.value, half, title(1.5)) * 21 +
              (item.drop
                ? lines(`${item.drop.label} · ${item.drop.value}`, half, TINY) * LINE.tiny
                : 0)
          : 0,
      );
      const rows =
        item.diffs.reduce((sum, line) => {
          const value = width - 84 - 7 - chip(line.status) - 7;
          return (
            sum +
            Math.max(lines(line.label, 84, SMALL), lines(line.value, value, SMALL)) * LINE.small +
            8
          );
        }, 0) +
        (item.equivalentAll
          ? lines(item.equivalentAll, width - chip('same') - 7, SMALL) * LINE.small + 7
          : 0) +
        (item.equivalentOn ? 5.25 + lines(item.equivalentOn, width, TINY) * LINE.tiny : 0);
      const content =
        21 +
        13.02 +
        1.75 +
        lines(item.label, width, title(1.125)) * 1.125 * REM * 1.25 +
        7 +
        figures +
        8 +
        (item.diffs.length > 0 || item.equivalentAll ? 7 + 13.02 + rows : 0);
      // Une fiche fait 62 mm au moins.
      return Math.max(62 / MM, content + 3.5);
    };
    units.push({
      kind: 'band',
      chapter: 'competitors',
      mm: mm(band(competitors.band.title, competitors.band.lead, true)),
      keepWithNext: true,
    });
    competitors.pages.flat().forEach((item, index) => {
      units.push({ kind: 'card', chapter: 'competitors', index, mm: mm(card(item)) });
    });
    units.push({
      kind: 'avis',
      chapter: 'competitors',
      mm: mm(avis(competitors.avis, competitors.source)),
    });
  }

  // ─── Les ventes réelles ──────────────────────────────────────────────────────────────────────
  const sales = story.sales;
  if (sales) {
    units.push({
      kind: 'band',
      chapter: 'sales',
      mm: mm(band(sales.band.title, sales.band.lead, true)),
      keepWithNext: true,
    });
    // La frise (640 × 190 à la largeur de la colonne) et sa légende, sur une ligne si elle y tient.
    const legend =
      31.5 +
      textWidth(sales.legendKept, TINY, font) +
      (sales.legendOthers ? 14 + textWidth(sales.legendOthers, TINY, font) : 0);
    units.push({
      kind: 'sales-frise',
      chapter: 'sales',
      mm: mm((CONTENT * 190) / 640 + GAP + (legend > CONTENT ? 2 * LINE.tiny + 3.5 : LINE.tiny)),
    });
    units.push({
      kind: 'sales-table',
      chapter: 'sales',
      mm: mm(
        lines(sales.tableTitle, CONTENT, title(1.125)) * LINE.h3 +
          lines(sales.tableNote, CONTENT, SMALL) * LINE.small +
          3.5 +
          21.7 +
          sales.rows.reduce(
            // Une rue très longue passe à la ligne dans sa colonne.
            (sum, row) => sum + 30.7 + (lines(row.street, 230, SMALL) > 1 ? LINE.small : 0),
            0,
          ),
      ),
    });
    units.push({
      kind: 'sales-read',
      chapter: 'sales',
      mm: mm(
        lines(sales.readTitle, CONTENT, title(1.125)) * LINE.h3 +
          3.5 +
          sales.read.reduce((sum, line) => sum + lines(line, CONTENT - 17.5, BODY) * LINE.body, 0),
      ),
    });
    units.push({ kind: 'avis', chapter: 'sales', mm: mm(avis(sales.avis, sales.source)) });
  }

  // ─── Où se place votre prix ──────────────────────────────────────────────────────────────────
  const ranking = story.ranking;
  if (ranking) {
    units.push({
      kind: 'band',
      chapter: 'ranking',
      mm: mm(band(ranking.band.title, ranking.band.lead, true)),
      keepWithNext: true,
    });
    // Le verdict (sa pastille de 38,5 px, son titre, sa phrase), puis la réglette.
    units.push({
      kind: 'ranking-head',
      chapter: 'ranking',
      mm: mm(
        31 +
          Math.max(
            38.5,
            26.25 + 1.75 + lines(ranking.verdictNote, CONTENT - 83.5, SMALL) * LINE.small,
          ) +
          GAP +
          14,
      ),
      keepWithNext: true,
    });
    context.rankingRows.forEach((row, index, rows) => {
      units.push({
        kind: 'ranking-row',
        chapter: 'ranking',
        index,
        mm:
          (row.subject
            ? 24.5 + Math.max(24.5, 18.9 + (row.detail ? LINE.small : 0))
            : 11.5 + Math.max(24.5, 18.9 + (row.detail ? LINE.small : 0))) * MM,
        // La tête du tableau, répétée sur chaque page, et l'espace qui suit le tableau.
        runStartMm: (23.52 + GAP) * MM,
        // Le classement ne se coupe jamais (Jean-Guy, 23/11) : jusqu'à 12 lignes, le titre, le
        // verdict, la réglette, toutes les lignes et la légende vont ensemble, sur une page neuve
        // s'ils ne tiennent pas ; au-delà, il continue sur la page suivante, sa tête répétée, la
        // dernière ligne toujours avec la légende.
        keepWithNext: rows.length <= RANKING_WHOLE_ROWS || index === rows.length - 1,
      });
    });
    units.push({ kind: 'ranking-legend', chapter: 'ranking', mm: mm(LINE.tiny) });
    units.push({ kind: 'avis', chapter: 'ranking', mm: mm(avis(ranking.avis, ranking.source)) });
  }

  // ─── Ce que votre acheteur demandera ─────────────────────────────────────────────────────────
  const quartier = story.quartier;
  if (quartier) {
    units.push({
      kind: 'band',
      chapter: 'quartier',
      mm: mm(band(quartier.band.title, quartier.band.lead, true)),
      keepWithNext: true,
    });
    // L'urbanisme et les permis côte à côte ; une case seule garde sa demi-largeur.
    const tiles = [quartier.planning, quartier.permits].filter(
      (item): item is StudyTile => item != null,
    );
    if (tiles.length > 0)
      units.push({
        kind: 'quartier-tiles',
        chapter: 'quartier',
        mm: mm(Math.max(...tiles.map((item) => tile(item, HALF)))),
      });
    if (quartier.risks) {
      // Les risques sur deux colonnes : chaque rangée a la hauteur de sa case la plus haute.
      const cell = (CONTENT - 2 - 28 - 21) / 2;
      const rows: number[] = [];
      quartier.risks.cells.forEach((item, index) => {
        const height =
          lines(item.title, cell, bold(SMALL)) * LINE.small +
          lines(item.text, cell, TINY) * LINE.tiny +
          4.5;
        const row = Math.floor(index / 2);
        rows[row] = Math.max(rows[row] ?? 0, height);
      });
      units.push({
        kind: 'quartier-risks',
        chapter: 'quartier',
        mm: mm(
          2 +
            14 +
            13.86 +
            3.5 +
            rows.reduce((sum, height) => sum + height, 0) +
            3.5 * Math.max(0, rows.length - 1) +
            3.5 +
            lines(quartier.risks.source, CONTENT - 30, SOURCE) * LINE.source,
        ),
      });
    }
    units.push({
      kind: 'quartier-talk',
      chapter: 'quartier',
      mm: mm(
        lines(quartier.talkTitle, CONTENT, title(1.125)) * LINE.h3 +
          3.5 +
          quartier.talk.reduce(
            (sum, line) =>
              sum +
              lineCount(
                [
                  { text: line.lead, style: bold(SMALL) },
                  { text: line.text, style: SMALL },
                ],
                CONTENT - 17.5,
                font,
              ) *
                LINE.small,
            0,
          ),
      ),
    });
    if (quartier.condominium || context.vivreIci)
      units.push({
        kind: 'quartier-extra',
        chapter: 'quartier',
        mm: mm(
          quartier.condominium && context.vivreIci
            ? Math.max(tile(quartier.condominium, HALF), vivreIci(HALF))
            : quartier.condominium
              ? tile(quartier.condominium, CONTENT)
              : vivreIci(CONTENT),
        ),
      });
    units.push({ kind: 'avis', chapter: 'quartier', mm: mm(avis(quartier.avis, quartier.frozen)) });
  }

  // ─── La suite ────────────────────────────────────────────────────────────────────────────────
  // « La suite » ne se coupe pas (Jean-Guy, 23/11) : ses étapes, les papiers, le conseiller, « Ce que
  // cette étude est… », les sources et les mentions vont ensemble, sur une page neuve s'ils ne
  // tiennent pas (sa fin restait seule sur une dernière page presque vide). Elle tient toujours sur
  // une page.
  const next = story.next;
  const step = (CONTENT - 2 * 17.5) / 3;
  units.push({
    kind: 'next-head',
    mm: mm(
      BAND_PADDING +
        lines(next.title, CONTENT, title(1.875)) * 1.875 * REM * 1.25 +
        14 +
        Math.max(
          ...next.steps.map(
            (item) =>
              // Le chiffre de l'étape : 26,25 px en Rajdhani, deux de plus dans une police de charte.
              28.25 +
              3.5 +
              lines(item.title, step, title(1.125)) * LINE.h3 +
              lines(item.text, step, SMALL) * LINE.small,
          ),
        ),
    ),
    keepWithNext: true,
  });
  units.push({
    kind: 'next-papers',
    mm: mm(
      Math.max(
        lines(next.papersTitle, column, title(1.125)) * LINE.h3 +
          3.5 +
          next.papers.reduce(
            (sum, paper) => sum + lines(paper, column - 17.5, SMALL) * LINE.small + 8,
            0,
          ),
        // Les six lignes de 7,5 mm pour ses questions, à l'impression.
        lines(next.questionsTitle, column, title(1.125)) * LINE.h3 + (6 * 7.5) / MM,
      ),
    ),
    // Le seul lien qui peut céder : derrière un avis qui, sans elle, serait seul sur sa page.
    keepWithNext: 'soft',
  });
  if (!story.quartier && context.vivreIci)
    units.push({ kind: 'next-vivre', mm: mm(vivreIci(CONTENT)), keepWithNext: true });
  units.push({
    kind: 'next-contact',
    mm: mm(2 + 21 + Math.max(55.02, context.advisorQr ? 56 : 0)),
    keepWithNext: true,
  });
  const sourceLabel = 140 - 10.5;
  units.push({
    kind: 'next-is',
    keepWithNext: true,
    mm: mm(
      lines(next.isTitle, CONTENT, title(1.125)) * LINE.h3 +
        3.5 +
        lines(next.is, CONTENT, SMALL) * LINE.small +
        (next.sources.length
          ? 7 +
            next.sources.reduce(
              (sum, row) =>
                sum +
                Math.max(
                  lines(row.label, sourceLabel, bold(TINY)),
                  lines(row.value, CONTENT - 140, TINY),
                ) *
                  LINE.tiny +
                8,
              0,
            )
          : 0),
    ),
  });
  units.push({
    kind: 'next-mentions',
    mm: mm(lines(next.mentions, CONTENT, SOURCE) * 0.68 * REM * 1.625),
  });
  return units;
}

// Les pages imprimées de l'Étude : la couverture seule, puis le fil.
export function studyPrintPages(
  story: Omit<MarketStudyStory, 'print'>,
  context: PrintContext,
): PrintPage[] {
  const [cover, ...rest] = studyPrintUnits(story, context);
  return [{ units: [cover!], mm: cover!.mm }, ...paginateUnits(rest)];
}

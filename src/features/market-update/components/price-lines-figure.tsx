import { MARKET_UPDATE_STATE_LABELS } from '@/features/market-update/services/market-update-summary';
import type {
  MarketUpdateCompetitor,
  MarketUpdateSummary,
} from '@/features/market-update/services/market-update-summary';
import { NO_NEWCOMER_LABEL } from '@/features/market-update/services/price-lines';
import type { PriceAlignment } from '@/features/price-positioning/services/price-alignment';
import { formatEuro, formatPercent } from '@/lib/format';

// Mission 127 B — la figure « Où en est votre prix » (maquette M127B-lignes, principes de Jean-Guy
// du 29/10) : trois lignes serrées à la même échelle, la fourchette du marché en bande douce, la
// médiane en trait fin, le prix du vendeur en barre verticale pleine (couleur M116) qui traverse
// les trois lignes, le plus dangereux en losange rouge, les autres concurrents en points gris, les
// disparus en points vides avec leur mention, une flèche par concurrent qui a bougé entre la ligne 1
// et la ligne 2 avec son écart, la légende une seule fois en haut, chiffres en gros, étiquettes
// courtes, la phrase de fait sous chaque ligne. Un SVG, lisible en noir et blanc (barre, trait,
// losange, point plein, point vide, bande grise), mis à l'échelle de la colonne et de l'A4.

const WIDTH = 700;
const X0 = 150;
const X1 = 672;
const BAND_H = 16;
const POINT_R = 5;
const LEVEL_H = 32;
const PHRASE_SIZE = 13;
const PHRASE_LINE = 18;

const COLORS = {
  band: '#d4e4f3',
  grid: '#eef2f6',
  axis: '#a1a1aa',
  point: '#94a3b8',
  text: '#27272a',
  muted: '#71717a',
  median: 'var(--color-brand-deep)',
  dangerous: '#dc2626',
  drop: '#047857',
  rise: '#52525b',
} as const;

const BAR_COLOR = { green: '#047857', orange: '#d97706', red: '#dc2626' } as const;

type LineKey = 'meeting' | 'today' | 'newcomers';

type Label = {
  key: string;
  text: string;
  value: string;
  x: number;
  anchor: 'start' | 'middle' | 'end';
  color: string;
  italic?: boolean;
};

const STEPS = [10_000, 20_000, 25_000, 50_000, 100_000, 200_000, 250_000, 500_000, 1_000_000];

function axisDomain(min: number, max: number): { from: number; to: number; step: number } {
  const span = Math.max(1, max - min);
  const step = STEPS.find((candidate) => span / candidate <= 7) ?? STEPS[STEPS.length - 1];
  const from = Math.floor(min / step) * step;
  const to = Math.ceil(max / step) * step;
  return { from, to: to > from ? to : from + step, step };
}

const widthOf = (label: Label): number =>
  Math.max(label.text.length * 6.6, label.value.length * 8.8);

function spanOf(label: Label): [number, number] {
  const w = widthOf(label);
  return label.anchor === 'start'
    ? [label.x, label.x + w]
    : label.anchor === 'end'
      ? [label.x - w, label.x]
      : [label.x - w / 2, label.x + w / 2];
}

// Une étiquette reste dans la page et ne passe jamais sur la barre du prix : elle glisse jusqu'à
// la marge, puis, si elle croise la barre, du côté de la barre le plus proche de son repère.
function fit(label: Label, barX: number | null): Label {
  const w = widthOf(label);
  const minFrom = X0 - 36;
  const maxTo = WIDTH - 4;
  const clamp = (candidate: Label): Label => {
    const [from, to] = spanOf(candidate);
    if (to > maxTo) return { ...candidate, anchor: 'end', x: maxTo };
    if (from < minFrom) return { ...candidate, anchor: 'start', x: minFrom };
    return candidate;
  };
  const placed = clamp(label);
  if (barX == null) return placed;
  const [from, to] = spanOf(placed);
  if (barX < from - 6 || barX > to + 6) return placed;
  const left: Label = clamp({ ...placed, anchor: 'end', x: barX - 8 });
  const right: Label = clamp({ ...placed, anchor: 'start', x: barX + 8 });
  const crosses = (candidate: Label) => {
    const [a, b] = spanOf(candidate);
    return barX >= a - 6 && barX <= b + 6;
  };
  const centre = (candidate: Label) => {
    const [a, b] = spanOf(candidate);
    return (a + b) / 2;
  };
  const options = [left, right].filter((candidate) => !crosses(candidate));
  if (options.length === 0) return placed;
  options.sort((a, b) => Math.abs(centre(a) - label.x) - Math.abs(centre(b) - label.x));
  // Un déport raisonnable (une largeur d'étiquette) ; au-delà, mieux vaut croiser la barre.
  return Math.abs(centre(options[0]) - label.x) <= w ? options[0] : placed;
}

// Les étiquettes d'un même côté sur des niveaux : le premier où rien ne se touche.
function levels(labels: Label[]): { label: Label; level: number }[] {
  const taken: [number, number][][] = [[], [], []];
  return [...labels]
    .sort((a, b) => a.x - b.x)
    .map((label) => {
      const span = spanOf(label);
      let level = taken.findIndex((rows) =>
        rows.every(([from, to]) => span[1] + 8 <= from || span[0] - 8 >= to),
      );
      if (level === -1) level = taken.length - 1;
      taken[level].push(span);
      return { label, level };
    });
}

function wrap(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(' ')) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

const goneMention = (item: MarketUpdateCompetitor): string =>
  item.conclusion?.kind === 'probable_sale'
    ? 'vente probable'
    : item.conclusion?.kind === 'withdrawn'
      ? 'retiré sans vente'
      : 'retirée';

export function PriceLinesFigure({
  summary,
  alignment,
  meetingLabel,
  todayLabel,
}: {
  summary: MarketUpdateSummary;
  alignment: PriceAlignment | null;
  meetingLabel: string;
  todayLabel: string;
}) {
  const { lines, competitors } = summary;
  const subject = summary.agreedPrice;
  const competitorsAtMeeting = competitors.filter((item) => !item.newcomer);
  const newcomers = competitors.filter((item) => item.newcomer && item.currentPrice != null);
  const gone = competitorsAtMeeting.filter(
    (item) => item.goneAt != null && item.meetingPrice != null,
  );
  const moved = competitorsAtMeeting.filter(
    (item) =>
      item.goneAt == null &&
      item.meetingPrice != null &&
      item.currentPrice != null &&
      item.gapAmount != null &&
      item.gapAmount !== 0 &&
      item.meetingPriceSource !== 'current',
  );
  const allPrices = [
    ...(lines.meeting?.prices ?? []),
    ...(lines.today?.prices ?? []),
    ...gone.map((item) => item.meetingPrice as number),
    ...newcomers.map((item) => item.currentPrice as number),
    ...(subject != null ? [subject] : []),
  ].filter((value) => Number.isFinite(value) && value > 0);
  if (allPrices.length === 0) return null;
  const domain = axisDomain(Math.min(...allPrices), Math.max(...allPrices));
  const X = (value: number) => X0 + ((value - domain.from) / (domain.to - domain.from)) * (X1 - X0);
  const barX = subject != null ? X(subject) : null;
  const barColor = alignment ? BAR_COLOR[alignment.tone] : 'var(--color-brand-deep)';

  // La légende, une seule fois en haut.
  const legend = [
    { kind: 'band', text: 'fourchette du marché, du plus bas au plus haut' },
    { kind: 'median', text: 'médiane' },
    { kind: 'point', text: 'un concurrent' },
    { kind: 'diamond', text: 'le plus dangereux, selon vous' },
    { kind: 'hollow', text: 'disparu depuis le rendez-vous' },
    { kind: 'bar', text: 'votre prix, le même sur les trois lignes' },
    { kind: 'arrow', text: 'a bougé depuis le rendez-vous, avec son écart' },
  ];
  const legendRows = [legend.slice(0, 3), legend.slice(3, 5), legend.slice(5)];
  const legendY = 14;
  const headerY = legendY + 3 * 18 + 22;
  const barTop = headerY + 30;

  // Les trois lignes, posées l'une après l'autre.
  type Placed = {
    key: LineKey;
    number: number;
    title: string;
    subtitle: string;
    bandY: number;
    line: typeof lines.meeting;
    points: { x: number; item: MarketUpdateCompetitor | null; hollow: boolean }[];
    diamond: number | null;
    above: { label: Label; level: number }[];
    below: { label: Label; level: number }[];
    phrase: string[];
    phraseX: number;
    phraseAnchor: 'start' | 'end';
    empty: string | null;
    top: number;
    bottom: number;
  };
  const placed: Placed[] = [];
  let y = barTop + 10;
  const describe = (key: LineKey, number: number, title: string, subtitle: string) => {
    const line =
      key === 'meeting' ? lines.meeting : key === 'today' ? lines.today : lines.newcomers;
    const top = y;
    const bandY = top + 78;
    const pointsOf = (): Placed['points'] => {
      if (key === 'meeting') {
        return competitorsAtMeeting
          .filter((item) => item.meetingPrice != null)
          .map((item) => ({ x: X(item.meetingPrice as number), item, hollow: false }));
      }
      if (key === 'today') {
        return [
          ...competitorsAtMeeting
            .filter((item) => item.goneAt == null && item.currentPrice != null)
            .map((item) => ({ x: X(item.currentPrice as number), item, hollow: false })),
          ...gone.map((item) => ({ x: X(item.meetingPrice as number), item, hollow: true })),
        ];
      }
      return newcomers.map((item) => ({ x: X(item.currentPrice as number), item, hollow: false }));
    };
    const points = pointsOf();
    const dangerous =
      key === 'newcomers'
        ? null
        : (points.find((point) => point.item?.dangerous && !point.hollow)?.x ?? null);
    const above: Label[] = [];
    const below: Label[] = [];
    if (line && line.prices.length === 1) {
      // Un seul bien sur la ligne : une seule étiquette, ni médiane ni plus bas / plus haut.
      const single = dangerous != null && line.dangerousPrice != null;
      below.push({
        key: 'single',
        text:
          key === 'newcomers' ? 'Nouveau venu' : single ? 'Plus dangereux' : 'Un seul concurrent',
        value: formatEuro(line.lowest),
        x: X(line.lowest),
        anchor: 'middle',
        color: single ? COLORS.dangerous : COLORS.muted,
      });
    } else if (line) {
      above.push({
        key: 'median',
        text: 'Médiane',
        value: formatEuro(line.median),
        x: X(line.median),
        anchor: 'middle',
        color: 'var(--color-brand-deep)',
      });
      below.push({
        key: 'lowest',
        text: 'Plus bas',
        value: formatEuro(line.lowest),
        x: X(line.lowest),
        anchor: 'start',
        color: COLORS.muted,
      });
      if (line.highest !== line.lowest) {
        below.push({
          key: 'highest',
          text: 'Plus haut',
          value: formatEuro(line.highest),
          x: X(line.highest),
          anchor: 'end',
          color: COLORS.muted,
        });
      }
      if (dangerous != null && line.dangerousPrice != null) {
        below.push({
          key: 'dangerous',
          text: 'Plus dangereux',
          value: formatEuro(line.dangerousPrice),
          x: dangerous,
          anchor: 'middle',
          color: COLORS.dangerous,
        });
      }
    }
    if (key === 'today') {
      for (const item of gone) {
        below.push({
          key: `gone-${item.id}`,
          text: goneMention(item),
          value: formatEuro(item.meetingPrice as number),
          x: X(item.meetingPrice as number),
          anchor: 'middle',
          color: COLORS.muted,
          italic: true,
        });
      }
    }
    const aboveLevels = levels(above.map((label) => fit(label, barX)));
    const belowLevels = levels(below.map((label) => fit(label, barX)));
    const belowCount = belowLevels.reduce((max, entry) => Math.max(max, entry.level + 1), 0);
    // La phrase de fait, du côté de la barre où il y a la place (compromis du designer, gardé).
    const leftRoom = barX != null ? barX - X0 - 12 : X1 - X0;
    const rightRoom = barX != null ? X1 - barX - 12 : 0;
    // La ligne 3 est toujours à gauche de la barre (ses biens sont à votre prix ou moins) : sa
    // phrase aussi (Jean-Guy, 30/10).
    const phraseLeft = barX == null || key === 'newcomers' || leftRoom >= rightRoom;
    const room = Math.max(220, phraseLeft ? leftRoom : rightRoom);
    const phrase = line?.sentence ? wrap(line.sentence, Math.floor(room / 7.4)) : [];
    const empty =
      !line && key === 'newcomers'
        ? summary.newcomersSearch
          ? 'Aucun nouveau venu sur le marché depuis le rendez-vous, avec les critères de votre bien, à votre prix ou moins.'
          : NO_NEWCOMER_LABEL
        : !line
          ? 'Aucun prix à placer sur cette ligne.'
          : null;
    const phraseY = bandY + 14 + belowCount * LEVEL_H + 22;
    const bottom = phraseY + phrase.length * PHRASE_LINE + (empty ? 30 : 0) + 44;
    placed.push({
      key,
      number,
      title,
      subtitle,
      bandY,
      line,
      points,
      diamond: dangerous,
      above: aboveLevels,
      below: belowLevels,
      phrase,
      phraseX: phraseLeft ? X0 : X1,
      phraseAnchor: phraseLeft ? 'start' : 'end',
      empty,
      top,
      bottom,
    });
    y = bottom;
  };
  describe(
    'meeting',
    1,
    meetingLabel,
    `${competitorsAtMeeting.length} concurrent${competitorsAtMeeting.length > 1 ? 's' : ''} · prix du rendez-vous`,
  );
  describe(
    'today',
    2,
    todayLabel,
    `${lines.today?.prices.length ?? 0} encore en vente${gone.length > 0 ? ` · ${gone.length} disparu${gone.length > 1 ? 's' : ''}` : ''}`,
  );
  describe(
    'newcomers',
    3,
    'Face aux nouveaux venus',
    newcomers.length > 0
      ? `${newcomers.length} nouveau${newcomers.length > 1 ? 'x' : ''} venu${newcomers.length > 1 ? 's' : ''} · à votre prix ou moins`
      : summary.newcomersSearch
        ? 'recherche limitée aux biens à votre prix ou moins'
        : 'vus sur le marché après le rendez-vous',
  );
  const axisY = y + 6;
  const height = axisY + 36;
  const barBottom = placed[2].bandY + 30;

  // Les flèches : du point de la ligne 1 au point de la ligne 2, par un couloir entre les deux.
  const [first, second] = placed;
  const corridorY = second.top + 8;
  const arrows = moved.map((item) => ({
    item,
    x1: X(item.meetingPrice as number),
    x2: X(item.currentPrice as number),
    y1: first.bandY + POINT_R + 3,
    y2: second.bandY - POINT_R - 3,
  }));

  const ticks: number[] = [];
  for (let value = domain.from; value <= domain.to; value += domain.step) ticks.push(value);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label="Où en est votre prix : au rendez-vous, aujourd’hui, face aux nouveaux venus"
      data-testid="price-lines-figure"
      style={{ fontFamily: 'var(--font-sans)', color: COLORS.text }}
    >
      <defs>
        <marker
          id="pl-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="context-stroke" />
        </marker>
      </defs>
      {/* La légende, une seule fois. */}
      {legendRows.map((rowItems, rowIndex) => {
        let x = 0;
        return rowItems.map((entry) => {
          const startX = x;
          const yy = legendY + rowIndex * 18;
          x += entry.text.length * 6.3 + 34;
          return (
            <g key={entry.kind} transform={`translate(${startX} ${yy})`} fontSize={11}>
              {entry.kind === 'band' ? (
                <rect x={0} y={-6} width={18} height={10} rx={5} fill={COLORS.band} />
              ) : entry.kind === 'median' ? (
                <line x1={9} y1={-9} x2={9} y2={7} stroke={COLORS.median} strokeWidth={1.5} />
              ) : entry.kind === 'point' ? (
                <circle cx={9} cy={-1} r={POINT_R} fill={COLORS.point} />
              ) : entry.kind === 'diamond' ? (
                <rect
                  x={3}
                  y={-7}
                  width={12}
                  height={12}
                  fill={COLORS.dangerous}
                  transform="rotate(45 9 -1)"
                />
              ) : entry.kind === 'hollow' ? (
                <circle
                  cx={9}
                  cy={-1}
                  r={POINT_R}
                  fill="#fff"
                  stroke={COLORS.point}
                  strokeWidth={1.6}
                />
              ) : entry.kind === 'arrow' ? (
                <path
                  d="M2,-7 V2 H16"
                  fill="none"
                  stroke={COLORS.drop}
                  strokeWidth={1.6}
                  markerEnd="url(#pl-arrow)"
                />
              ) : (
                <rect x={7} y={-9} width={5} height={16} fill={barColor} />
              )}
              <text x={24} y={3} fill={COLORS.muted}>
                {entry.text}
              </text>
            </g>
          );
        });
      })}

      {/* La grille et l'axe, dessinés une fois. */}
      {ticks.map((value) => (
        <g key={value}>
          <line x1={X(value)} y1={barTop} x2={X(value)} y2={axisY} stroke={COLORS.grid} />
          <text
            x={X(value)}
            y={axisY + 18}
            fontSize={11}
            textAnchor={value === domain.from ? 'start' : value === domain.to ? 'end' : 'middle'}
            fill={COLORS.muted}
          >
            {formatEuro(value)}
          </text>
        </g>
      ))}
      <line x1={X0} y1={axisY} x2={X1} y2={axisY} stroke={COLORS.axis} />

      {/* La barre du prix du vendeur, une seule, qui traverse les trois lignes. */}
      {barX != null && subject != null ? (
        <g data-testid="price-lines-bar">
          <text
            x={barX}
            y={headerY}
            fontSize={18}
            fontWeight={700}
            textAnchor={barX > X1 - 140 ? 'end' : barX < X0 + 140 ? 'start' : 'middle'}
            fill={barColor}
            style={{ fontFamily: 'var(--font-title)' }}
          >
            VOTRE PRIX {formatEuro(subject)}
          </text>
          {alignment ? (
            <text
              x={barX}
              y={headerY + 16}
              fontSize={11}
              fontWeight={600}
              textAnchor={barX > X1 - 140 ? 'end' : barX < X0 + 140 ? 'start' : 'middle'}
              fill={barColor}
              data-testid="price-alignment"
            >
              {alignment.label}
            </text>
          ) : null}
          <rect x={barX - 2.5} y={barTop} width={5} height={barBottom - barTop} fill={barColor} />
        </g>
      ) : null}

      {/* Les flèches, une par concurrent qui a bougé. */}
      {arrows.map((arrow, index) => {
        const color = (arrow.item.gapAmount ?? 0) < 0 ? COLORS.drop : COLORS.rise;
        const gap = formatPercent(arrow.item.gapPercent ?? 0, { signed: true, maxDecimals: 1 });
        const midY = corridorY - 10 - index * 14;
        return (
          <g key={arrow.item.id} data-testid="price-lines-arrow">
            <path
              d={`M${arrow.x1},${arrow.y1} V${midY} H${arrow.x2} V${arrow.y2}`}
              fill="none"
              stroke={color}
              strokeWidth={1.6}
              markerEnd="url(#pl-arrow)"
            />
            <text
              x={(arrow.x1 + arrow.x2) / 2}
              y={midY - 5}
              fontSize={12}
              fontWeight={700}
              textAnchor="middle"
              fill={color}
            >
              {gap}
            </text>
          </g>
        );
      })}
      {/* Les trois lignes. */}
      {placed.map((row) => (
        <g key={row.key} data-testid="price-lines-line" data-line={row.key}>
          <text
            x={0}
            y={row.top + 18}
            fontSize={15}
            fontWeight={700}
            fill={COLORS.text}
            style={{ fontFamily: 'var(--font-title)' }}
          >
            {row.number} · {row.title}
          </text>
          {wrap(row.subtitle, 26).map((part, index) => (
            <text key={part} x={0} y={row.top + 36 + index * 14} fontSize={11} fill={COLORS.muted}>
              {part}
            </text>
          ))}
          {row.line ? (
            <>
              <rect
                x={X(row.line.lowest) - 2}
                y={row.bandY - BAND_H / 2}
                width={Math.max(4, X(row.line.highest) - X(row.line.lowest) + 4)}
                height={BAND_H}
                rx={BAND_H / 2}
                fill={COLORS.band}
              />
              <line
                x1={X(row.line.median)}
                y1={row.bandY - BAND_H / 2 - 4}
                x2={X(row.line.median)}
                y2={row.bandY + BAND_H / 2 + 4}
                stroke={COLORS.median}
                strokeWidth={1.5}
              />
            </>
          ) : null}
          {row.empty ? (
            <>
              <rect
                x={X0}
                y={row.bandY - 16}
                width={X1 - X0}
                height={32}
                rx={6}
                fill="none"
                stroke={COLORS.axis}
                strokeDasharray="5 4"
              />
              {wrap(row.empty ?? '', 78).map((part, index) => (
                <text
                  key={part}
                  x={(X0 + X1) / 2}
                  y={row.bandY - 2 + index * 15 + (wrap(row.empty ?? '', 78).length > 1 ? 0 : 6)}
                  fontSize={12}
                  textAnchor="middle"
                  fill={COLORS.muted}
                >
                  {part}
                </text>
              ))}
            </>
          ) : null}
          {row.points.map((point, index) =>
            point.item?.dangerous && !point.hollow && row.key !== 'newcomers' ? (
              <rect
                key={`${point.x}-${index}`}
                x={point.x - 8}
                y={row.bandY - 8}
                width={16}
                height={16}
                fill={COLORS.dangerous}
                transform={`rotate(45 ${point.x} ${row.bandY})`}
                data-testid="price-lines-diamond"
              />
            ) : (
              <circle
                key={`${point.x}-${index}`}
                cx={point.x}
                cy={row.bandY}
                r={POINT_R}
                fill={point.hollow ? '#fff' : COLORS.point}
                stroke={point.hollow ? COLORS.point : 'none'}
                strokeWidth={point.hollow ? 1.6 : 0}
                data-testid={point.hollow ? 'price-lines-gone' : 'price-lines-point'}
              />
            ),
          )}
          {row.above.map(({ label, level }) => {
            const baseY = row.bandY - BAND_H / 2 - 12 - level * LEVEL_H;
            return (
              <g key={label.key} textAnchor={label.anchor} fill={label.color}>
                <line
                  x1={X(row.line!.median)}
                  y1={baseY + 4}
                  x2={X(row.line!.median)}
                  y2={row.bandY - BAND_H / 2 - 4}
                  stroke={COLORS.median}
                  strokeWidth={1}
                />
                <text x={label.x} y={baseY - 14} fontSize={10} letterSpacing={1.2}>
                  {label.text.toUpperCase()}
                </text>
                <text x={label.x} y={baseY} fontSize={15} fontWeight={700}>
                  {label.value}
                </text>
              </g>
            );
          })}
          {row.below.map(({ label, level }) => {
            const baseY = row.bandY + BAND_H / 2 + 14 + level * LEVEL_H;
            return (
              <g key={label.key} textAnchor={label.anchor} fill={label.color}>
                <text x={label.x} y={baseY + 4} fontSize={10} letterSpacing={1.2}>
                  {label.italic ? label.text : label.text.toUpperCase()}
                </text>
                <text x={label.x} y={baseY + 20} fontSize={15} fontWeight={700}>
                  {label.value}
                </text>
              </g>
            );
          })}
          {row.phrase.map((part, index) => (
            <text
              key={part}
              x={row.phraseX}
              y={
                row.bandY +
                14 +
                Math.max(
                  1,
                  row.below.reduce((m, e) => Math.max(m, e.level + 1), 0),
                ) *
                  LEVEL_H +
                22 +
                index * PHRASE_LINE
              }
              fontSize={PHRASE_SIZE}
              fontWeight={500}
              textAnchor={row.phraseAnchor}
              fill={COLORS.text}
              data-testid="price-lines-sentence"
            >
              {part}
            </text>
          ))}
        </g>
      ))}
    </svg>
  );
}

export { MARKET_UPDATE_STATE_LABELS as PRICE_LINES_STATE_LABELS };

import { useId, type ReactNode } from 'react';

import {
  labelledSales,
  placeTimelineLabels,
  TIMELINE_ALL_PRICES_UP_TO,
  timelineDotRadius,
} from '@/features/neighbourhood-link/services/sales-timeline';

// Mission 159 — les dessins du quartier (planches M159-2 et M159-3, validées par Jean-Guy le 17/11),
// communs au Live et aux documents : des traits et des aplats en `currentColor`, lisibles sur la
// scène claire ou sombre comme en noir et blanc à l'impression. Rien n'y est inventé : les anneaux
// sont un schéma des distances, pas une carte ; les jauges sont les échelles officielles ; la frise
// place chaque vente à sa date et à son prix, sans moyenne ni courbe. Les textes arrivent écrits.

// ─── Les anneaux de distance ─────────────────────────────────────────────────────────────────────

export type RingBand = {
  range: string;
  // Le chiffre en grand, et ce qu'il compte (« 3 », « emplacements réservés »), ou un mot seul.
  count: string;
  label?: string;
  sub?: string;
  hit: boolean;
};

export function DistanceRings({
  inner,
  outer,
  center,
  paper = false,
  className,
}: {
  inner: RingBand;
  outer: RingBand;
  center: string;
  // À l'impression : des hachures et un fond blanc sous chaque texte posé dessus.
  paper?: boolean;
  className?: string;
}) {
  const hatch = `hatch-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const V = 440;
  const c = V / 2;
  const r0 = 104;
  const r1 = 214;
  const fillOf = (hit: boolean) => (paper ? (hit ? `url(#${hatch})` : '#fff') : 'currentColor');
  const opacityOf = (hit: boolean) => (paper ? 1 : hit ? 0.3 : 0.1);
  const text = (y: number, value: string | undefined, size: number, weight = 700) => {
    if (!value) return null;
    const width = value.length * size * 0.58 + 14;
    return (
      <g>
        {paper ? (
          <rect x={c - width / 2} y={y - size} width={width} height={size + 8} rx={5} fill="#fff" />
        ) : null}
        <text
          x={c}
          y={y}
          textAnchor="middle"
          fontSize={size}
          fontWeight={weight}
          fill="currentColor"
        >
          {value}
        </text>
      </g>
    );
  };
  return (
    <svg viewBox={`0 0 ${V} ${V}`} className={className} role="img" aria-label={center}>
      {paper ? (
        <defs>
          <pattern
            id={hatch}
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="8" height="8" fill="#e4e4e7" />
            <line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" strokeWidth="2" />
          </pattern>
        </defs>
      ) : null}
      <circle
        cx={c}
        cy={c}
        r={r1}
        fill={fillOf(outer.hit)}
        fillOpacity={opacityOf(outer.hit)}
        stroke="currentColor"
        strokeOpacity={0.6}
        strokeWidth={2}
        strokeDasharray={outer.hit ? undefined : '6 6'}
      />
      <circle
        cx={c}
        cy={c}
        r={r0}
        fill={fillOf(inner.hit)}
        fillOpacity={opacityOf(inner.hit)}
        stroke="currentColor"
        strokeOpacity={0.75}
        strokeWidth={2}
        strokeDasharray={inner.hit ? undefined : '6 6'}
      />
      <circle cx={c} cy={c + 18} r={26} fill="currentColor" />
      <path
        d={`M${c - 13} ${c + 22} l13 -11 13 11 v12 h-26z`}
        fill="none"
        stroke={paper ? '#fff' : 'var(--neighbourhood-home, #fff)'}
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
      {text(c + 66, center, paper ? 19 : 17)}
      {text(c - r0 + 30, inner.range, paper ? 18 : 16)}
      {text(
        paper ? c - r0 + 60 : c - r0 + 54,
        inner.label ? `${inner.count} ${inner.label}` : inner.count,
        20,
      )}
      {/* Mission 162 — à l'impression, la distance, le nombre et son mot ne se recouvrent jamais :
          l'anneau extérieur (110 unités) les tient l'un sous l'autre, en lettres plus grandes. */}
      {text(c - r1 + 30, outer.range, paper ? 18 : 16)}
      {text(
        paper ? c - r1 + 74 : c - r1 + 76,
        outer.count,
        outer.label ? (paper ? 36 : 52) : paper ? 24 : 26,
      )}
      {text(c - r1 + 100, outer.label, paper ? 17 : 15, 500)}
      {text(c + r1 - 34, outer.sub, paper ? 17 : 15, 500)}
    </svg>
  );
}

// ─── Une jauge en cases : l'échelle officielle, la case du bien pleine ───────────────────────────

export function SegmentGauge({
  value,
  labels,
  className,
}: {
  value: number;
  // Chaque case : son numéro et son mot (« 4 », « moyenne »), ou son mot seul.
  labels: { number?: string; word: string }[];
  className?: string;
}) {
  const w = 360;
  const steps = labels.length;
  const cell = (w - (steps - 1) * 6) / steps;
  return (
    <svg viewBox={`-16 0 ${w + 32} 94`} className={className} role="img">
      {labels.map((label, i) => {
        const on = i + 1 <= value;
        const current = i + 1 === value;
        const x = i * (cell + 6);
        const lines = [label.number, ...label.word.split(', ')].filter((line): line is string =>
          Boolean(line),
        );
        return (
          <g key={i}>
            <rect
              x={x}
              y={4}
              width={cell}
              height={28}
              rx={6}
              fill="currentColor"
              fillOpacity={on ? (current ? 1 : 0.45) : 0}
              stroke="currentColor"
              strokeOpacity={0.7}
              strokeWidth={2}
            />
            {lines.map((line, k) => (
              <text
                key={k}
                x={x + cell / 2}
                y={50 + k * 15}
                textAnchor="middle"
                fontSize={13}
                fontWeight={current ? 700 : 400}
                fillOpacity={current ? 1 : 0.85}
                fill="currentColor"
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// ─── La frise des ventes ─────────────────────────────────────────────────────────────────────────

export type TimelineSale = { month: string; price: number; label: string };

const monthTime = (month: string) =>
  Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 15);

export function SalesTimeline({
  sales,
  width = 940,
  height = 220,
  labels = true,
  className,
}: {
  sales: TimelineSale[];
  width?: number;
  height?: number;
  labels?: boolean;
  className?: string;
}) {
  if (sales.length === 0) return null;
  const times = sales.map((sale) => monthTime(sale.month));
  const firstYear = new Date(Math.min(...times)).getUTCFullYear();
  const lastYear = new Date(Math.max(...times)).getUTCFullYear() + 1;
  const t0 = Date.UTC(firstYear, 0, 1);
  const t1 = Date.UTC(lastYear, 0, 1);
  const prices = sales.map((sale) => sale.price);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const x = (time: number) => 40 + ((width - 90) * (time - t0)) / (t1 - t0);
  // Correctifs 161 — au-delà de 12 ventes, la frise laisse sous son point le plus bas la place
  // d'écrire son prix, au-dessus de l'axe (le plus bas tombait presque toujours).
  const floor = sales.length > TIMELINE_ALL_PRICES_UP_TO ? height - 62 : height - 46;
  const y = (price: number) =>
    hi === lo ? height / 2 : floor - ((floor - 50) * (price - lo)) / (hi - lo);
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => firstYear + i);
  const points = sales.map((sale) => ({
    x: x(monthTime(sale.month)),
    y: y(sale.price),
    text: sale.label,
  }));
  // Correctifs 161 — beaucoup de ventes : des points plus petits, trois prix écrits, jamais deux
  // textes l'un sur l'autre (`sales-timeline.ts`).
  const dot = timelineDotRadius(sales.length);
  const many = sales.length > TIMELINE_ALL_PRICES_UP_TO;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} role="img">
      <line
        x1={40}
        x2={width - 50}
        y1={height - 30}
        y2={height - 30}
        stroke="currentColor"
        strokeOpacity={0.6}
        strokeWidth={2}
      />
      {years.map((year) => {
        const xx = x(Date.UTC(year, 0, 1));
        return (
          <g key={year}>
            <line
              x1={xx}
              x2={xx}
              y1={height - 36}
              y2={height - 24}
              stroke="currentColor"
              strokeOpacity={0.6}
            />
            <text
              x={xx}
              y={height - 6}
              textAnchor="middle"
              fontSize={13}
              fill="currentColor"
              fillOpacity={0.85}
            >
              {year}
            </text>
          </g>
        );
      })}
      {points.map((point, i) => (
        <g key={i}>
          <line
            x1={point.x}
            x2={point.x}
            y1={point.y + dot}
            y2={height - 30}
            stroke="currentColor"
            strokeOpacity={many ? 0.18 : 0.25}
          />
          <circle cx={point.x} cy={point.y} r={dot} fill="currentColor" />
        </g>
      ))}
      {labels
        ? placeTimelineLabels(points, labelledSales(sales), width, height - 34, dot).map(
            (label, i) => (
              <text
                key={i}
                x={label.x}
                y={label.y}
                textAnchor={label.anchor}
                fontSize={16}
                fontWeight={700}
                fill="currentColor"
              >
                {label.text}
              </text>
            ),
          )
        : null}
    </svg>
  );
}

// ─── La frise de la construction d'une copropriété ───────────────────────────────────────────────

export function BuiltPeriod({
  from,
  to,
  now,
  built,
  today,
  className,
}: {
  from: number | null;
  to: number | null;
  now: number;
  built: string;
  today: string;
  className?: string;
}) {
  const known = from ?? to;
  if (known == null) return null;
  const start = Math.min(1950, Math.floor((known - 10) / 10) * 10);
  const width = 900;
  const x = (year: number) => 30 + (840 * (year - start)) / (now - start);
  const left = x(from ?? start);
  const right = x(to ?? now);
  const ticks = [start, ...(from != null ? [from] : []), ...(to != null ? [to] : [])];
  return (
    <svg viewBox={`0 0 ${width} 120`} className={className} role="img">
      <line
        x1={30}
        x2={870}
        y1={60}
        y2={60}
        stroke="currentColor"
        strokeOpacity={0.5}
        strokeWidth={2}
      />
      {ticks.map((year) => (
        <g key={year}>
          <line x1={x(year)} x2={x(year)} y1={52} y2={68} stroke="currentColor" />
          <text x={x(year)} y={98} textAnchor="middle" fontSize={13} fill="currentColor">
            {year}
          </text>
        </g>
      ))}
      <line x1={870} x2={870} y1={52} y2={68} stroke="currentColor" />
      <text x={870} y={98} textAnchor="end" fontSize={13} fill="currentColor">
        {today}
      </text>
      <rect
        x={left}
        y={40}
        width={Math.max(right - left, 40)}
        height={40}
        rx={8}
        fill="currentColor"
        fillOpacity={0.9}
      />
      <text
        x={left + Math.max(right - left, 40) / 2}
        y={66}
        textAnchor="middle"
        fontSize={17}
        fontWeight={700}
        fill="var(--neighbourhood-ink-on, #fff)"
      >
        {built}
      </text>
    </svg>
  );
}

// ─── Les pictogrammes ────────────────────────────────────────────────────────────────────────────

const ICONS = {
  person: (
    <>
      <circle cx="12" cy="7" r="4" fill="currentColor" />
      <path d="M4 22c0-4.4 3.6-8 8-8s8 3.6 8 8z" fill="currentColor" />
    </>
  ),
  home: <path d="M2 11l10-8 10 8v11H2z" fill="currentColor" />,
  door: (
    <>
      <rect
        x="3"
        y="2"
        width="18"
        height="20"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <rect x="7" y="6" width="4" height="4" fill="currentColor" />
      <rect x="13" y="6" width="4" height="4" fill="currentColor" />
      <rect x="7" y="12" width="4" height="4" fill="currentColor" />
      <rect x="13" y="12" width="4" height="4" fill="currentColor" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export function Pictograms({
  kind,
  count,
  className,
}: {
  kind: keyof typeof ICONS;
  count: number;
  className?: string;
}) {
  return (
    <div className="flex flex-wrap items-end gap-1.5" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" className={className}>
          {ICONS[kind]}
        </svg>
      ))}
    </div>
  );
}

'use client';

import { useLiveTexts } from '@/features/live-seller/components/live-texts';
import {
  panel,
  panelTight,
  question,
  questionHint,
  screen,
  screenHead,
  statLabel,
} from '@/features/live-seller/components/live-stage';
import {
  BuiltPeriod,
  DistanceRings,
  Pictograms,
  SalesTimeline,
  SegmentGauge,
} from '@/features/neighbourhood-link/components/neighbourhood-drawings';
import type {
  NeighbourhoodBlockKey,
  NeighbourhoodBlocks,
} from '@/features/neighbourhood-link/services/neighbourhood-blocks';
import { neighbourhoodView } from '@/features/neighbourhood-link/services/neighbourhood-view';

// Mission 159 — un écran du quartier au Live (planche M159-2, validée par Jean-Guy le 17/11) : les
// anneaux pour l'urbanisme et les permis, les jauges en cases pour les risques, des pictogrammes
// pour la population et la copropriété, la frise du temps pour les ventes réelles. Aucune question
// au vendeur, rien n'est enregistré ; le contenu vient de l'instantané gardé par le conseiller.
// L'écran tient sans défiler sur la tablette (M148 B) : les dessins prennent la hauteur qui reste.
export function LivePageNeighbourhood({
  blocks,
  block,
  year,
}: {
  blocks: NeighbourhoodBlocks;
  block: NeighbourhoodBlockKey;
  // L'année du jour, pour la frise de la copropriété (« aujourd'hui »).
  year: number;
}) {
  const { language, texts } = useLiveTexts();
  const view = neighbourhoodView(blocks, block, texts, language);
  if (!view) return null;
  const sourceLine = view.source ? (
    <p className="shrink-0 text-xs text-zinc-500 stage:text-white/60">{view.source}</p>
  ) : null;
  // Le dessin du bien et le mot posé sur la frise : clairs sur l'encre foncée de la scène claire,
  // foncés sur l'encre blanche de la scène sombre.
  const inks =
    '[--neighbourhood-home:#fff] [--neighbourhood-ink-on:#fff] stage:[--neighbourhood-home:var(--color-brand-deep)] stage:[--neighbourhood-ink-on:var(--color-brand-deep)]';
  const head = (scale: string | null) => (
    <div className={screenHead}>
      <p className={statLabel}>{view.title}</p>
      <h2 className={question}>{view.headline}</h2>
      {scale ? <p className={questionHint}>{scale}</p> : null}
    </div>
  );

  if (view.kind === 'rings') {
    return (
      <div className={`${screen} ${inks}`} data-testid={`live-neighbourhood-${block}`}>
        {head(view.scale)}
        <div className="grid grid-cols-1 items-center gap-4 md:min-h-0 md:flex-1 md:landscape:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <DistanceRings
            inner={view.inner}
            outer={view.outer}
            center={texts.quartier.home}
            className="mx-auto h-auto max-h-[26rem] w-full max-w-[26rem] text-brand-deep md:max-h-full stage:text-white"
          />
          <div className="flex flex-col gap-3">
            {view.legend.map((line, i) => (
              <p key={i} className="text-base leading-snug sm:text-lg">
                {line.title ? (
                  <span className="block font-title text-lg font-bold text-brand-deep sm:text-xl stage:text-brand">
                    {line.title}
                  </span>
                ) : null}
                {line.text}
              </p>
            ))}
            {view.diagram ? <p className={questionHint}>{view.diagram}</p> : null}
          </div>
        </div>
        {sourceLine}
      </div>
    );
  }

  if (view.kind === 'risks') {
    return (
      <div className={screen} data-testid={`live-neighbourhood-${block}`}>
        {head(null)}
        <div className="grid grid-cols-1 gap-3 md:min-h-0 md:flex-1 md:grid-cols-2 md:content-start md:landscape:grid-cols-3">
          {view.gauges.map((gauge) => (
            <div key={gauge.title} className={`${panelTight} flex flex-col gap-1`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-title text-xl font-bold">{gauge.title}</span>
                <span className="rounded-full bg-brand/15 px-2 py-0.5 text-xs whitespace-nowrap">
                  {gauge.scale}
                </span>
              </div>
              <SegmentGauge
                value={gauge.value}
                labels={gauge.labels}
                className="h-auto w-full max-w-sm text-brand-deep stage:text-white"
              />
              <p className="text-sm sm:text-base">{gauge.caption}</p>
            </div>
          ))}
          {view.disasters ? (
            <div className={`${panelTight} flex flex-col gap-1`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-title text-xl font-bold">{view.disasters.title}</span>
                <span className="rounded-full bg-brand/15 px-2 py-0.5 text-xs whitespace-nowrap">
                  {view.disasters.scale}
                </span>
              </div>
              <p className="font-title text-4xl leading-none font-bold">{view.disasters.count}</p>
              <p className="text-sm sm:text-base">{view.disasters.caption}</p>
            </div>
          ) : null}
          {view.flood ? (
            <div className={`${panelTight} flex flex-col gap-1 md:col-span-2`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-title text-xl font-bold">{view.flood.title}</span>
                <span className="rounded-full bg-brand/15 px-2 py-0.5 text-xs whitespace-nowrap">
                  {view.flood.scale}
                </span>
              </div>
              <p className="text-sm sm:text-base">{view.flood.caption}</p>
            </div>
          ) : null}
        </div>
        {sourceLine}
      </div>
    );
  }

  if (view.kind === 'population') {
    return (
      <div className={screen} data-testid={`live-neighbourhood-${block}`}>
        {head(view.scale)}
        <div className="grid grid-cols-1 gap-3 md:min-h-0 md:flex-1 md:grid-cols-3 md:content-center">
          {view.groups.map((group, i) => (
            <div key={i} className={`${panel} flex flex-col justify-center gap-3`}>
              <Pictograms
                kind={group.icon}
                count={group.pictograms}
                className="h-9 w-9 text-brand-deep sm:h-11 sm:w-11 stage:text-white"
              />
              <p className="text-base sm:text-lg">
                <span className="block font-title text-4xl leading-none font-bold">
                  {group.value}
                </span>
                {group.label}{' '}
                {group.note ? <small className="text-xs opacity-70">{group.note}</small> : null}
              </p>
            </div>
          ))}
        </div>
        {sourceLine}
      </div>
    );
  }

  if (view.kind === 'condominium') {
    return (
      <div className={`${screen} ${inks}`} data-testid={`live-neighbourhood-${block}`}>
        {head(view.scale)}
        <div className="flex flex-col justify-center gap-4 md:min-h-0 md:flex-1">
          {view.lots > 0 ? (
            <div className="flex justify-center">
              <Pictograms
                kind="door"
                count={view.lots}
                className="h-14 w-14 text-brand-deep sm:h-20 sm:w-20 stage:text-white"
              />
            </div>
          ) : null}
          <BuiltPeriod
            from={view.period.from}
            to={view.period.to}
            now={year}
            built={view.built}
            today={view.today}
            className="mx-auto h-auto w-full max-w-4xl text-brand-deep stage:text-white"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {view.chips.map((chip, i) => (
              <div key={i} className={panel}>
                <span className="block font-title text-3xl leading-tight font-bold">
                  {chip.big}
                </span>
                <span className="text-base sm:text-lg">{chip.text}</span>
              </div>
            ))}
          </div>
        </div>
        {sourceLine}
      </div>
    );
  }

  return (
    <div className={screen} data-testid={`live-neighbourhood-${block}`}>
      {head(view.scale)}
      <div className="flex flex-col gap-3 md:min-h-0 md:flex-1">
        <SalesTimeline
          sales={view.timeline}
          className="mx-auto h-auto max-h-48 w-full text-brand-deep stage:text-white [@media(max-height:760px)]:max-h-36"
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {view.cards.slice(0, 6).map((card, i) => (
            <div
              key={i}
              className={`${panelTight} flex flex-col gap-0.5 text-sm ${i >= 3 ? 'max-sm:hidden [@media(max-height:760px)]:hidden' : ''}`}
            >
              <span className="font-title text-2xl leading-none font-bold">{card.price}</span>
              <span className="text-xs font-bold tracking-wide text-brand-deep uppercase stage:text-brand">
                {card.month}
              </span>
              {card.street ? <span>{card.street}</span> : null}
              <span className="opacity-80">{card.facts}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="shrink-0 text-xs text-zinc-500 stage:text-white/60">
        {[view.legend, view.source].filter(Boolean).join(' ')}
      </p>
    </div>
  );
}

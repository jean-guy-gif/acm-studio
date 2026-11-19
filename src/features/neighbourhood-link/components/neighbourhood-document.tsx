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
import {
  neighbourhoodView,
  type NeighbourhoodView,
} from '@/features/neighbourhood-link/services/neighbourhood-view';
import { TIMELINE_ALL_PRICES_UP_TO } from '@/features/neighbourhood-link/services/sales-timeline';
import type { ReactNode } from 'react';

import type { ClientLanguage } from '@/lib/client-language';
import { clientTexts } from '@/lib/client-texts';
import { formatDay } from '@/lib/format';

// Mission 159 — le quartier dans la synthèse et l'Étude de marché (planche M159-3, validée par
// Jean-Guy le 17/11) : les mêmes dessins qu'au Live, en encre sombre ; à l'impression, des hachures
// et un fond blanc sous chaque texte posé dessus, lisibles en noir et blanc, jamais la couleur
// seule. Chaque bloc dit sa source publique, la date de ses données et l'échelle de chaque fait ;
// jamais le nom du service qui les rassemble. Le contenu est celui de l'instantané gardé : un lien
// déjà envoyé ne change plus.
export type NeighbourhoodDocumentContent = {
  blocks: NeighbourhoodBlocks;
  keys: NeighbourhoodBlockKey[];
  takenAt: string;
};

export function NeighbourhoodDocumentBlocks({
  content,
  only,
  language,
  heading: sectionHeading = null,
  blockTitles = true,
}: {
  content: NeighbourhoodDocumentContent;
  only: readonly NeighbourhoodBlockKey[];
  language: ClientLanguage;
  // Mission 162 — le titre de la section, imprimé avec le premier bloc : jamais seul en bas de page.
  heading?: ReactNode;
  // Le titre de chaque bloc ; sans lui quand la section porte déjà le même (« Les ventes réelles »).
  blockTitles?: boolean;
}) {
  const texts = clientTexts(language);
  const year = new Date(content.takenAt).getUTCFullYear();
  const views = only
    .filter((key) => content.keys.includes(key))
    .map((key) => ({ key, view: neighbourhoodView(content.blocks, key, texts, language) }))
    .filter((entry) => entry.view != null);
  if (views.length === 0) return null;
  const source = (value: string | null) =>
    value ? <p className="text-[0.7rem] text-zinc-500">{value}</p> : null;
  const heading = (title: string, headline: string, scale: string | null) => (
    <div className="flex flex-col gap-0.5">
      {blockTitles ? (
        <h3 className="font-title text-lg font-bold text-brand-darker">{title}</h3>
      ) : null}
      <p className="font-title text-xl leading-snug font-bold">{headline}</p>
      {scale ? <p className="text-xs text-zinc-500">{scale}</p> : null}
    </div>
  );

  return (
    <div
      className="flex flex-col gap-4 [--neighbourhood-home:#fff] [--neighbourhood-ink-on:#fff]"
      data-testid="neighbourhood-document"
    >
      {views.map(({ key, view }, index) => {
        const lead = index === 0 ? sectionHeading : null;
        // Les ventes nombreuses : seuls le titre et la frise restent ensemble, le tableau suit.
        if (view?.kind === 'sales' && view.cards.length > TIMELINE_ALL_PRICES_UP_TO) {
          return renderManySales(key, view, lead);
        }
        const block = renderBlock(key, view);
        return lead ? (
          <div key={key} className="flex flex-col gap-3 break-inside-avoid">
            {lead}
            {block}
          </div>
        ) : (
          block
        );
      })}
      <p className="border-t border-zinc-300 pt-2 text-xs text-zinc-600">
        {texts.quartier.frozen(formatDay(content.takenAt, language))}
      </p>
    </div>
  );

  function renderBlock(key: NeighbourhoodBlockKey, view: NeighbourhoodView | null) {
    if (!view) return null;
    const frame = 'flex flex-col gap-2 border-t-2 border-brand-deep pt-2.5 break-inside-avoid';
    if (view.kind === 'rings') {
      return (
        <div key={key} className={frame}>
          <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[17rem_1fr]">
            <DistanceRings
              inner={view.inner}
              outer={view.outer}
              center={texts.quartier.home}
              paper
              className="mx-auto h-auto w-[17rem] text-zinc-900"
            />
            <div className="flex flex-col gap-1.5 text-sm">
              {heading(view.title, view.headline, view.scale)}
              {view.legend.map((line, i) => (
                <p key={i}>
                  {line.title ? <b>{line.title}</b> : null}
                  {line.title ? ' · ' : ''}
                  {line.text}
                </p>
              ))}
              {view.diagram ? <p className="text-xs text-zinc-500">{view.diagram}</p> : null}
            </div>
          </div>
          {source(view.source)}
        </div>
      );
    }
    if (view.kind === 'risks') {
      return (
        <div key={key} className={frame}>
          {heading(view.title, view.headline, null)}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {view.gauges.map((gauge) => (
              <div key={gauge.title} className="flex flex-col gap-0.5 text-xs">
                <span>
                  <b className="text-sm">{gauge.title}</b>{' '}
                  <span className="text-zinc-500">· {gauge.scale}</span>
                </span>
                <SegmentGauge
                  value={gauge.value}
                  labels={gauge.labels}
                  className="h-auto w-full max-w-xs text-zinc-900"
                />
                <span>{gauge.caption}</span>
              </div>
            ))}
            {view.disasters ? (
              <div className="flex flex-col gap-0.5 text-xs">
                <span>
                  <b className="text-sm">{view.disasters.title}</b>{' '}
                  <span className="text-zinc-500">· {view.disasters.scale}</span>
                </span>
                <span className="font-title text-4xl leading-none font-bold">
                  {view.disasters.count}
                </span>
                <span>{view.disasters.caption}</span>
              </div>
            ) : null}
          </div>
          {view.flood ? (
            <p className="text-sm">
              <b>{view.flood.title}</b> · {view.flood.caption}{' '}
              <span className="text-xs text-zinc-500">({view.flood.scale})</span>
            </p>
          ) : null}
          {source(view.source)}
        </div>
      );
    }
    if (view.kind === 'population') {
      return (
        <div key={key} className={frame}>
          {heading(view.title, view.headline, view.scale)}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {view.groups.map((group, i) => (
              <div key={i} className="flex flex-col gap-1 text-sm">
                <Pictograms
                  kind={group.icon}
                  count={group.pictograms}
                  className="h-6 w-6 text-zinc-900"
                />
                <span>
                  <b className="font-title text-2xl">{group.value}</b> {group.label}{' '}
                  {group.note ? (
                    <small className="whitespace-nowrap text-zinc-500">{group.note}</small>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
          {source(view.source)}
        </div>
      );
    }
    if (view.kind === 'condominium') {
      return (
        <div key={key} className={frame}>
          {heading(view.title, view.headline, view.scale)}
          {view.lots > 0 ? (
            <Pictograms kind="door" count={view.lots} className="h-8 w-8 text-zinc-900" />
          ) : null}
          <BuiltPeriod
            from={view.period.from}
            to={view.period.to}
            now={year}
            built={view.built}
            today={view.today}
            className="h-auto w-full max-w-xl text-zinc-900"
          />
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {view.chips.map((chip, i) => (
              <span key={i}>
                <b>{chip.big}</b> {chip.text}
              </span>
            ))}
          </div>
          {source(view.source)}
        </div>
      );
    }
    return (
      <div key={key} className={frame}>
        {heading(view.title, view.headline, view.scale)}
        <SalesTimeline
          sales={view.timeline}
          width={620}
          height={210}
          className="h-auto w-full text-zinc-900"
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {view.cards.map((card, i) => (
            <div
              key={i}
              className="flex flex-col gap-0.5 border border-zinc-300 px-2.5 py-2 text-xs break-inside-avoid"
            >
              <b className="font-title text-lg leading-none">{card.price}</b>
              <span className="font-semibold uppercase">{card.month}</span>
              {card.street ? <span>{card.street}</span> : null}
              <span>{card.facts}</span>
            </div>
          ))}
        </div>
        {source([view.legend, view.source].filter(Boolean).join(' '))}
      </div>
    );
  }

  function renderManySales(
    key: NeighbourhoodBlockKey,
    view: Extract<NeighbourhoodView, { kind: 'sales' }>,
    lead: ReactNode,
  ) {
    return (
      <div key={key} className="flex flex-col gap-2">
        <div className="flex flex-col gap-3 break-inside-avoid">
          {lead}
          <div className="flex flex-col gap-2 border-t-2 border-brand-deep pt-2.5">
            {heading(view.title, view.headline, view.scale)}
            <SalesTimeline
              sales={view.timeline}
              width={620}
              height={210}
              className="h-auto w-full text-zinc-900"
            />
          </div>
        </div>
        {/* Correctifs 161 — beaucoup de ventes (37 sur le dossier de démonstration) : une ligne par
            vente, dans un tableau. Mission 162 — il peut continuer sur la page suivante, son
            en-tête répété, plutôt que de laisser une demi-page vide. */}
        <table
          className="w-full text-left text-xs leading-[1.3]"
          data-testid="neighbourhood-sales-compact"
        >
          <thead>
            <tr className="border-b border-zinc-400 text-zinc-600">
              <th className="py-0.5 pr-2 font-semibold">{view.columns.month}</th>
              <th className="py-0.5 pr-2 font-semibold">{view.columns.street}</th>
              <th className="py-0.5 pr-2 text-right font-semibold">{view.columns.rooms}</th>
              <th className="py-0.5 pr-2 text-right font-semibold">{view.columns.surface}</th>
              <th className="py-0.5 pr-2 text-right font-semibold">{view.columns.distance}</th>
              <th className="py-0.5 text-right font-semibold">{view.columns.price}</th>
            </tr>
          </thead>
          <tbody>
            {view.cards.map((card, i) => (
              <tr key={i} className="border-b border-zinc-200 break-inside-avoid">
                <td className="py-0 pr-2 whitespace-nowrap">{card.month}</td>
                <td className="py-0 pr-2">{card.street}</td>
                <td className="py-0 pr-2 text-right">{card.rooms}</td>
                <td className="py-0 pr-2 text-right whitespace-nowrap">{card.surface}</td>
                <td className="py-0 pr-2 text-right whitespace-nowrap">{card.distance}</td>
                <td className="py-0 text-right font-bold whitespace-nowrap">{card.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {source([view.legend, view.source].filter(Boolean).join(' '))}
      </div>
    );
  }
}

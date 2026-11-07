import type { SourceBlock } from '@/features/address-dossier/types';
import { priorityVerdict } from '@/features/living-here/services/living-here-rules';
import type { LivingHereSheet, NearbyPlace, SectorPriority } from '@/features/living-here/types';
import type { ReactNode } from 'react';

import { clientTexts, type TextLanguage } from '@/lib/client-texts';

// Mission 142 — « Vivre ici », pour le conseiller (en français, sur Visites) et pour l'acquéreur
// (dans sa langue, sur le lien de son dossier) : ce qui compte pour lui en tête, puis le quotidien à
// pied, les écoles, les déplacements, l'environnement et les risques de la commune. Chaque lieu par
// sa catégorie, son nom public et ses minutes, jamais une adresse (décision du 07/11) ; d'où partent
// les distances est toujours dit.

const VERDICT_TONE = {
  yes: 'text-emerald-700',
  partly: 'text-amber-700',
  no: 'text-zinc-600',
  to_check: 'text-zinc-600',
} as const;

export function LivingHereView({
  sheet,
  language,
  priorities,
  livingPlace,
  livingPlaceMinutes,
}: {
  sheet: LivingHereSheet;
  language: TextLanguage;
  priorities: readonly SectorPriority[];
  livingPlace: string | null;
  livingPlaceMinutes: number | null;
}) {
  const t = clientTexts(language).livingHere;
  const { blocks } = sheet;
  const from =
    sheet.origin === 'address'
      ? t.from.address
      : sheet.origin === 'district'
        ? t.from.district
        : t.from.commune(sheet.commune);

  const placeLine = (place: NearbyPlace) => (
    <li
      key={`${place.category}-${place.name ?? ''}`}
      className="flex flex-wrap justify-between gap-x-3"
    >
      <span>
        {t.categories[place.category]}
        {place.name ? <span className="text-zinc-500"> · {place.name}</span> : null}
      </span>
      <span className="font-medium text-zinc-900">{t.walk(place.walkMinutes)}</span>
    </li>
  );

  const section = <T,>(
    testId: string,
    title: string,
    block: SourceBlock<T>,
    render: (data: T) => ReactNode,
  ) => (
    <section className="flex flex-col gap-1.5" data-testid={testId}>
      <h3 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">{title}</h3>
      {block.state === 'ok' ? (
        render(block.data)
      ) : (
        <p className="text-sm text-zinc-600">
          {block.state === 'empty' ? t.nothing : t.unavailable}
        </p>
      )}
    </section>
  );

  return (
    <div className="flex flex-col gap-4 text-zinc-700" data-testid="living-here">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-title text-lg font-bold text-zinc-900">{t.title}</h2>
        <p className="text-sm text-zinc-500" data-testid="living-here-from">
          {from} {t.approx}
        </p>
      </div>

      {priorities.length > 0 || (livingPlace && livingPlaceMinutes != null) ? (
        <section className="flex flex-col gap-1.5" data-testid="living-here-priorities">
          <h3 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">
            {t.sections.priorities}
          </h3>
          <ul className="flex flex-col gap-1 text-sm">
            {priorities.map((priority) => {
              const verdict = priorityVerdict(priority, blocks);
              return (
                <li key={priority} className="flex flex-wrap justify-between gap-x-3">
                  <span>★ {t.priorities[priority]}</span>
                  <span className={`font-medium ${VERDICT_TONE[verdict]}`}>
                    {t.verdicts[verdict]}
                  </span>
                </li>
              );
            })}
            {livingPlace && livingPlaceMinutes != null ? (
              <li data-testid="living-here-trip">
                {t.livingPlace(livingPlace, livingPlaceMinutes)}
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      {section('living-here-daily', t.sections.daily, blocks.daily, (data) => (
        <ul className="flex flex-col gap-1 text-sm">{data.places.map(placeLine)}</ul>
      ))}
      {section('living-here-schools', t.sections.schools, blocks.schools, (data) => (
        <ul className="flex flex-col gap-1 text-sm">{data.places.map(placeLine)}</ul>
      ))}
      {section('living-here-moves', t.sections.moves, blocks.moves, (data) => (
        <ul className="flex flex-col gap-1 text-sm">
          {data.transit ? placeLine(data.transit) : null}
          {data.drives.map((drive) => (
            <li key={drive.kind} className="flex flex-wrap justify-between gap-x-3">
              <span>{t.driveTo[drive.kind](drive.name)}</span>
              <span className="font-medium text-zinc-900">{t.drive(drive.minutes)}</span>
            </li>
          ))}
        </ul>
      ))}
      <section className="flex flex-col gap-1.5" data-testid="living-here-surroundings">
        <h3 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">
          {t.sections.surroundings}
        </h3>
        <ul className="flex flex-col gap-1 text-sm">
          {blocks.surroundings.state === 'ok' && blocks.surroundings.data.green
            ? placeLine(blocks.surroundings.data.green)
            : null}
          <li>{t.noise}</li>
          {blocks.risks.state === 'ok' ? (
            <li data-testid="living-here-risks">
              {t.risksLine(
                [
                  ...blocks.risks.data.riskCodes
                    .map((code) => t.risks[code])
                    .filter((label): label is string => Boolean(label)),
                  blocks.risks.data.seismicZone ? t.seismic(blocks.risks.data.seismicZone) : null,
                  blocks.risks.data.clay ? t.clay[blocks.risks.data.clay] : null,
                ]
                  .filter(Boolean)
                  .join(', '),
              )}
            </li>
          ) : null}
        </ul>
      </section>
      <p className="text-xs text-zinc-500">{t.sources}</p>
    </div>
  );
}

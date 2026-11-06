'use client';

import { DpeLetter } from '@/features/dpe/components/dpe-letter';
import { countDpe, dpeMarket } from '@/features/dpe/services/dpe';
import { useLiveTexts } from '@/features/live-seller/components/live-texts';
import {
  panel,
  panelSoft,
  question,
  questionHint,
  statLabel,
} from '@/features/live-seller/components/live-stage';

// MISSION 80 — « Le DPE face au marché », après le dernier concurrent. Le repère est la lettre
// médiane des concurrents qui en affichent une ; le vendeur y lit où se place son bien, ou la
// classe à viser après le passage du diagnostiqueur. AUCUN montant, aucun prix calculé : l'outil
// ne produit aucune estimation. Les concurrents sans classe ne sont pas montrés au vendeur.
export function LivePageDpe({
  subjectEnergyRating,
  competitorEnergyRatings,
}: {
  subjectEnergyRating: string | null;
  competitorEnergyRatings: (string | null)[];
}) {
  const t = useLiveTexts().texts.live.dpe;
  const market = dpeMarket(subjectEnergyRating, competitorEnergyRatings);
  if (market == null) return null;
  const { classes } = countDpe(competitorEnergyRatings);
  const message = market.verdict === 'unknown' ? t.unknown(market.reference) : t[market.verdict];

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-3">
        <h2 className={question}>{t.title}</h2>
        <p className={questionHint}>{t.hint}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className={`${panel} flex flex-col gap-3`}>
          <div className={statLabel}>{t.yours}</div>
          {market.subject ? (
            <DpeLetter letter={market.subject} size="lg" />
          ) : (
            <p className="text-base text-zinc-500 stage:text-white/70">{t.noDpe}</p>
          )}
        </div>
        <div className={`${panel} flex flex-col gap-3`}>
          <div className={statLabel}>{t.competitors}</div>
          <DpeLetter letter={market.reference} size="lg" />
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-base text-zinc-600 stage:text-white/70">
            {classes.map((entry) => (
              <li key={entry.letter} className="flex items-center gap-1.5">
                <DpeLetter letter={entry.letter} />
                {t.competitorCount(entry.count)}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p
        className={`${panelSoft} font-title text-xl leading-snug font-semibold text-zinc-900 sm:text-2xl stage:text-white`}
      >
        {message}
      </p>
    </div>
  );
}

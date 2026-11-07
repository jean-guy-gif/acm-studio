'use client';

import { LiveCommercializationPrice } from '@/features/meeting-conclusion/components/live-commercialization-price';
import { useLiveTexts } from '@/features/live-seller/components/live-texts';
import { LivePhoto } from '@/features/live-seller/components/live-photo';
import {
  bigValue,
  panel,
  panelSoft,
  question,
  questionHint,
  statLabel,
  statValue,
} from '@/features/live-seller/components/live-stage';
import type { DangerousReason } from '@/features/live-seller/constants';
import type { LiveSellerSummary } from '@/features/live-seller/types';
import type {
  AuthorizedAdvisorRange,
  AuthorizedSellerComparable,
} from '@/features/live-seller/services/project-live-for-seller';
import { sellerFacingCompetitorPrice } from '@/features/live-seller/services/competitor-price';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import { formatEuro } from '@/lib/format';

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-zinc-100 py-2.5 text-base last:border-0 stage:border-white/10">
      <span className="text-zinc-500 stage:text-white/60">{label}</span>
      <span className="text-right font-title font-semibold text-zinc-900 stage:text-white">
        {value}
      </span>
    </div>
  );
}

// La fourchette conseiller (central, décision) est LIVRÉE — jamais dans la charge
// initiale. Le concurrent le plus dangereux est déjà autorisé (post-révélation).
export function LivePageConclusion({
  projectId,
  summary,
  advisorRange,
  dangerous,
  closest = false,
  onPendingPriceChange,
  onPriceSaved,
}: {
  projectId: string;
  onPendingPriceChange?: (typed: string | null) => void;
  onPriceSaved?: (saved: string) => void;
  summary: LiveSellerSummary | null;
  advisorRange: AuthorizedAdvisorRange | null;
  dangerous: AuthorizedSellerComparable | null;
  // Mission 131 — en présentation directe, le bien mis en avant est celui que le CONSEILLER a
  // proposé, « le plus proche de votre bien », jamais présenté comme le choix du vendeur.
  closest?: boolean;
}) {
  const competitiveMarketCentral = advisorRange?.competitiveMarketCentral ?? null;
  const decision = advisorRange?.advisorDecision ?? null;
  const { language, texts } = useLiveTexts();
  const t = texts.live.conclusion;
  const euro = (value: number | null): string =>
    value != null ? formatEuro(value, { language }) : '—';
  const dangerousLabel = dangerous ? neutralComparableLabel(dangerous, language) : '';

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-3">
        <h2 className={question}>{t.title}</h2>
        <p className={questionHint}>{t.hint}</p>
      </div>

      {/* Mission 89 — devant le vendeur, un seul prix calculé : « Prix des concurrents ». Le
          « Marché calculé » brut ne s'affiche plus ici. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Mission 131 — sans valeur perçue (présentation directe), pas de case vide. */}
        {summary?.seller_perceived_property_price != null ? (
          <div className={`${panel} flex flex-col gap-1.5`}>
            <div className={statLabel}>{t.perceived}</div>
            <div className={bigValue}>{euro(summary.seller_perceived_property_price)}</div>
          </div>
        ) : null}
        {/* Mission 109 — sans décision de prix enregistrée, aucun prix final devant le vendeur. */}
        {decision ? (
          <div className={`${panel} flex flex-col gap-1.5`}>
            <div className={statLabel}>{t.competitorPrice}</div>
            <div className={bigValue}>
              {euro(sellerFacingCompetitorPrice(decision.advisorPrice, competitiveMarketCentral))}
            </div>
          </div>
        ) : null}
        <div className={`${panel} flex flex-col gap-1.5`}>
          <div className={statLabel}>{t.advisor}</div>
          <div className={bigValue}>{euro(decision?.advisorComparativeMarketPrice ?? null)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <div className={`${panelSoft} h-fit`}>
          <Line
            label={closest ? t.closestLine : t.dangerousLine}
            value={
              dangerous
                ? `${dangerousLabel}${
                    !closest && summary?.seller_most_dangerous_reason
                      ? ` — ${texts.live.answers.dangerousReason[summary.seller_most_dangerous_reason as DangerousReason]}`
                      : ''
                  }`
                : t.notSelected
            }
          />
          {decision?.justification ? (
            <div className="pt-3">
              <div className={statLabel}>{t.justification}</div>
              <p className="mt-1 text-base whitespace-pre-wrap text-zinc-700 stage:text-white/80">
                {decision.justification}
              </p>
            </div>
          ) : null}
        </div>

        {dangerous ? (
          <div className="flex h-fit flex-col gap-3">
            <div className={statLabel}>{closest ? t.closestCard : t.dangerousCard}</div>
            <div className="overflow-hidden rounded-2xl border-2 border-brand/60 shadow-card stage:border-brand/50">
              <LivePhoto
                photoUrl={dangerous.photoUrl}
                photoUrls={[]}
                alt={dangerousLabel}
                compact
              />
              <div className="flex items-baseline justify-between gap-3 bg-white p-4 stage:bg-white/5">
                <span className={statValue}>{dangerousLabel}</span>
                <span className="font-title text-xl font-bold text-brand-deep stage:text-white">
                  {euro(dangerous.price)}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Mission 112 — sans décision de prix, aucun prix final : la phrase non plus. */}
      {decision ? (
        <p className="max-w-3xl text-base text-zinc-600 stage:text-white/70">{t.sentence}</p>
      ) : null}

      {/* Mission 53 §1 — la seule question qui vient après l'analyse. Repères au-dessus (déjà
          vus), champ vide en dessous. Remplir = l'accord. */}
      <LiveCommercializationPrice
        projectId={projectId}
        onPendingChange={onPendingPriceChange}
        onSaved={onPriceSaved}
        comparedPrices={advisorRange?.marketReading.prices ?? []}
      />
    </div>
  );
}

'use client';

import { LiveCommercializationPrice } from '@/features/meeting-conclusion/components/live-commercialization-price';
import { useLiveTexts } from '@/features/live-seller/components/live-texts';
import { RemoteImage } from '@/components/ui/remote-image';
import {
  figureCard,
  panelSoft,
  question,
  questionHint,
  screen,
  screenHead,
  statLabel,
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

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className={figureCard}>
      <div className={statLabel}>{label}</div>
      <div className="font-title text-lg leading-tight font-bold whitespace-nowrap text-zinc-900 stage:text-white">
        {value}
      </div>
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

  // Mission 148 — l'écran tient sur la tablette (planche 5) : les trois prix sur une rangée basse,
  // le concurrent qui fait réfléchir en carte horizontale à côté de la justification, puis « Sur
  // quel prix partons-nous ? », champ vide (M85), avec sa phrase de position (M94).
  return (
    <div className={screen}>
      <div className={screenHead}>
        <h2 className={question}>{t.title}</h2>
        <p className={questionHint}>{t.hint}</p>
      </div>

      {/* Mission 89 — devant le vendeur, un seul prix calculé : « Prix des concurrents ». Le
          « Marché calculé » brut ne s'affiche plus ici. */}
      <div className="grid shrink-0 grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-2">
        {/* Mission 131 — sans valeur perçue (présentation directe), pas de case vide. */}
        {summary?.seller_perceived_property_price != null ? (
          <Figure label={t.perceived} value={euro(summary.seller_perceived_property_price)} />
        ) : null}
        {/* Mission 109 — sans décision de prix enregistrée, aucun prix final devant le vendeur. */}
        {decision ? (
          <Figure
            label={t.competitorPrice}
            value={euro(
              sellerFacingCompetitorPrice(decision.advisorPrice, competitiveMarketCentral),
            )}
          />
        ) : null}
        <Figure label={t.advisor} value={euro(decision?.advisorComparativeMarketPrice ?? null)} />
      </div>

      <div className="grid shrink-0 grid-cols-1 gap-2 md:landscape:grid-cols-2">
        {dangerous ? (
          <div className="grid grid-cols-[6rem_1fr] overflow-hidden rounded-xl border-2 border-brand/60 shadow-card stage:border-brand/50">
            {dangerous.photoUrl ? (
              <RemoteImage
                src={dangerous.photoUrl}
                alt={dangerousLabel}
                className="h-full min-h-20 w-full object-cover"
                fallbackClassName="h-full min-h-20 w-full"
                fallbackLabel={texts.common.photos.short}
                eager
              />
            ) : (
              <div className="flex h-full min-h-20 items-center justify-center bg-zinc-50 text-xs text-zinc-500 stage:bg-white/5 stage:text-white/40">
                {texts.common.photos.short}
              </div>
            )}
            <div className="flex min-w-0 flex-col gap-0.5 bg-white px-3 py-2 stage:bg-white/5">
              <span className={statLabel}>{closest ? t.closestCard : t.dangerousCard}</span>
              <span className="font-title text-sm leading-snug font-semibold text-zinc-900 stage:text-white">
                {dangerousLabel}
                {!closest && summary?.seller_most_dangerous_reason
                  ? ` — ${texts.live.answers.dangerousReason[summary.seller_most_dangerous_reason as DangerousReason]}`
                  : ''}
              </span>
              <span className="font-title text-lg font-bold text-brand-deep stage:text-white">
                {euro(dangerous.price)}
              </span>
            </div>
          </div>
        ) : (
          <div className={`${panelSoft} flex flex-col gap-0.5`}>
            <span className={statLabel}>{closest ? t.closestLine : t.dangerousLine}</span>
            <span className="text-sm text-zinc-700 stage:text-white/80">{t.notSelected}</span>
          </div>
        )}
        {decision?.justification ? (
          <div className={`${panelSoft} flex flex-col gap-0.5`}>
            <div className={statLabel}>{t.justification}</div>
            <p className="text-sm whitespace-pre-wrap text-zinc-700 stage:text-white/80">
              {decision.justification}
            </p>
          </div>
        ) : null}
      </div>

      {/* Mission 112 — sans décision de prix, aucun prix final : la phrase non plus. */}
      {decision ? (
        <p className="max-w-3xl shrink-0 text-sm text-zinc-600 stage:text-white/70">{t.sentence}</p>
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

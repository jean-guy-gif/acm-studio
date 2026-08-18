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
import { DANGEROUS_REASON_LABELS, type DangerousReason } from '@/features/live-seller/constants';
import type { LiveComparativeData } from '@/features/seller-presentation/types/seller-presentation';

const euro = (value: number | null): string =>
  value != null ? `${Math.round(value).toLocaleString('fr-FR')}\u00A0€` : '—';

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

export function LivePageConclusion({ live }: { live: LiveComparativeData }) {
  const summary = live.sellerSummary;
  const dangerous = live.comparables.find(
    (c) => c.id === summary?.seller_most_dangerous_comparable_id,
  );
  const decision = live.advisorDecision;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-3">
        <h2 className={question}>Conclusion</h2>
        <p className={questionHint}>
          Ce que le rendez-vous a construit, noir sur blanc — la décision vous appartient.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className={`${panel} flex flex-col gap-1.5`}>
          <div className={statLabel}>Valeur perçue par le vendeur</div>
          <div className={bigValue}>{euro(summary?.seller_perceived_property_price ?? null)}</div>
        </div>
        <div className={`${panel} flex flex-col gap-1.5`}>
          <div className={statLabel}>Positionnement observé sur le marché concurrentiel</div>
          <div className={bigValue}>{euro(live.competitiveMarketCentral)}</div>
        </div>
        <div className={`${panel} flex flex-col gap-1.5`}>
          <div className={statLabel}>Analyse comparative de marché du conseiller</div>
          <div className={bigValue}>{euro(summary?.advisor_comparative_market_price ?? null)}</div>
        </div>
        <div className={`${panel} flex flex-col gap-1.5`}>
          <div className={statLabel}>Prix conseillé (validé)</div>
          <div className={bigValue}>{euro(decision?.advisorPrice ?? null)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <div className={`${panelSoft} h-fit`}>
          <Line
            label="Prix souhaité par le vendeur (enregistré)"
            value={euro(decision?.sellerPrice ?? null)}
          />
          <Line
            label="Concurrent le plus dangereux"
            value={
              dangerous
                ? `${dangerous.title ?? 'Bien concurrent'}${
                    summary?.seller_most_dangerous_reason
                      ? ` — ${DANGEROUS_REASON_LABELS[summary.seller_most_dangerous_reason as DangerousReason]}`
                      : ''
                  }`
                : 'Non sélectionné'
            }
          />
          {decision?.justification ? (
            <div className="pt-3">
              <div className={statLabel}>Justification du conseiller</div>
              <p className="mt-1 text-base whitespace-pre-wrap text-zinc-700 stage:text-white/80">
                {decision.justification}
              </p>
            </div>
          ) : null}
        </div>

        {dangerous ? (
          <div className="flex h-fit flex-col gap-3">
            <div className={statLabel}>Le concurrent qui vous fait le plus réfléchir</div>
            <div className="overflow-hidden rounded-2xl border-2 border-brand/60 shadow-card stage:border-brand/50">
              <LivePhoto
                photoUrl={dangerous.photoUrl}
                photoUrls={[]}
                alt={dangerous.title ?? 'Bien concurrent'}
                compact
              />
              <div className="flex items-baseline justify-between gap-3 bg-white p-4 stage:bg-white/5">
                <span className={statValue}>{dangerous.title ?? 'Bien concurrent'}</span>
                <span className="font-title text-xl font-bold text-brand-deep stage:text-white">
                  {euro(dangerous.price)}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <p className="max-w-3xl text-base text-zinc-600 stage:text-white/70">
        Le marché concurrentiel montre à quels biens votre logement sera comparé. L’analyse
        comparative du conseiller détermine le positionnement professionnel proposé.
      </p>
    </div>
  );
}

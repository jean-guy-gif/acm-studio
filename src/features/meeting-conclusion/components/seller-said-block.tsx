import { metaLabel } from '@/components/ui/styles';
import type { SellerSaid } from '@/features/meeting-conclusion/services/seller-said';

const line = 'text-sm text-zinc-700 stage:text-white/80';

// Mission 96 — « Ce que le vendeur a dit » : ses réponses du Live réunies, pour relancer avec
// ses propres mots. Écran conseiller, jamais montré au vendeur. Le composant affiche ce que le
// service a préparé (seller-said.ts) : une donnée absente n'a pas de ligne.
export function SellerSaidBlock({ said }: { said: SellerSaid }) {
  return (
    <section data-testid="seller-said" className="flex flex-col gap-2">
      <h3 className={metaLabel}>Ce que le vendeur a dit</h3>
      {said.path.length > 0 ? (
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-zinc-700 stage:text-white/80">
          {said.path.map((step, index) => (
            <span key={step.label} className="whitespace-nowrap">
              {index > 0 ? (
                <span className="mr-2 text-zinc-500 stage:text-white/40" aria-hidden>
                  →
                </span>
              ) : null}
              {step.label}&nbsp;:{' '}
              <span className="font-title font-semibold text-zinc-900 stage:text-white">
                {step.value}
              </span>
            </span>
          ))}
        </p>
      ) : null}
      {said.guesses.map((guess, index) => (
        <p key={guess} className={line}>
          {guess}
          {said.guessesNote && index === said.guesses.length - 1 ? ` (${said.guessesNote})` : ''}.
        </p>
      ))}
      {said.priceDrops ? <p className={line}>{said.priceDrops}.</p> : null}
      {said.dangerous ? (
        <p className={line}>Le concurrent le plus dangereux, selon lui&nbsp;: {said.dangerous}.</p>
      ) : null}
      {said.readiness ? <p className={line}>Prêt à lancer&nbsp;: {said.readiness}.</p> : null}
      {said.readinessMissing ? (
        <p className={`${line} whitespace-pre-wrap`}>
          Ce qui lui manquait pour être à 10&nbsp;: «&nbsp;{said.readinessMissing}&nbsp;»
        </p>
      ) : null}
      {said.liveDuration ? <p className={line}>{said.liveDuration}.</p> : null}
      {said.buyersShown ? (
        <p className={line} data-testid="seller-said-buyers-shown">
          {said.buyersShown}.
        </p>
      ) : null}
    </section>
  );
}

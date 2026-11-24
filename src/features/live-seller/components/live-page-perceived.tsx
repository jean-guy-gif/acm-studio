'use client';

import { useLiveTexts } from '@/features/live-seller/components/live-texts';
import { LiveLockedAnswer } from '@/features/live-seller/components/live-locked-answer';
import {
  bigInput,
  bigInputUnit,
  navBtn,
  panel,
  question,
  questionHint,
  revealValue,
  statLabel,
} from '@/features/live-seller/components/live-stage';
import type { LiveSellerSummary } from '@/features/live-seller/types';
import { formatEuro } from '@/lib/format';
import { PriceInput } from '@/features/live-seller/components/price-input';

// "Valeur perçue par le vendeur" — saisie manuelle du vendeur.
//
// MISSION 82 — la question se pose en DÉBUT de rendez-vous, avant le premier concurrent :
// la page ne révèle RIEN (ni marché, ni prix, ni fourchette). Le positionnement observé
// n'arrive que sur « Analyse des prix » (M51 : la révélation vient après la réponse).
// Écran contrôlé par le shell : formulaire nu, sans bouton propre.
//
// MISSION 92 — ce prix ne se donne qu'une fois. Avant de l'enregistrer, l'écran le redit en
// grand (« 350 000 € ? ») : une faute de frappe se voit, une seule confirmation suffit.
// Enregistré, il se relit ici sans champ de saisie.
//
// Lancement, mission 1 (24/11) — le vendeur n'a aucune idée des prix : « Voir d'abord les biens et
// leurs prix », en contour sous le champ, passe le Live en présentation directe (M131) — chaque
// bien avec son prix, « Voir l'annonce » en un toucher. Le choix reste au conseiller, qui touche
// le bouton ; rien ne dit au vendeur qu'il n'a pas répondu. Le champ reste : il peut dire son prix.
export function LivePagePerceived({
  summary,
  confirming = null,
  onSeePricesFirst,
  switching = false,
}: {
  summary: LiveSellerSummary | null;
  // Le montant tapé, en attente de confirmation ; null tant que rien n'est à confirmer.
  confirming?: number | null;
  // Passe en présentation directe ; absent, le bouton ne s'affiche pas.
  onSeePricesFirst?: () => void;
  switching?: boolean;
}) {
  const saved = summary?.seller_perceived_property_price ?? null;
  const { language, texts } = useLiveTexts();
  const t = texts.live.perceived;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-3">
        <h2 className={question}>{t.question}</h2>
        <p className={questionHint}>{saved != null ? t.savedHint : t.hint}</p>
      </div>
      {saved != null ? (
        <div className={`${panel} flex flex-col gap-4`}>
          <LiveLockedAnswer value={formatEuro(saved, { language })} />
        </div>
      ) : (
        <form onSubmit={(e) => e.preventDefault()} className={`${panel} flex flex-col gap-4`}>
          <label className="flex flex-col gap-2">
            <span className={statLabel}>{t.label}</span>
            <div className="flex items-center gap-3">
              <PriceInput
                name="seller_perceived_property_price"
                language={language}
                required
                className={bigInput}
              />
              <span className={bigInputUnit}>€</span>
            </div>
          </label>
          {confirming != null ? (
            <div className="live-reveal-pop flex flex-col gap-2" role="status" aria-live="polite">
              <span className={revealValue}>
                {formatEuro(confirming, { language })}
                {texts.common.questionMark}
              </span>
              <span className={questionHint}>{t.confirmHint}</span>
            </div>
          ) : null}
          {onSeePricesFirst ? (
            <div className="flex justify-start border-t border-zinc-200 pt-3 stage:border-white/15">
              <button
                type="button"
                onClick={onSeePricesFirst}
                disabled={switching}
                aria-busy={switching || undefined}
                data-testid="live-see-prices-first"
                className={`${navBtn} px-4 py-2 disabled:opacity-60`}
              >
                {t.seePricesFirst}
              </button>
            </div>
          ) : null}
        </form>
      )}
    </div>
  );
}

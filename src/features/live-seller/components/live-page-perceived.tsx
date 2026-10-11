'use client';

import { LiveLockedAnswer } from '@/features/live-seller/components/live-locked-answer';
import {
  bigInput,
  bigInputUnit,
  panel,
  question,
  questionHint,
  revealValue,
  statLabel,
} from '@/features/live-seller/components/live-stage';
import type { LiveSellerSummary } from '@/features/live-seller/types';
import { formatEuro } from '@/lib/format';

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
export function LivePagePerceived({
  summary,
  confirming = null,
}: {
  summary: LiveSellerSummary | null;
  // Le montant tapé, en attente de confirmation ; null tant que rien n'est à confirmer.
  confirming?: number | null;
}) {
  const saved = summary?.seller_perceived_property_price ?? null;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-3">
        <h2 className={question}>À quel prix positionneriez-vous aujourd’hui votre bien ?</h2>
        <p className={questionHint}>
          {saved != null
            ? 'Votre prix de départ est noté : il ne se modifie plus.'
            : 'D’abord votre intuition, avant de regarder le marché : c’est elle que nous notons ici.'}
        </p>
      </div>
      {saved != null ? (
        <div className={`${panel} flex flex-col gap-4`}>
          <LiveLockedAnswer value={formatEuro(saved)} />
        </div>
      ) : (
        <form onSubmit={(e) => e.preventDefault()} className={`${panel} flex flex-col gap-4`}>
          <label className="flex flex-col gap-2">
            <span className={statLabel}>Votre valeur perçue</span>
            <div className="flex items-center gap-3">
              <input
                type="number"
                name="seller_perceived_property_price"
                min={0}
                step="any"
                placeholder="0"
                defaultValue=""
                className={bigInput}
              />
              <span className={bigInputUnit}>€</span>
            </div>
          </label>
          {confirming != null ? (
            <div className="live-reveal-pop flex flex-col gap-2" role="status" aria-live="polite">
              <span className={revealValue}>{formatEuro(confirming)}&nbsp;?</span>
              <span className={questionHint}>
                Est-ce bien votre prix&nbsp;? Une fois confirmé, il ne se modifie plus.
              </span>
            </div>
          ) : null}
        </form>
      )}
    </div>
  );
}

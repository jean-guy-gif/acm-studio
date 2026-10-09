'use client';

import {
  bigInput,
  bigInputUnit,
  panel,
  question,
  questionHint,
  statLabel,
} from '@/features/live-seller/components/live-stage';
import type { LiveSellerSummary } from '@/features/live-seller/types';

// "Valeur perçue par le vendeur" — saisie manuelle du vendeur.
//
// MISSION 82 — la question se pose en DÉBUT de rendez-vous, avant le premier concurrent :
// la page ne révèle RIEN (ni marché, ni prix, ni fourchette). Le positionnement observé
// n'arrive que sur « Analyse des prix » (M51 : la révélation vient après la réponse).
// Écran contrôlé par le shell : formulaire nu, sans bouton propre.
export function LivePagePerceived({ summary }: { summary: LiveSellerSummary | null }) {
  const perceived = summary?.seller_perceived_property_price ?? '';

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-3">
        <h2 className={question}>À quel prix positionneriez-vous aujourd’hui votre bien ?</h2>
        <p className={questionHint}>
          D’abord votre intuition, avant de regarder le marché : c’est elle que nous notons ici.
        </p>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className={`${panel} flex flex-col gap-4`}>
        <label className="flex flex-col gap-2">
          <span className={statLabel}>Valeur perçue par le vendeur</span>
          <div className="flex items-center gap-3">
            <input
              type="number"
              name="seller_perceived_property_price"
              min={0}
              step="any"
              placeholder="0"
              defaultValue={perceived}
              className={bigInput}
            />
            <span className={bigInputUnit}>€</span>
          </div>
        </label>
      </form>
    </div>
  );
}

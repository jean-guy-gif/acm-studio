'use client';

import {
  bigInput,
  bigInputUnit,
  panel,
  panelSoft,
  question,
  questionHint,
  statLabel,
  statValue,
} from '@/features/live-seller/components/live-stage';
import type { LiveSellerSummary } from '@/features/live-seller/types';

const euro = (value: number | null): string =>
  value != null ? `${Math.round(value).toLocaleString('fr-FR')} €` : '—';

// "1. Valeur perçue par le vendeur" — saisie manuelle du vendeur.
//
// MISSION 51 — DEVINE-PUIS-RÉVÈLE : le positionnement marché n'est PAS montré à
// l'arrivée (ce serait ancrer le vendeur sur la réponse qu'on cherche). Il est LIVRÉ et
// affiché seulement APRÈS que le vendeur a donné sa valeur perçue (`revealed`). Écran
// contrôlé par le shell : formulaire nu, sans bouton propre.
export function LivePagePerceived({
  competitiveMarketCentral,
  revealed,
  summary,
}: {
  competitiveMarketCentral: number | null;
  revealed: boolean;
  summary: LiveSellerSummary | null;
}) {
  const perceived = summary?.seller_perceived_property_price ?? '';

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-3">
        <h2 className={question}>À quel prix positionneriez-vous aujourd’hui votre bien ?</h2>
        <p className={questionHint}>
          {revealed
            ? 'Voici le positionnement observé sur le marché concurrentiel, face à votre intuition.'
            : 'D’abord votre intuition, sans regarder le marché : c’est elle que nous notons ici.'}
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

      {revealed ? (
        <div className={`${panelSoft} live-reveal-pop`}>
          <div className={statLabel}>Positionnement observé sur le marché concurrentiel</div>
          <div className={statValue}>{euro(competitiveMarketCentral)}</div>
        </div>
      ) : null}
    </div>
  );
}

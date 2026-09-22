'use client';

import { useState } from 'react';

import {
  btnPrimary,
  card,
  fieldLabel,
  inputBase,
  metaLabel,
  sectionTitle,
} from '@/components/ui/styles';
import { BuyerMatchCard } from '@/features/meeting-conclusion/components/buyer-match-card';
import type { SuiviDossier } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import {
  matchBuyerAgainstSuivi,
  type BuyerCriteria,
  type BuyerMatchResult,
} from '@/features/meeting-conclusion/services/buyer-match';

const num = (value: FormDataEntryValue | null): number | null => {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const text = (value: FormDataEntryValue | null): string | null => {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  return value.trim();
};

// Mission 54 §3 — la recherche acheteur : un panneau JETABLE (rien enregistré, pas de fiche
// acheteur). Le rapprochement (matchBuyerAgainstSuivi) réutilise le moteur des concurrents
// et tourne côté client — l'écran est advisor-only, les prix de référence y sont déjà.
export function BuyerSearchPanel({ dossiers }: { dossiers: SuiviDossier[] }) {
  const [result, setResult] = useState<BuyerMatchResult | null>(null);

  return (
    <section className={`${card} flex flex-col gap-4 p-5`}>
      <div className="flex flex-col gap-1">
        <h2 className={sectionTitle}>Un acheteur dans le pipe&nbsp;?</h2>
        <p className="text-sm text-zinc-500 stage:text-white/60">
          Tapez sa recherche pour voir quels dossiers du Suivi lui correspondent. Rien n’est
          enregistré.
        </p>
      </div>

      <form
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const criteria: BuyerCriteria = {
            propertyType: text(formData.get('propertyType')),
            roomsCount: num(formData.get('roomsCount')),
            surfaceArea: num(formData.get('surfaceArea')),
            budgetMin: num(formData.get('budgetMin')),
            budgetMax: num(formData.get('budgetMax')),
            city: text(formData.get('city')),
          };
          setResult(matchBuyerAgainstSuivi(criteria, dossiers));
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Type de bien</span>
          <input name="propertyType" type="text" placeholder="Appartement…" className={inputBase} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Pièces</span>
          <input name="roomsCount" type="number" min={0} className={inputBase} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Surface (m²)</span>
          <input name="surfaceArea" type="number" min={0} className={inputBase} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Budget min (€)</span>
          <input name="budgetMin" type="number" min={0} className={inputBase} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Budget max (€)</span>
          <input name="budgetMax" type="number" min={0} className={inputBase} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Secteur / commune</span>
          <input name="city" type="text" placeholder="Nice…" className={inputBase} />
        </label>
        <div className="sm:col-span-2 lg:col-span-3">
          <button type="submit" className={btnPrimary}>
            Rapprocher du Suivi
          </button>
        </div>
      </form>

      {result != null ? (
        <div className="flex flex-col gap-4">
          {result.ranked.length > 0 ? (
            <div className="flex flex-col gap-2">
              <span className={metaLabel}>
                {result.ranked.length} dossier{result.ranked.length > 1 ? 's' : ''} du même type, du
                plus proche au plus éloigné
              </span>
              <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {result.ranked.map((match) => (
                  <BuyerMatchCard key={match.dossier.project.id} match={match} />
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-zinc-500 stage:text-white/60">
              Aucun dossier du type recherché dans le Suivi.
            </p>
          )}

          {/* §3.2 — les dossiers sans type normalisable, À PART, jamais mêlés au classement. */}
          {result.unclassified.length > 0 ? (
            <div className="flex flex-col gap-2 border-t border-zinc-100 pt-4 stage:border-white/10">
              <span className={metaLabel}>
                Type non renseigné — à vérifier ({result.unclassified.length})
              </span>
              <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {result.unclassified.map((match) => (
                  <BuyerMatchCard key={match.dossier.project.id} match={match} />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

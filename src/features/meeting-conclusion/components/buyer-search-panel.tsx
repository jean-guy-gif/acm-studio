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
  noneOfTypeLabel,
  typeCountLabel,
  type BuyerCriteria,
  type BuyerMatchResult,
  type SuiviComposition,
} from '@/features/meeting-conclusion/services/buyer-match';

// « 3 appartements · 1 maison · 2 sans type » — ce que le Suivi CONTIENT.
function compositionLine(composition: SuiviComposition): string {
  const parts = composition.byType.map(typeCountLabel);
  if (composition.unclassifiedCount > 0) {
    parts.push(`${composition.unclassifiedCount} sans type`);
  }
  return parts.join(' · ');
}

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
          {/* Le RÉSULTAT saute aux yeux — surtout quand il est vide : un bloc net qui dit
              ce que le Suivi contient, pas une ligne grise. */}
          {result.ranked.length > 0 ? (
            <div className="rounded-2xl border border-brand/30 bg-brand-soft/60 p-5 stage:border-brand/40 stage:bg-brand/10">
              <p className="font-title text-3xl font-bold text-brand-deep stage:text-brand">
                {result.ranked.length} dossier{result.ranked.length > 1 ? 's' : ''} rapproché
                {result.ranked.length > 1 ? 's' : ''}
              </p>
              <p className="mt-1 text-sm text-zinc-600 stage:text-white/70">
                Rapprochement de votre recherche — ce n’est pas la liste complète du Suivi.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 stage:border-amber-400/50 stage:bg-amber-500/10">
              <p className="font-title text-2xl font-bold text-amber-900 sm:text-3xl stage:text-amber-200">
                {result.requestedType != null
                  ? `Votre Suivi ne contient ${noneOfTypeLabel(result.requestedType)}`
                  : 'Aucun dossier ne correspond à cette recherche'}
              </p>
              {result.composition.byType.length > 0 || result.composition.unclassifiedCount > 0 ? (
                <p className="mt-1 text-base font-medium text-amber-800 stage:text-amber-200/90">
                  Votre Suivi&nbsp;: {compositionLine(result.composition)}.
                </p>
              ) : null}
            </div>
          )}

          {result.ranked.length > 0 ? (
            <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {result.ranked.map((match) => (
                <BuyerMatchCard key={match.dossier.project.id} match={match} />
              ))}
            </ul>
          ) : null}

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

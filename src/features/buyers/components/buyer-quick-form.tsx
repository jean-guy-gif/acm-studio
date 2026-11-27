'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { alertError, btnPrimary, errorText, fieldLabel, inputBase } from '@/components/ui/styles';
import { saveQuickBuyer } from '@/features/buyers/actions/buyers';
import { BUYER_NAME_MAX } from '@/features/buyers/constants';
import {
  QUICK_STARS_MAX,
  QUICK_STAR_CRITERIA,
  type BuyerFormErrors,
} from '@/features/buyers/schemas/buyer-input';
import { BUDGET_STEPS, budgetStepLabel } from '@/features/buyers/services/budget-steps';
import { BUYER_CRITERION_LABELS, BUYER_PROPERTY_TYPES } from '@/features/buyers/types';
import { PROPERTY_TYPE_LABELS } from '@/features/subject-property/constants/property-options';

// Mission 132 — « La fiche en 30 secondes », en sortant d'un appel : un seul écran, au pouce — le
// nom, le téléphone, le type en boutons, le secteur parmi les villes de l'agence (ou tapé), le
// budget plafond en paliers, deux ★ au plus. Le reste se complète plus tard, sur la fiche. Le
// serveur revalide tout (même schéma que la fiche complète, plus la règle des deux ★).

const FAILED = 'La fiche n’a pas pu être enregistrée\u00a0: vérifiez la connexion, puis réessayez.';

const chip = (on: boolean) =>
  `min-h-11 rounded-full border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-40 ${
    on
      ? 'border-emerald-600 bg-emerald-600 text-white'
      : 'border-zinc-300 bg-white text-zinc-700 hover:border-emerald-600 stage:border-white/20 stage:bg-white/5 stage:text-white/85'
  }`;

const toggle = <T,>(list: T[], value: T): T[] =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

export function BuyerQuickForm({ cities: proposed }: { cities: string[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<BuyerFormErrors>({});
  const [types, setTypes] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [otherCity, setOtherCity] = useState('');
  const [budget, setBudget] = useState<number | 'other' | null>(null);
  const [otherBudget, setOtherBudget] = useState('');
  const [stars, setStars] = useState<string[]>([]);

  const submit = (formData: FormData) => {
    setError(null);
    for (const type of types) formData.append('property_types', type);
    for (const star of stars) formData.append('must_have', star);
    formData.set('cities', [...cities, otherCity].filter((city) => city.trim()).join(', '));
    formData.set(
      'budget_max',
      budget === 'other' ? otherBudget : budget != null ? String(budget) : '',
    );
    startTransition(async () => {
      const result = await saveQuickBuyer(formData).catch(() => ({
        ok: false as const,
        error: FAILED,
      }));
      if (!result.ok) {
        setErrors('errors' in result ? (result.errors ?? {}) : {});
        setError(result.error);
        return;
      }
      router.push(`/acquereurs/${result.buyerId}?enregistre=1&rapide=1`);
    });
  };

  const fieldError = (field: keyof BuyerFormErrors) =>
    errors[field] ? <span className={errorText}>{errors[field]}</span> : null;

  return (
    <form action={submit} className="flex flex-col gap-5" data-testid="buyer-quick-form">
      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>Nom</span>
        <input
          name="name"
          required
          maxLength={BUYER_NAME_MAX}
          autoComplete="off"
          placeholder="Famille Keller"
          className={inputBase}
        />
        {fieldError('name')}
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>Téléphone</span>
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          maxLength={40}
          placeholder="06 …"
          className={inputBase}
        />
        {fieldError('phone')}
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className={`${fieldLabel} mb-1`}>Type de bien</legend>
        <div className="flex flex-wrap gap-2">
          {BUYER_PROPERTY_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={types.includes(type)}
              onClick={() => setTypes((list) => toggle(list, type))}
              className={chip(types.includes(type))}
            >
              {PROPERTY_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className={`${fieldLabel} mb-1`}>Secteur</legend>
        {proposed.length > 0 ? (
          <div className="flex flex-wrap gap-2" data-testid="quick-cities">
            {proposed.map((city) => (
              <button
                key={city}
                type="button"
                aria-pressed={cities.includes(city)}
                onClick={() => setCities((list) => toggle(list, city))}
                className={chip(cities.includes(city))}
              >
                {city}
              </button>
            ))}
          </div>
        ) : null}
        <input
          value={otherCity}
          onChange={(event) => setOtherCity(event.target.value)}
          aria-label="Autre commune"
          placeholder={
            proposed.length > 0 ? 'Autre commune' : 'Commune(s), séparées par des virgules'
          }
          className={inputBase}
        />
        {fieldError('cities')}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className={`${fieldLabel} mb-1`}>Budget maximum</legend>
        <div className="flex flex-wrap gap-2" data-testid="quick-budgets">
          {BUDGET_STEPS.map((step) => (
            <button
              key={step}
              type="button"
              aria-pressed={budget === step}
              onClick={() => setBudget((current) => (current === step ? null : step))}
              className={chip(budget === step)}
            >
              {budgetStepLabel(step)}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={budget === 'other'}
            onClick={() => setBudget((current) => (current === 'other' ? null : 'other'))}
            className={chip(budget === 'other')}
          >
            Autre
          </button>
        </div>
        {budget === 'other' ? (
          <input
            value={otherBudget}
            onChange={(event) => setOtherBudget(event.target.value)}
            inputMode="numeric"
            aria-label="Budget maximum, en euros"
            placeholder="850 000"
            className={inputBase}
          />
        ) : null}
        {fieldError('budget_max')}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className={`${fieldLabel} mb-1`}>Indispensables · {QUICK_STARS_MAX} au plus</legend>
        <div className="flex flex-wrap gap-2" data-testid="quick-stars">
          {QUICK_STAR_CRITERIA.map((criterion) => {
            const on = stars.includes(criterion);
            return (
              <button
                key={criterion}
                type="button"
                aria-pressed={on}
                disabled={!on && stars.length >= QUICK_STARS_MAX}
                onClick={() => setStars((list) => toggle(list, criterion))}
                className={chip(on)}
              >
                ★ {BUYER_CRITERION_LABELS[criterion]}
              </button>
            );
          })}
        </div>
        {fieldError('must_have')}
      </fieldset>

      {error ? (
        <p role="alert" className={alertError}>
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className={`${btnPrimary} w-full sm:w-fit`}>
        {pending ? 'Enregistrement…' : 'Enregistrer la fiche'}
      </button>
    </form>
  );
}

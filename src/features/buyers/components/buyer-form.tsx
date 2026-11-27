'use client';

import { BUYER_LANGUAGE_LABELS, offeredLanguages } from '@/features/buyer-messages/languages';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  alertError,
  alertOk,
  btnPrimary,
  checkChip,
  errorText,
  fieldLabel,
  formSection,
  formSectionTitle,
  hintText,
  inputBase,
} from '@/components/ui/styles';
import { saveBuyer } from '@/features/buyers/actions/buyers';
import { BUYER_NAME_MAX, BUYER_TEXT_MAX } from '@/features/buyers/constants';
import type { BuyerFormErrors } from '@/features/buyers/schemas/buyer-input';
import {
  BUYER_CRITERIA,
  BUYER_CRITERION_LABELS,
  BUYER_PROPERTY_TYPES,
  BUYER_PURPOSES,
  BUYER_PURPOSE_LABELS,
  BUYER_SOFT_CRITERIA,
  BUYER_SOFT_CRITERION_LABELS,
  BUYER_SOFT_WORDS_MAX,
  BUYER_TIMELINES,
  BUYER_TIMELINE_LABELS,
  ENERGY_RATINGS,
  type Buyer,
  type BuyerInput,
} from '@/features/buyers/types';
import { PROPERTY_TYPE_LABELS } from '@/features/subject-property/constants/property-options';

// Mission 117 — la fiche acquéreur, en trois blocs : qui, ce qu'il cherche, ses lignes rouges.
// Tout est facultatif sauf le nom et au moins une commune ; le serveur revalide tout avant
// d'écrire (M43). Une fiche neuve peut arriver pré-remplie du rapprochement du Suivi
// (« Enregistrer cette recherche », M86) : les champs sont posés, rien n'est enregistré avant
// « Enregistrer ».

const SAVED = 'Fiche enregistrée.';
const FAILED = 'La fiche n’a pas pu être enregistrée\u00a0: vérifiez la connexion, puis réessayez.';

type TriState = boolean | null | undefined;
const tri = (value: TriState): string => (value === true ? 'yes' : value === false ? 'no' : '');
const num = (value: number | null | undefined): string => (value == null ? '' : String(value));

export function BuyerForm({ buyer, draft }: { buyer: Buyer | null; draft?: Partial<BuyerInput> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [errors, setErrors] = useState<BuyerFormErrors>({});
  const initial: Partial<BuyerInput> = buyer ?? draft ?? {};
  const mustHave = new Set(initial.mustHave ?? []);
  const softWords = new Map((initial.softCriteria ?? []).map((soft) => [soft.key, soft.words]));
  const types = new Set(initial.propertyTypes ?? []);

  const submit = (formData: FormData) => {
    setMessage(null);
    startTransition(async () => {
      const result = await saveBuyer(buyer?.id ?? null, formData).catch(() => ({
        ok: false as const,
        error: FAILED,
      }));
      if (!result.ok) {
        setErrors('errors' in result ? (result.errors ?? {}) : {});
        setMessage({ ok: false, text: result.error });
        return;
      }
      setErrors({});
      if (buyer) {
        setMessage({ ok: true, text: SAVED });
        router.refresh();
      } else {
        router.push(`/acquereurs/${result.buyerId}?enregistre=1`);
      }
    });
  };

  const error = (field: keyof BuyerFormErrors) =>
    errors[field] ? (
      <span className={errorText} data-testid={`buyer-error-${field}`}>
        {errors[field]}
      </span>
    ) : null;

  const text = (
    label: string,
    name: keyof BuyerFormErrors,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <label className="flex min-w-0 flex-col gap-1">
      <span className={fieldLabel}>{label}</span>
      <input name={name} className={`${inputBase} w-full`} {...props} />
      {error(name)}
    </label>
  );

  const select = (
    label: string,
    name: keyof BuyerFormErrors,
    options: { value: string; label: string }[],
    defaultValue: string,
  ) => (
    <label className="flex min-w-0 flex-col gap-1">
      <span className={fieldLabel}>{label}</span>
      <select name={name} defaultValue={defaultValue} className={`${inputBase} w-full`}>
        <option value="">Non renseigné</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error(name)}
    </label>
  );

  const yesNo = (label: string, name: keyof BuyerFormErrors, value: TriState) =>
    select(
      label,
      name,
      [
        { value: 'yes', label: 'Oui' },
        { value: 'no', label: 'Non' },
      ],
      tri(value),
    );

  return (
    <form
      className="flex flex-col gap-6"
      data-testid="buyer-form"
      onSubmit={(event) => {
        event.preventDefault();
        submit(new FormData(event.currentTarget));
      }}
    >
      <section className={formSection}>
        <h2 className={formSectionTitle}>Qui</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {text('Nom', 'name', {
            type: 'text',
            required: true,
            maxLength: BUYER_NAME_MAX,
            defaultValue: initial.name ?? '',
            placeholder: 'M. et Mme Durand',
          })}
          {text('Téléphone', 'phone', { type: 'tel', defaultValue: initial.phone ?? '' })}
          {text('E-mail', 'email', { type: 'email', defaultValue: initial.email ?? '' })}
          {select(
            'Raison de l’achat',
            'purpose',
            BUYER_PURPOSES.map((value) => ({ value, label: BUYER_PURPOSE_LABELS[value] })),
            initial.purpose ?? '',
          )}
          {/* Mission 139 — la langue de ses messages (les langues relues seulement). */}
          {select(
            'Langue de ses messages',
            'language',
            offeredLanguages(initial.language ?? null).map((value) => ({
              value,
              label: BUYER_LANGUAGE_LABELS[value],
            })),
            initial.language ?? 'fr',
          )}
          {select(
            'Calendrier',
            'timeline',
            BUYER_TIMELINES.map((value) => ({ value, label: BUYER_TIMELINE_LABELS[value] })),
            initial.timeline ?? '',
          )}
        </div>
        <label className="flex flex-col gap-1">
          <span className={fieldLabel}>Notes</span>
          <textarea
            name="notes"
            rows={3}
            maxLength={BUYER_TEXT_MAX}
            defaultValue={initial.notes ?? ''}
            className={`${inputBase} w-full`}
          />
          {error('notes')}
        </label>
      </section>

      <section className={formSection}>
        <h2 className={formSectionTitle}>Ce qu’il cherche</h2>
        <div className="flex flex-col gap-1">
          <span className={fieldLabel}>Type de bien</span>
          <div className="flex flex-wrap gap-2">
            {BUYER_PROPERTY_TYPES.map((type) => (
              <label key={type} className={checkChip}>
                <input
                  type="checkbox"
                  name="property_types"
                  value={type}
                  defaultChecked={types.has(type)}
                  className="accent-brand"
                />
                {PROPERTY_TYPE_LABELS[type]}
              </label>
            ))}
          </div>
          {error('property_types')}
        </div>
        {text('Communes', 'cities', {
          type: 'text',
          required: true,
          defaultValue: (initial.cities ?? []).join(', '),
          placeholder: 'Antibes, Juan-les-Pins, Vallauris',
        })}
        <p className={hintText}>
          Plusieurs communes, séparées par des virgules&#x202f;; «&nbsp;Paris 15e&nbsp;» pour un
          arrondissement.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {text('Budget idéal (€)', 'budget_ideal', {
            type: 'text',
            inputMode: 'numeric',
            defaultValue: num(initial.budgetIdeal),
          })}
          {text('Budget plafond (€)', 'budget_max', {
            type: 'text',
            inputMode: 'numeric',
            defaultValue: num(initial.budgetMax),
          })}
          {text('Pièces (minimum)', 'rooms_min', {
            type: 'text',
            inputMode: 'numeric',
            defaultValue: num(initial.roomsMin),
          })}
          {text('Chambres (minimum)', 'bedrooms_min', {
            type: 'text',
            inputMode: 'numeric',
            defaultValue: num(initial.bedroomsMin),
          })}
          {text('Surface (m², minimum)', 'surface_min', {
            type: 'text',
            inputMode: 'decimal',
            defaultValue: num(initial.surfaceMin),
          })}
          {text('Étage (minimum)', 'floor_min', {
            type: 'text',
            inputMode: 'numeric',
            defaultValue: num(initial.floorMin),
          })}
          {yesNo('Extérieur', 'outdoor', initial.outdoor)}
          {yesNo('Parking', 'parking', initial.parking)}
          {yesNo('Piscine', 'pool', initial.pool)}
          {yesNo('Ascenseur', 'elevator', initial.elevator)}
          {select(
            'DPE minimum',
            'energy_rating_max',
            ENERGY_RATINGS.map((value) => ({ value, label: `${value} ou mieux` })),
            initial.energyRatingMax ?? '',
          )}
          {yesNo('Travaux acceptés', 'works_accepted', initial.worksAccepted)}
          {yesNo('Copropriété acceptée', 'condominium_accepted', initial.condominiumAccepted)}
        </div>
      </section>

      {/* Mission 151 — « Ce qui compte pour eux » : la liste fermée, avec leurs mots. */}
      <section className={formSection} data-testid="buyer-form-soft">
        <h2 className={formSectionTitle}>Ce qui compte pour eux</h2>
        <p className={hintText}>
          Leurs mots. Les biens trouvés sont rangés d’après eux&#x202f;; aucun bien n’est écarté
          pour eux.
        </p>
        <div className="flex flex-col gap-2">
          {BUYER_SOFT_CRITERIA.map((key) => (
            <div key={key} className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className={`${checkChip} sm:w-64 sm:shrink-0`}>
                <input
                  type="checkbox"
                  name="soft_key"
                  value={key}
                  defaultChecked={softWords.has(key)}
                  className="accent-brand"
                />
                {BUYER_SOFT_CRITERION_LABELS[key]}
              </label>
              <input
                type="text"
                name={`soft_words_${key}`}
                aria-label={`Leurs mots\u00a0: ${BUYER_SOFT_CRITERION_LABELS[key]}`}
                maxLength={BUYER_SOFT_WORDS_MAX}
                defaultValue={softWords.get(key) ?? ''}
                placeholder="Leurs mots (facultatif)"
                className={`${inputBase} flex-1`}
              />
            </div>
          ))}
        </div>
      </section>

      <section className={formSection}>
        <h2 className={formSectionTitle}>Ses lignes rouges</h2>
        <div className="flex flex-col gap-1">
          <span className={fieldLabel}>Indispensable</span>
          <p className={hintText}>
            Cochez les critères sans lesquels il n’achète pas&#x202f;; les autres restent des
            préférences.
          </p>
          <div className="flex flex-wrap gap-2">
            {BUYER_CRITERIA.map((criterion) => (
              <label key={criterion} className={checkChip}>
                <input
                  type="checkbox"
                  name="must_have"
                  value={criterion}
                  defaultChecked={mustHave.has(criterion)}
                  className="accent-brand"
                />
                {BUYER_CRITERION_LABELS[criterion]}
              </label>
            ))}
            <label className={checkChip}>
              <input
                type="checkbox"
                name="condominium_must_have"
                value="yes"
                defaultChecked={initial.condominiumMustHave === true}
                className="accent-brand"
              />
              Copropriété
            </label>
          </div>
          {error('must_have')}
        </div>
        <label className="flex flex-col gap-1">
          <span className={fieldLabel}>Critères éliminatoires</span>
          <textarea
            name="deal_breakers"
            rows={3}
            maxLength={BUYER_TEXT_MAX}
            defaultValue={initial.dealBreakers ?? ''}
            placeholder="Rez-de-chaussée, vis-à-vis, route passante…"
            className={`${inputBase} w-full`}
          />
          {error('deal_breakers')}
        </label>
      </section>

      {message ? (
        <p
          role="alert"
          className={message.ok ? alertOk : alertError}
          data-testid="buyer-form-message"
        >
          {message.text}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
}

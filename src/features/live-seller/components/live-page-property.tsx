'use client';

import { useActionState } from 'react';

import { SubmitButton } from '@/components/submit-button';
import {
  initialLiveActionState,
  type LiveActionState,
} from '@/features/live-seller/actions/live-action-state';
import { LiveGallery } from '@/features/live-seller/components/live-gallery';
import {
  choice,
  ctaPrimary,
  errorText,
  fieldInput,
  fieldLabel,
  okText,
  panel,
  panelSoft,
  question,
  questionHint,
  statLabel,
  statValue,
} from '@/features/live-seller/components/live-stage';
import {
  PROPERTY_CONFIRMED_LABELS,
  PROPERTY_CONFIRMED_VALUES,
} from '@/features/live-seller/constants';
import type { LiveSellerSummary } from '@/features/live-seller/types';
import {
  EXPOSURE_LABELS,
  GENERAL_CONDITION_LABELS,
  HEATING_TYPE_LABELS,
  OUTDOOR_SPACE_LABELS,
  PARKING_TYPE_LABELS,
  type Exposure,
  type GeneralCondition,
  type HeatingType,
  type OutdoorSpace,
  type ParkingType,
} from '@/features/subject-property/constants/property-options';
import type { SellerPresentationProperty } from '@/features/seller-presentation/types/seller-presentation';

// Act 1 — "Votre bien". The seller RECOGNISES the property before any competitor
// is shown. Never a price, never the advisor range, never an estimate: the whole
// point of this slide is recognition, and the seller's yes/no + free comment.
function labelOf<T extends string>(map: Record<T, string>, value: string | null): string | null {
  if (value == null) {
    return null;
  }
  return (map as Record<string, string>)[value] ?? value;
}

function joinLabels<T extends string>(map: Record<T, string>, values: string[]): string | null {
  const kept = values.filter((value) => value && value !== 'none');
  if (kept.length === 0) {
    return null;
  }
  return kept.map((value) => (map as Record<string, string>)[value] ?? value).join(', ');
}

export function LivePageProperty({
  property,
  summary,
  saveAction,
}: {
  property: SellerPresentationProperty;
  summary: LiveSellerSummary | null;
  saveAction: (state: LiveActionState, formData: FormData) => Promise<LiveActionState>;
}) {
  const [state, formAction] = useActionState(saveAction, initialLiveActionState);
  const currentAnswer =
    state.values?.seller_property_confirmed ?? summary?.seller_property_confirmed ?? '';
  const currentComment =
    state.values?.seller_property_comment ?? summary?.seller_property_comment ?? '';

  const floors =
    property.floor != null
      ? property.buildingFloors != null
        ? `${property.floor}/${property.buildingFloors}`
        : String(property.floor)
      : null;

  // Recognition characteristics only — deliberately no price, charges or tax.
  const stats: { label: string; value: string | null }[] = [
    { label: 'Type', value: property.propertyType },
    { label: 'Surface', value: property.surfaceArea != null ? `${property.surfaceArea} m²` : null },
    { label: 'Pièces', value: property.roomsCount != null ? String(property.roomsCount) : null },
    {
      label: 'Chambres',
      value: property.bedroomsCount != null ? String(property.bedroomsCount) : null,
    },
    { label: 'Étage', value: floors },
    { label: 'Exposition', value: labelOf<Exposure>(EXPOSURE_LABELS, property.exposure) },
    {
      label: 'État',
      value: labelOf<GeneralCondition>(GENERAL_CONDITION_LABELS, property.generalCondition),
    },
    {
      label: 'Construction',
      value: property.constructionYear != null ? String(property.constructionYear) : null,
    },
    { label: 'Chauffage', value: labelOf<HeatingType>(HEATING_TYPE_LABELS, property.heatingType) },
    { label: 'DPE', value: property.energyRating },
    { label: 'GES', value: property.gesRating },
    {
      label: 'Extérieurs',
      value: joinLabels<OutdoorSpace>(OUTDOOR_SPACE_LABELS, property.outdoorSpaces),
    },
    {
      label: 'Stationnement',
      value: joinLabels<ParkingType>(PARKING_TYPE_LABELS, property.parkingTypes),
    },
    { label: 'Quartier', value: property.district },
    { label: 'Ville', value: property.city },
    { label: 'Adresse', value: property.address },
  ].filter((stat) => stat.value != null && stat.value !== '');

  const alt = [property.propertyType, property.city].filter(Boolean).join(' · ') || 'Votre bien';

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-3">
        <h2 className={question}>Votre bien</h2>
        <p className={questionHint}>Reconnaissez-vous votre bien dans cette présentation ?</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-8">
        <div className="flex flex-col gap-4">
          <LiveGallery photos={property.photoUrls} alt={alt} />

          {stats.length > 0 ? (
            <div className={`${panelSoft} grid grid-cols-2 gap-4 sm:grid-cols-3`}>
              {stats.map((stat) => (
                <div key={stat.label}>
                  <div className={statLabel}>{stat.label}</div>
                  <div className={statValue}>{stat.value}</div>
                </div>
              ))}
            </div>
          ) : null}

          {property.description ? (
            <p className="text-sm whitespace-pre-wrap text-zinc-600 stage:text-white/70">
              {property.description}
            </p>
          ) : null}

          {property.features.length > 0 ? (
            <div className={panelSoft}>
              <div className={statLabel}>Points forts</div>
              <div className={statValue}>{property.features.join(', ')}</div>
            </div>
          ) : null}
        </div>

        <form action={formAction} className={`${panel} flex h-fit flex-col gap-4`}>
          <fieldset className="flex flex-col gap-3">
            <legend className={fieldLabel}>
              Est-ce que cette présentation correspond bien à votre bien ?
            </legend>
            <div className="flex flex-col gap-3">
              {PROPERTY_CONFIRMED_VALUES.map((value) => (
                <label key={value} className={choice}>
                  <input
                    type="radio"
                    name="seller_property_confirmed"
                    value={value}
                    defaultChecked={currentAnswer === value}
                    className="sr-only"
                  />
                  {PROPERTY_CONFIRMED_LABELS[value]}
                </label>
              ))}
            </div>
            {state.fieldErrors.seller_property_confirmed ? (
              <span role="alert" className={errorText}>
                {state.fieldErrors.seller_property_confirmed}
              </span>
            ) : null}
          </fieldset>

          <label className="flex flex-col gap-1.5">
            <span className={fieldLabel}>Commentaire (facultatif)</span>
            <textarea
              name="seller_property_comment"
              rows={3}
              defaultValue={currentComment}
              className={fieldInput}
            />
          </label>

          {state.error ? (
            <p role="alert" className={errorText}>
              {state.error}
            </p>
          ) : null}
          {state.ok ? <p className={okText}>Réponse enregistrée.</p> : null}
          <SubmitButton pendingLabel="Enregistrement…" className={ctaPrimary}>
            Enregistrer la réponse
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}

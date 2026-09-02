'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  alertError,
  alertOk,
  btnPrimary,
  fieldLabel,
  formSection,
  formSectionTitle,
  inputBase,
} from '@/components/ui/styles';
import { PropertyCharacteristicsFields } from '@/features/subject-property/components/property-characteristics-fields';
import { PropertyEnergyFields } from '@/features/subject-property/components/property-energy-fields';
import { PropertyFinancialFields } from '@/features/subject-property/components/property-financial-fields';
import { PropertyListField } from '@/features/subject-property/components/property-list-field';
import { PropertyLocationFields } from '@/features/subject-property/components/property-location-fields';
import { PropertyPriceRangeStep } from '@/features/subject-property/components/property-price-range-step';
import { NumberField, TextField } from '@/features/subject-property/components/property-inputs';
import type { SaveSubjectPropertyResult } from '@/features/subject-property/actions/save-subject-property';
import type { SubjectProperty } from '@/features/subject-property/types';
import type { SubjectPropertyImportPrefill } from '@/features/subject-property-import/types';
import { SubjectPropertyPhotosField } from '@/features/subject-property-photos/components/subject-property-photos-field';
import type { UpdatePropertyPhotosResult } from '@/features/subject-property-photos/actions/update-property-photos';
import type { UploadPropertyPhotosResult } from '@/features/subject-property-photos/actions/upload-property-photos';
import type { SignedPhoto } from '@/features/subject-property-photos/services/property-photo-storage';

type ScalarState = {
  property_type: string;
  surface_area: string;
  land_area: string;
  rooms_count: string;
  bedrooms_count: string;
  bathrooms_count: string;
  address: string;
  postal_code: string;
  city: string;
  description: string;
  district: string;
  floor: string;
  building_floors: string;
  energy_rating: string;
  ges_rating: string;
  heating_type: string;
  exposure: string;
  construction_year: string;
  general_condition: string;
  monthly_charges: string;
  advisor_price_min: string;
  advisor_price_max: string;
  property_tax: string;
};

const str = (value: string | number | null | undefined): string =>
  value == null ? '' : String(value);

// An imported value (when present) pre-fills the field; otherwise the saved
// property value is kept. GUARDRAIL: the advisor range, the financials and the
// property type are NEVER seeded from an import — the range is the advisor's
// opinion, and a read price writes no field.
function initialScalars(
  property: SubjectProperty | null,
  imported?: SubjectPropertyImportPrefill,
): ScalarState {
  const pick = (
    importedValue: string | number | null | undefined,
    propertyValue: string | number | null | undefined,
  ): string => (imported && importedValue != null ? String(importedValue) : str(propertyValue));

  return {
    property_type: str(property?.property_type),
    surface_area: pick(imported?.surface_area, property?.surface_area),
    land_area: pick(imported?.land_area, property?.land_area),
    rooms_count: pick(imported?.rooms_count, property?.rooms_count),
    bedrooms_count: pick(imported?.bedrooms_count, property?.bedrooms_count),
    bathrooms_count: pick(imported?.bathrooms_count, property?.bathrooms_count),
    address: pick(imported?.address, property?.address),
    postal_code: pick(imported?.postal_code, property?.postal_code),
    city: pick(imported?.city, property?.city),
    description: pick(imported?.description, property?.description),
    district: pick(imported?.district, property?.district),
    floor: str(property?.floor),
    building_floors: str(property?.building_floors),
    energy_rating: pick(imported?.energy_rating, property?.energy_rating),
    ges_rating: pick(imported?.ges_rating, property?.ges_rating),
    heating_type: pick(imported?.heating_type, property?.heating_type),
    exposure: pick(imported?.exposure, property?.exposure),
    construction_year: pick(imported?.construction_year, property?.construction_year),
    general_condition: pick(imported?.general_condition, property?.general_condition),
    monthly_charges: str(property?.monthly_charges),
    advisor_price_min: str(property?.advisor_price_min),
    advisor_price_max: str(property?.advisor_price_max),
    property_tax: str(property?.property_tax),
  };
}

function initialArray(
  importedValue: string[] | undefined,
  propertyValue: string[] | null | undefined,
): string[] {
  if (importedValue && importedValue.length > 0) {
    return importedValue;
  }
  return propertyValue ?? [];
}

export function SubjectPropertyForm({
  property,
  saveAction,
  photos,
  uploadPhotosAction,
  updatePhotosAction,
  imported,
  findHref,
}: {
  property: SubjectProperty | null;
  saveAction: (formData: FormData) => Promise<SaveSubjectPropertyResult>;
  photos: SignedPhoto[];
  uploadPhotosAction: (formData: FormData) => Promise<UploadPropertyPhotosResult>;
  updatePhotosAction: (desiredPaths: string[]) => Promise<UpdatePropertyPhotosResult>;
  // Pre-fill coming from an online-listing import (Mission 38). Optional: absent
  // for a purely manual sheet and for the design preview.
  imported?: SubjectPropertyImportPrefill;
  findHref?: string;
}) {
  const router = useRouter();
  const [scalars, setScalars] = useState<ScalarState>(() => initialScalars(property, imported));
  const [outdoorSpaces, setOutdoorSpaces] = useState<string[]>(() =>
    initialArray(imported?.outdoor_spaces, property?.outdoor_spaces),
  );
  const [parkingTypes, setParkingTypes] = useState<string[]>(() =>
    initialArray(imported?.parking_types, property?.parking_types),
  );
  const [strengths, setStrengths] = useState<string[]>(property?.strengths ?? []);
  const [watchPoints, setWatchPoints] = useState<string[]>(property?.watch_points ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const setField = (name: string, value: string) =>
    setScalars((previous) => ({ ...previous, [name]: value }));
  const setArray = (name: string, value: string[]) => {
    if (name === 'outdoor_spaces') setOutdoorSpaces(value);
    else if (name === 'parking_types') setParkingTypes(value);
  };

  function submit() {
    setBanner(null);
    setMessage(null);
    const formData = new FormData();
    for (const [name, value] of Object.entries(scalars)) {
      formData.set(name, value);
    }
    for (const value of outdoorSpaces) formData.append('outdoor_spaces', value);
    for (const value of parkingTypes) formData.append('parking_types', value);
    for (const value of strengths) formData.append('strengths', value);
    for (const value of watchPoints) formData.append('watch_points', value);

    startTransition(async () => {
      const result = await saveAction(formData);
      if (result.ok) {
        setErrors({});
        setMessage('Bien vendeur enregistré.');
        router.refresh();
      } else {
        setErrors(result.fieldErrors ?? {});
        setBanner(result.error ?? 'L’enregistrement a échoué.');
      }
    });
  }

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      {banner ? (
        <p role="alert" className={alertError}>
          {banner}
        </p>
      ) : null}
      {message ? <p className={alertOk}>{message}</p> : null}

      <section className={formSection}>
        <h2 className={formSectionTitle}>Informations générales</h2>
        <TextField
          label="Type de bien"
          value={scalars.property_type}
          onChange={(v) => setField('property_type', v)}
          error={errors.property_type}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField
            label="Surface"
            value={scalars.surface_area}
            min={0}
            suffix="m²"
            onChange={(v) => setField('surface_area', v)}
            error={errors.surface_area}
          />
          <NumberField
            label="Terrain"
            value={scalars.land_area}
            min={0}
            suffix="m²"
            onChange={(v) => setField('land_area', v)}
            error={errors.land_area}
          />
          <NumberField
            label="Pièces"
            value={scalars.rooms_count}
            step={1}
            min={0}
            onChange={(v) => setField('rooms_count', v)}
            error={errors.rooms_count}
          />
          <NumberField
            label="Chambres"
            value={scalars.bedrooms_count}
            step={1}
            min={0}
            onChange={(v) => setField('bedrooms_count', v)}
            error={errors.bedrooms_count}
          />
          <NumberField
            label="Salles de bains"
            value={scalars.bathrooms_count}
            step={1}
            min={0}
            onChange={(v) => setField('bathrooms_count', v)}
            error={errors.bathrooms_count}
          />
        </div>
        <TextField
          label="Adresse"
          value={scalars.address}
          onChange={(v) => setField('address', v)}
          error={errors.address}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Code postal"
            value={scalars.postal_code}
            onChange={(v) => setField('postal_code', v)}
            error={errors.postal_code}
          />
          <TextField
            label="Ville"
            value={scalars.city}
            onChange={(v) => setField('city', v)}
            error={errors.city}
          />
        </div>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Description</span>
          <textarea
            rows={4}
            value={scalars.description}
            onChange={(event) => setField('description', event.target.value)}
            className={inputBase}
          />
        </label>
      </section>

      <section className={formSection}>
        <h2 className={formSectionTitle}>Photos du bien vendeur</h2>
        <SubjectPropertyPhotosField
          photos={photos}
          uploadAction={uploadPhotosAction}
          updateAction={updatePhotosAction}
        />
      </section>

      <PropertyLocationFields
        district={scalars.district}
        floor={scalars.floor}
        buildingFloors={scalars.building_floors}
        onField={setField}
        errors={errors}
      />
      <PropertyEnergyFields
        energyRating={scalars.energy_rating}
        gesRating={scalars.ges_rating}
        heatingType={scalars.heating_type}
        onField={setField}
        errors={errors}
      />
      <PropertyCharacteristicsFields
        exposure={scalars.exposure}
        constructionYear={scalars.construction_year}
        generalCondition={scalars.general_condition}
        outdoorSpaces={outdoorSpaces}
        parkingTypes={parkingTypes}
        onField={setField}
        onArray={setArray}
        errors={errors}
      />
      <PropertyFinancialFields
        monthlyCharges={scalars.monthly_charges}
        propertyTax={scalars.property_tax}
        onField={setField}
        errors={errors}
      />

      <section className={formSection}>
        <h2 className={formSectionTitle}>Argumentaire</h2>
        <PropertyListField
          label="Points forts"
          items={strengths}
          onChange={setStrengths}
          error={errors.strengths}
        />
        <PropertyListField
          label="Points de vigilance"
          items={watchPoints}
          onChange={setWatchPoints}
          error={errors.watch_points}
        />
      </section>

      <PropertyPriceRangeStep
        advisorPriceMin={scalars.advisor_price_min}
        advisorPriceMax={scalars.advisor_price_max}
        onField={setField}
        errors={errors}
        findHref={findHref}
      />

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className={`${btnPrimary} self-start`}
      >
        {pending ? 'Enregistrement…' : 'Enregistrer le bien vendeur'}
      </button>
    </div>
  );
}

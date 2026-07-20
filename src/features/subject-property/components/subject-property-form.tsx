'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { PropertyCharacteristicsFields } from '@/features/subject-property/components/property-characteristics-fields';
import { PropertyEnergyFields } from '@/features/subject-property/components/property-energy-fields';
import { PropertyFinancialFields } from '@/features/subject-property/components/property-financial-fields';
import { PropertyListField } from '@/features/subject-property/components/property-list-field';
import { PropertyLocationFields } from '@/features/subject-property/components/property-location-fields';
import { NumberField, TextField } from '@/features/subject-property/components/property-inputs';
import type { SaveSubjectPropertyResult } from '@/features/subject-property/actions/save-subject-property';
import type { SubjectProperty } from '@/features/subject-property/types';

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
  property_tax: string;
};

const str = (value: string | number | null | undefined): string =>
  value == null ? '' : String(value);

function initialScalars(property: SubjectProperty | null): ScalarState {
  return {
    property_type: str(property?.property_type),
    surface_area: str(property?.surface_area),
    land_area: str(property?.land_area),
    rooms_count: str(property?.rooms_count),
    bedrooms_count: str(property?.bedrooms_count),
    bathrooms_count: str(property?.bathrooms_count),
    address: str(property?.address),
    postal_code: str(property?.postal_code),
    city: str(property?.city),
    description: str(property?.description),
    district: str(property?.district),
    floor: str(property?.floor),
    building_floors: str(property?.building_floors),
    energy_rating: str(property?.energy_rating),
    ges_rating: str(property?.ges_rating),
    heating_type: str(property?.heating_type),
    exposure: str(property?.exposure),
    construction_year: str(property?.construction_year),
    general_condition: str(property?.general_condition),
    monthly_charges: str(property?.monthly_charges),
    property_tax: str(property?.property_tax),
  };
}

export function SubjectPropertyForm({
  property,
  saveAction,
}: {
  property: SubjectProperty | null;
  saveAction: (formData: FormData) => Promise<SaveSubjectPropertyResult>;
}) {
  const router = useRouter();
  const [scalars, setScalars] = useState<ScalarState>(() => initialScalars(property));
  const [outdoorSpaces, setOutdoorSpaces] = useState<string[]>(property?.outdoor_spaces ?? []);
  const [parkingTypes, setParkingTypes] = useState<string[]>(property?.parking_types ?? []);
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
    <div className="flex max-w-2xl flex-col gap-6">
      {banner ? (
        <p role="alert" className="text-sm text-red-600">
          {banner}
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Informations générales</h2>
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
        <label className="flex flex-col gap-1">
          Description
          <textarea
            rows={4}
            value={scalars.description}
            onChange={(event) => setField('description', event.target.value)}
            className="rounded border px-2 py-1"
          />
        </label>
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

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">5. Argumentaire</h2>
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

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="self-start rounded border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        {pending ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </div>
  );
}

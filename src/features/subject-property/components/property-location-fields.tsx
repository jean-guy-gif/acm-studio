'use client';

import { NumberField, TextField } from '@/features/subject-property/components/property-inputs';

export function PropertyLocationFields({
  district,
  floor,
  buildingFloors,
  onField,
  errors,
}: {
  district: string;
  floor: string;
  buildingFloors: string;
  onField: (name: string, value: string) => void;
  errors: Record<string, string>;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-medium">1. Localisation</h2>
      <TextField
        label="Quartier"
        value={district}
        onChange={(value) => onField('district', value)}
        error={errors.district}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField
          label="Étage"
          value={floor}
          step={1}
          min={-1}
          onChange={(value) => onField('floor', value)}
          error={errors.floor}
        />
        <NumberField
          label="Nombre total d’étages"
          value={buildingFloors}
          step={1}
          min={0}
          onChange={(value) => onField('building_floors', value)}
          error={errors.building_floors}
        />
      </div>
    </section>
  );
}

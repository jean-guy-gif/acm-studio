'use client';

import { formSection, formSectionTitle } from '@/components/ui/styles';
import { SelectField, TextField } from '@/features/subject-property/components/property-inputs';
import {
  GES_RATINGS,
  HEATING_TYPE_LABELS,
  HEATING_TYPES,
} from '@/features/subject-property/constants/property-options';

export function PropertyEnergyFields({
  energyRating,
  gesRating,
  heatingType,
  onField,
  errors,
}: {
  energyRating: string;
  gesRating: string;
  heatingType: string;
  onField: (name: string, value: string) => void;
  errors: Record<string, string>;
}) {
  return (
    <section className={formSection}>
      <h2 className={formSectionTitle}>Énergie et chauffage</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Classe DPE"
          value={energyRating}
          onChange={(value) => onField('energy_rating', value)}
          error={errors.energy_rating}
        />
        <SelectField
          label="Classe GES"
          value={gesRating}
          onChange={(value) => onField('ges_rating', value)}
          options={GES_RATINGS.map((value) => ({ value, label: value }))}
          error={errors.ges_rating}
        />
      </div>
      <SelectField
        label="Type de chauffage"
        value={heatingType}
        onChange={(value) => onField('heating_type', value)}
        options={HEATING_TYPES.map((value) => ({ value, label: HEATING_TYPE_LABELS[value] }))}
        error={errors.heating_type}
      />
    </section>
  );
}

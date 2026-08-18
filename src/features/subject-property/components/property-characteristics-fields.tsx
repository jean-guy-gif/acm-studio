'use client';

import { formSection, formSectionTitle } from '@/components/ui/styles';
import {
  MultiCheckField,
  NumberField,
  SelectField,
} from '@/features/subject-property/components/property-inputs';
import {
  EXPOSURE_LABELS,
  EXPOSURES,
  GENERAL_CONDITION_LABELS,
  GENERAL_CONDITIONS,
  OUTDOOR_SPACE_LABELS,
  OUTDOOR_SPACES,
  PARKING_TYPE_LABELS,
  PARKING_TYPES,
} from '@/features/subject-property/constants/property-options';

export function PropertyCharacteristicsFields({
  exposure,
  constructionYear,
  generalCondition,
  outdoorSpaces,
  parkingTypes,
  onField,
  onArray,
  errors,
}: {
  exposure: string;
  constructionYear: string;
  generalCondition: string;
  outdoorSpaces: string[];
  parkingTypes: string[];
  onField: (name: string, value: string) => void;
  onArray: (name: string, value: string[]) => void;
  errors: Record<string, string>;
}) {
  return (
    <section className={formSection}>
      <h2 className={formSectionTitle}>Caractéristiques du bien</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Exposition"
          value={exposure}
          onChange={(value) => onField('exposure', value)}
          options={EXPOSURES.map((value) => ({ value, label: EXPOSURE_LABELS[value] }))}
          error={errors.exposure}
        />
        <NumberField
          label="Année de construction"
          value={constructionYear}
          step={1}
          min={1500}
          onChange={(value) => onField('construction_year', value)}
          error={errors.construction_year}
        />
        <SelectField
          label="État général"
          value={generalCondition}
          onChange={(value) => onField('general_condition', value)}
          options={GENERAL_CONDITIONS.map((value) => ({
            value,
            label: GENERAL_CONDITION_LABELS[value],
          }))}
          error={errors.general_condition}
        />
      </div>
      <MultiCheckField
        label="Extérieurs"
        values={outdoorSpaces}
        onChange={(values) => onArray('outdoor_spaces', values)}
        options={OUTDOOR_SPACES.map((value) => ({ value, label: OUTDOOR_SPACE_LABELS[value] }))}
        error={errors.outdoor_spaces}
      />
      <MultiCheckField
        label="Stationnements"
        values={parkingTypes}
        onChange={(values) => onArray('parking_types', values)}
        options={PARKING_TYPES.map((value) => ({ value, label: PARKING_TYPE_LABELS[value] }))}
        error={errors.parking_types}
      />
    </section>
  );
}

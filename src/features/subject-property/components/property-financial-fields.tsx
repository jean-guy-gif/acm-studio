'use client';

import { formSection, formSectionTitle } from '@/components/ui/styles';
import { NumberField } from '@/features/subject-property/components/property-inputs';

// The advisor price range moved out of this section (Mission 38): it is now its
// own post-import step (PropertyPriceRangeStep). This section keeps only the
// recurring costs.
export function PropertyFinancialFields({
  monthlyCharges,
  propertyTax,
  onField,
  errors,
}: {
  monthlyCharges: string;
  propertyTax: string;
  onField: (name: string, value: string) => void;
  errors: Record<string, string>;
}) {
  return (
    <section className={formSection}>
      <h2 className={formSectionTitle}>Données financières</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField
          label="Charges mensuelles"
          value={monthlyCharges}
          min={0}
          suffix="€/mois"
          onChange={(value) => onField('monthly_charges', value)}
          error={errors.monthly_charges}
        />
        <NumberField
          label="Taxe foncière annuelle"
          value={propertyTax}
          min={0}
          suffix="€/an"
          onChange={(value) => onField('property_tax', value)}
          error={errors.property_tax}
        />
      </div>
    </section>
  );
}

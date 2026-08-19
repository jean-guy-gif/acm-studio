'use client';

import { formSection, formSectionTitle, hintText } from '@/components/ui/styles';
import { NumberField } from '@/features/subject-property/components/property-inputs';

export function PropertyFinancialFields({
  monthlyCharges,
  propertyTax,
  advisorPriceMin,
  advisorPriceMax,
  onField,
  errors,
}: {
  monthlyCharges: string;
  propertyTax: string;
  advisorPriceMin: string;
  advisorPriceMax: string;
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

      {/* MISSION 36 — l'avis du conseiller, pas une estimation de l'outil. Il
          sert uniquement à cibler la recherche de concurrents et n'apparaît
          nulle part devant le vendeur. Une fourchette large est utile. */}
      <h3 className={formSectionTitle}>Votre fourchette de prix</h3>
      <p className={hintText}>
        Votre avis de professionnel, même large. Il ne sert qu’à trouver les bons concurrents et
        n’est jamais montré au vendeur — l’outil ne produit aucune estimation.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberField
          label="De"
          value={advisorPriceMin}
          min={0}
          suffix="€"
          onChange={(value) => onField('advisor_price_min', value)}
          error={errors.advisor_price_min}
        />
        <NumberField
          label="À"
          value={advisorPriceMax}
          min={0}
          suffix="€"
          onChange={(value) => onField('advisor_price_max', value)}
          error={errors.advisor_price_max}
        />
      </div>
    </section>
  );
}

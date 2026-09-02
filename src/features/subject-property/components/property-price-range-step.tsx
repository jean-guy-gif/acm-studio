'use client';

import Link from 'next/link';

import { btnSecondary, formSection, formSectionTitle, hintText } from '@/components/ui/styles';
import { NumberField } from '@/features/subject-property/components/property-inputs';

// Mission 38 — the advisor's price range, moved out of "Données financières" to
// become the step that immediately follows the import: "here is what we found,
// how much do YOU think this is worth?", then "Trouver des concurrents" as the
// obvious end-of-screen action.
//
// Mission 36 rule, unchanged: this is the advisor's professional opinion, not an
// estimate produced by the tool. It only targets the competitor search and is
// never shown to the seller.
export function PropertyPriceRangeStep({
  advisorPriceMin,
  advisorPriceMax,
  onField,
  errors,
  findHref,
}: {
  advisorPriceMin: string;
  advisorPriceMax: string;
  onField: (name: string, value: string) => void;
  errors: Record<string, string>;
  findHref?: string;
}) {
  return (
    <section className={formSection}>
      <h2 className={formSectionTitle}>À votre avis, ce bien vaut entre combien et combien ?</h2>
      <p className={hintText}>
        Votre avis de professionnel, même large. Il ne sert qu’à cibler la recherche de concurrents
        et n’est jamais montré au vendeur — l’outil ne produit aucune estimation.
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
      {findHref ? (
        <Link href={findHref} className={`${btnSecondary} self-start`}>
          Trouver des concurrents →
        </Link>
      ) : null}
    </section>
  );
}

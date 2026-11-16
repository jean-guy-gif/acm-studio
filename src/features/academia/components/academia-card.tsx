'use client';

import { card, hintText, sectionTitle } from '@/components/ui/styles';
import { AcademiaLinks } from '@/features/academia/components/academia-links';
import { LivingHereField } from '@/features/academia/components/living-here-field';
import type { LivingHereAgeLine } from '@/features/academia/services/living-here-age';
import { setAcademiaLivingHereLink } from '@/features/projects/actions/set-academia-link';
import type { AcademiaLink } from '@/lib/academia';

// Mission 147 (partie A) — « Le bien dans Academia », sur l'onglet Bien vendeur, pour le conseiller
// seul (planches M147-1 et 6 bis) : le dossier d'adresse et « Vivre ici » s'ouvrent dans Academia,
// et le lien client « Vivre ici » qu'Academia donne pour ce bien se colle une fois, pour les
// acquéreurs qui le visiteront. Mission 156 — l'âge du lien : en orange du 25e au 29e jour, puis à
// 30 jours et au-delà ; le lien reste montré (décisions de Jean-Guy, 15 et 16/11).
export function AcademiaCard({
  projectId,
  addressLink,
  livingLink,
  savedUrl,
  savedLine,
  signed,
}: {
  projectId: string;
  addressLink: AcademiaLink | null;
  livingLink: AcademiaLink | null;
  savedUrl: string | null;
  savedLine: LivingHereAgeLine | null;
  signed: boolean;
}) {
  return (
    <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`} data-testid="academia-card">
      <h2 className={sectionTitle}>Le bien dans Academia</h2>
      <p className={hintText}>
        Pour vous seul. Le dossier d’adresse (ventes réelles, DPE, risques, urbanisme, cadastre,
        copropriété) et « Vivre ici » s’ouvrent dans Academia, dans un nouvel onglet.
      </p>
      <AcademiaLinks
        addressLink={addressLink}
        livingLink={livingLink}
        missingHref="#champ-address"
      />
      <div className="border-t border-zinc-100 pt-3 stage:border-white/10">
        <LivingHereField
          inputId="academia-living-url"
          label="Lien « Vivre ici » montré aux acquéreurs"
          emptyLabel="Lien « Vivre ici » à montrer aux acquéreurs (facultatif)"
          hint={
            signed
              ? 'Montré sur le lien de chaque acquéreur qui a ce bien dans sa sélection, et dans « Confirmer la visite ».'
              : 'Montré aux acquéreurs une fois le mandat signé.'
          }
          savedUrl={savedUrl}
          savedLine={savedLine}
          save={(next) => setAcademiaLivingHereLink(projectId, next)}
          testId="academia-living"
          containerTestId="academia-living-link"
        />
      </div>
    </section>
  );
}

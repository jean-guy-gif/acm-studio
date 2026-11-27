'use client';

import Link from 'next/link';

import { card, hintText, link as linkStyle, sectionTitle } from '@/components/ui/styles';
import { AcademiaLinks } from '@/features/academia/components/academia-links';
import { LivingHereApiPanel } from '@/features/academia/components/living-here-api-panel';
import { LivingHereField } from '@/features/academia/components/living-here-field';
import { usePropertyDraft } from '@/features/academia/components/property-draft';
import type { LivingHereApiInitial } from '@/features/academia/queries/living-here-api-view';
import { cardAddressState, saveFirstKind } from '@/features/academia/services/card-address';
import type { LivingHereAgeLine } from '@/features/academia/services/living-here-age';
import { setAcademiaLivingHereLink } from '@/features/projects/actions/set-academia-link';
import type { AcademiaLink } from '@/lib/academia';

// Mission 147 (partie A) — « Le bien dans Academia », sur l'onglet Bien vendeur, pour le conseiller
// seul (planches M147-1 et 6 bis) : le dossier d'adresse et « Vivre ici » s'ouvrent dans Academia,
// et le lien client « Vivre ici » qu'Academia donne pour ce bien se colle une fois, pour les
// acquéreurs qui le visiteront. Mission 156 — l'âge du lien : en orange du 25e au 29e jour, puis à
// 30 jours et au-delà ; le lien reste montré (décisions de Jean-Guy, 15 et 16/11). Mission 157 —
// l'API ouverte (la démo par sa clé d'essai ; une vraie agence, l'interrupteur allumé) : « Créer le
// lien « Vivre ici » » en un clic (planche M157-1) ; le champ à coller devient le repli.
// Correctifs 161 (maquette C161-1) — l'API ouverte, tout arrive dans ACM : plus de « Dossier
// d'adresse ↗ » ni de « Vivre ici ↗ » (ni l'adresse copiée) ; la phrase du haut dit où se lit le
// dossier d'adresse. Partout, l'adresse tapée et pas encore enregistrée : « Enregistrez d'abord la
// fiche » ; après « Enregistrer », la carte suit l'adresse enregistrée sans recharger.
export function AcademiaCard({
  projectId,
  addressLink,
  livingLink,
  savedUrl,
  savedLine,
  signed,
  savedAddress,
  api = null,
}: {
  projectId: string;
  addressLink: AcademiaLink | null;
  livingLink: AcademiaLink | null;
  savedUrl: string | null;
  savedLine: LivingHereAgeLine | null;
  signed: boolean;
  // L'adresse ENREGISTRÉE du bien (M147 A), celle qu'on compare à la saisie en cours.
  savedAddress?: string | null;
  api?: { address: string | null; initial: LivingHereApiInitial; showAddress?: boolean } | null;
}) {
  const { typed } = usePropertyDraft();
  const addressState = cardAddressState(savedAddress ?? api?.address ?? null, typed);
  const field = (
    <LivingHereField
      inputId="academia-living-url"
      label="Lien «&nbsp;Vivre ici&nbsp;» montré aux acquéreurs"
      emptyLabel="Lien «&nbsp;Vivre ici&nbsp;» à montrer aux acquéreurs (facultatif)"
      hint={
        signed
          ? 'Montré sur le lien de chaque acquéreur qui a ce bien dans sa sélection, et dans «\u00a0Confirmer la visite\u00a0».'
          : 'Montré aux acquéreurs une fois le mandat signé.'
      }
      savedUrl={savedUrl}
      savedLine={savedLine}
      save={(next) => setAcademiaLivingHereLink(projectId, next)}
      testId="academia-living"
      containerTestId="academia-living-link"
    />
  );
  return (
    <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`} data-testid="academia-card">
      <h2 className={sectionTitle}>Le bien dans Academia</h2>
      {api ? (
        <p className={hintText}>
          Pour vous seul. Le dossier d’adresse d’Academia se lit sur{' '}
          <Link href={`/builder/${projectId}/avant-rendez-vous`} className={linkStyle}>
            Avant le rendez-vous
          </Link>
          &#x202f;; le lien «&nbsp;Vivre ici&nbsp;» se crée ici, en un clic.
        </p>
      ) : (
        <>
          <p className={hintText}>
            Pour vous seul. Le dossier d’adresse (ventes réelles, DPE, risques, urbanisme, cadastre,
            copropriété) et «&nbsp;Vivre ici&nbsp;» s’ouvrent dans Academia, dans un nouvel onglet.
          </p>
          <AcademiaLinks
            addressLink={addressLink}
            livingLink={livingLink}
            missingHref="#champ-address"
            saveFirst={addressState === 'save_first'}
          />
        </>
      )}
      <div className="border-t border-zinc-100 pt-3 stage:border-white/10">
        {api ? (
          <LivingHereApiPanel
            // Après « Enregistrer », la page relit l'adresse : le panneau repart de son état neuf.
            key={api.address ?? ''}
            projectId={projectId}
            address={api.address}
            initial={api.initial}
            fallback={field}
            pasted={
              api.initial.kind === 'idle' && !api.initial.stale && savedUrl !== null
                ? { url: savedUrl, line: savedLine }
                : null
            }
            saveFirst={saveFirstKind(addressState, api.address)}
            signed={signed}
            showAddress={api.showAddress ?? true}
          />
        ) : (
          field
        )}
      </div>
    </section>
  );
}

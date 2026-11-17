import 'server-only';

import { AddressViewPanel } from '@/features/academia/components/address-view-panel';
import {
  readAddressView,
  type AddressViewProperty,
} from '@/features/academia/queries/read-address-view';
import type { AcademiaAccess } from '@/features/academia/services/academia-api-access';
import { hintText, sectionTitle } from '@/components/ui/styles';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

// Mission 158 — le dossier d'adresse se lit à part du reste de la page (Jean-Guy, 17/11) : « Avant
// le rendez-vous » s'affiche tout de suite, ce bloc arrive ensuite dans sa propre limite
// (`Suspense`), et une Academia lente ou muette ne retient rien d'autre ; au pire, le bloc dit
// qu'il n'a pas pu être lu (M98).
export async function AddressViewSection({
  agencyId,
  projectId,
  property,
  access,
  savedRange,
  demo,
}: {
  agencyId: string;
  projectId: string;
  property: AddressViewProperty;
  access: AcademiaAccess;
  savedRange: { min: number | null; max: number | null };
  demo: boolean;
}) {
  const state = await readAddressView({
    admin: createServiceRoleClient(),
    agencyId,
    projectId,
    property,
    access,
  });
  return (
    <AddressViewPanel projectId={projectId} state={state} savedRange={savedRange} demo={demo} />
  );
}

// Ce qui s'affiche le temps de la lecture.
export function AddressViewLoading() {
  return (
    <section className="flex flex-col gap-1" data-testid="address-view-loading" aria-busy="true">
      <h2 className={sectionTitle}>Dossier d’adresse</h2>
      <p className={hintText}>Lecture du dossier d’adresse d’Academia…</p>
    </section>
  );
}

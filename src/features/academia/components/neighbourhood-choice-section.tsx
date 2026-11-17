import 'server-only';

import { NeighbourhoodChoicePanel } from '@/features/academia/components/neighbourhood-choice-panel';
import type { AddressViewProperty } from '@/features/academia/queries/read-address-view';
import { readNeighbourhoodChoice } from '@/features/academia/queries/read-neighbourhood-choice';
import type { AcademiaAccess } from '@/features/academia/services/academia-api-access';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

// Mission 159 — le choix du quartier montré au vendeur se lit à part du reste de la page, comme le
// dossier d'adresse (M158) : une Academia lente ou muette ne retient rien d'autre. Sans vue lisible,
// rien : le dossier d'adresse dit déjà quoi faire.
export async function NeighbourhoodChoiceSection({
  agencyId,
  projectId,
  property,
  access,
}: {
  agencyId: string;
  projectId: string;
  property: AddressViewProperty;
  access: AcademiaAccess;
}) {
  const state = await readNeighbourhoodChoice({
    admin: createServiceRoleClient(),
    client: await createClient(),
    agencyId,
    projectId,
    property,
    access,
  });
  if (state.kind !== 'ready') return null;
  return (
    <NeighbourhoodChoicePanel
      projectId={projectId}
      blocks={state.blocks}
      savedKeys={state.saved.snapshot?.keys ?? []}
      stale={state.saved.stale}
      locked={state.saved.locked}
    />
  );
}

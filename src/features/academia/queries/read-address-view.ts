import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  academiaPropertyType,
  readAcademiaPropertyView,
  type AcademiaFetch,
} from '@/features/academia/services/academia-api';
import type { AcademiaAccess } from '@/features/academia/services/academia-api-access';
import {
  parsePropertyView,
  type AcademiaPropertyView,
} from '@/features/academia/services/property-view';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import type { Database } from '@/lib/supabase/database.types';

// Mission 158 — le dossier d'adresse d'Academia, pour « Avant le rendez-vous », lu à chaque
// ouverture de la page (Academia le calcule le jour même) ; rien n'en est gardé dans ACM. Il faut
// la demande du dossier faite par le lien « Vivre ici » (M157), prête et faite pour l'adresse du
// bien d'aujourd'hui, et le type, les pièces et la surface du bien (l'API les exige). Une lecture
// en échec est dite, jamais lue comme « rien » (M98), et entre au journal (M100).
export type AddressViewState =
  | { kind: 'closed' }
  | { kind: 'none' }
  // La demande existe mais Academia prépare encore le dossier, ou n'a pas pu le préparer.
  | { kind: 'waiting' }
  | { kind: 'request_failed' }
  | { kind: 'missing_facts'; missing: ('type' | 'rooms' | 'surface')[] }
  | { kind: 'failed' }
  | {
      kind: 'ready';
      view: AcademiaPropertyView;
      // Ce pour quoi la vue a été calculée : « une maison de 5 pièces et 135 m² ».
      facts: { type: 'appartement' | 'maison'; rooms: number; surface: number };
    };

export type AddressViewProperty = {
  address: string | null;
  propertyType: string | null;
  rooms: number | null;
  surface: number | null;
};

export async function readAddressView(input: {
  // La clé de service : l'identifiant chez Academia n'est pas lisible par le navigateur (M157).
  admin: SupabaseClient<Database>;
  agencyId: string;
  projectId: string;
  property: AddressViewProperty | null;
  access: AcademiaAccess | null;
  fetchImpl?: AcademiaFetch;
}): Promise<AddressViewState> {
  if (!input.access) return { kind: 'closed' };
  const { data: request, error } = await input.admin
    .from('project_academia_requests')
    .select('academia_id, state, property_address')
    .eq('project_id', input.projectId)
    .eq('agency_id', input.agencyId)
    .maybeSingle();
  if (error) {
    await reportServerError('academia:read-address-view', error);
    return { kind: 'failed' };
  }
  if (!request || !input.property?.address || request.property_address !== input.property.address) {
    return { kind: 'none' };
  }
  if (request.state === 'en_cours') return { kind: 'waiting' };
  if (request.state !== 'pret') return { kind: 'request_failed' };
  const type = academiaPropertyType(input.property.propertyType);
  const rooms = input.property.rooms && input.property.rooms > 0 ? input.property.rooms : null;
  const surface =
    input.property.surface && input.property.surface > 0
      ? Math.round(input.property.surface)
      : null;
  if (!type || rooms == null || surface == null) {
    return {
      kind: 'missing_facts',
      missing: [
        ...(type ? [] : ['type' as const]),
        ...(rooms == null ? ['rooms' as const] : []),
        ...(surface == null ? ['surface' as const] : []),
      ],
    };
  }
  const reply = await readAcademiaPropertyView(
    input.access.key,
    request.academia_id,
    { type, pieces: rooms, surface },
    input.fetchImpl,
  );
  if (!reply.ok) {
    await reportServerError(
      'academia:read-address-view',
      new Error(`Academia : ${reply.reason}${reply.detail ? ` — ${reply.detail}` : ''}`),
    );
    return { kind: 'failed' };
  }
  const view = parsePropertyView(reply.json);
  if (!view) {
    await reportServerError(
      'academia:read-address-view',
      new Error('Academia : vue « bien » hors contrat'),
    );
    return { kind: 'failed' };
  }
  return { kind: 'ready', view, facts: { type, rooms, surface } };
}

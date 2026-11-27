import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  academiaPropertyType,
  readAcademiaPropertyView,
  readAcademiaRequest,
  type AcademiaFailure,
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
      facts: AcademiaFacts;
    };

export type AddressViewProperty = {
  address: string | null;
  propertyType: string | null;
  rooms: number | null;
  surface: number | null;
};

// Les conditions communes aux deux vues (M158, M159) : l'accès, la demande du dossier prête et
// faite pour l'adresse du jour, le type, les pièces et la surface du bien.
export type AcademiaFacts = { type: 'appartement' | 'maison'; rooms: number; surface: number };
export type AcademiaDossierState =
  | Exclude<AddressViewState, { kind: 'ready' }>
  | { kind: 'ok'; key: string; academiaId: string; facts: AcademiaFacts };

export async function resolveAcademiaDossier(input: {
  admin: SupabaseClient<Database>;
  agencyId: string;
  projectId: string;
  property: AddressViewProperty | null;
  access: AcademiaAccess | null;
  label: string;
  fetchImpl?: AcademiaFetch;
}): Promise<AcademiaDossierState> {
  if (!input.access) return { kind: 'closed' };
  const { data: request, error } = await input.admin
    .from('project_academia_requests')
    .select('academia_id, state, property_address')
    .eq('project_id', input.projectId)
    .eq('agency_id', input.agencyId)
    .maybeSingle();
  if (error) {
    await reportServerError(input.label, error);
    return { kind: 'failed' };
  }
  if (!request || !input.property?.address || request.property_address !== input.property.address) {
    return { kind: 'none' };
  }
  // Mission 161 — en préparation chez Academia (20 à 60 secondes pour une adresse neuve) : on lui
  // demande où il en est (une lecture, rien n'est écrit pendant l'affichage) ; l'écran se relit
  // toutes les 5 secondes. Une relecture en échec est dite comme telle, jamais comme l'attente (M98).
  let state = request.state;
  if (state === 'en_cours') {
    const read = await readAcademiaRequest(input.access.key, request.academia_id, input.fetchImpl);
    if (read.ok) {
      state = read.etat;
    } else if (read.reason === 'not_found') {
      state = 'erreur';
    } else {
      await reportServerError(
        input.label,
        new Error(`Academia\u00a0: ${read.reason}${read.detail ? ` — ${read.detail}` : ''}`),
      );
      return { kind: 'failed' };
    }
  }
  if (state === 'en_cours') return { kind: 'waiting' };
  if (state !== 'pret') return { kind: 'request_failed' };
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
  return {
    kind: 'ok',
    key: input.access.key,
    academiaId: request.academia_id,
    facts: { type, rooms, surface },
  };
}

// La lecture d'une vue (« bien » ou « bien-client ») qui a échoué : en préparation (409), effacé
// chez Academia (404 : à recréer depuis Bien vendeur, dont l'action redemande le dossier), ou un
// échec dit (M98). Rien n'est écrit pendant l'affichage.
export async function viewFailure(
  input: { label: string },
  reply: AcademiaFailure,
): Promise<'waiting' | 'request_failed' | 'failed'> {
  if (reply.reason === 'not_ready') return 'waiting';
  if (reply.reason === 'not_found') return 'request_failed';
  await reportServerError(
    input.label,
    new Error(`Academia\u00a0: ${reply.reason}${reply.detail ? ` — ${reply.detail}` : ''}`),
  );
  return 'failed';
}

export async function readAddressView(input: {
  // La clé de service : l'identifiant chez Academia n'est pas lisible par le navigateur (M157).
  admin: SupabaseClient<Database>;
  agencyId: string;
  projectId: string;
  property: AddressViewProperty | null;
  access: AcademiaAccess | null;
  fetchImpl?: AcademiaFetch;
}): Promise<AddressViewState> {
  const dossier = await resolveAcademiaDossier({ ...input, label: 'academia:read-address-view' });
  if (dossier.kind !== 'ok') return dossier;
  const { type, rooms, surface } = dossier.facts;
  const reply = await readAcademiaPropertyView(
    dossier.key,
    dossier.academiaId,
    { type, pieces: rooms, surface },
    input.fetchImpl,
  );
  if (!reply.ok) {
    return { kind: await viewFailure({ ...input, label: 'academia:read-address-view' }, reply) };
  }
  const view = parsePropertyView(reply.json);
  if (!view) {
    await reportServerError(
      'academia:read-address-view',
      new Error('Academia\u00a0: vue «\u00a0bien\u00a0» hors contrat'),
    );
    return { kind: 'failed' };
  }
  return { kind: 'ready', view, facts: dossier.facts };
}

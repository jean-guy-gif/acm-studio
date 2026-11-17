import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  resolveAcademiaDossier,
  type AcademiaFacts,
  type AddressViewProperty,
  type AddressViewState,
} from '@/features/academia/queries/read-address-view';
import { readAcademiaView, type AcademiaFetch } from '@/features/academia/services/academia-api';
import type { AcademiaAccess } from '@/features/academia/services/academia-api-access';
import {
  readNeighbourhoodSnapshot,
  type NeighbourhoodSnapshotState,
} from '@/features/neighbourhood-link/queries/read-neighbourhood-snapshot';
import {
  parseNeighbourhoodBlocks,
  type NeighbourhoodBlocks,
} from '@/features/neighbourhood-link/services/neighbourhood-blocks';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import type { Database } from '@/lib/supabase/database.types';

// Mission 159 — « Ce que verra le vendeur : le quartier », sur « Avant le rendez-vous » : la vue
// « bien-client » du dossier d'adresse (la seule qui peut aller au vendeur, sans valeur indicative
// ni DPE), lue à chaque ouverture comme la vue du conseiller (M158), et le dernier choix gardé.
export type NeighbourhoodChoiceState =
  | Exclude<AddressViewState, { kind: 'ready' }>
  | {
      kind: 'ready';
      blocks: NeighbourhoodBlocks;
      facts: AcademiaFacts;
      saved: NeighbourhoodSnapshotState;
    };

// La vue « bien-client » pour le bien du jour, relue champ par champ.
export async function readClientBlocks(input: {
  admin: SupabaseClient<Database>;
  agencyId: string;
  projectId: string;
  property: AddressViewProperty | null;
  access: AcademiaAccess | null;
  fetchImpl?: AcademiaFetch;
}): Promise<
  | Exclude<AddressViewState, { kind: 'ready' }>
  | { kind: 'ok'; blocks: NeighbourhoodBlocks; facts: AcademiaFacts }
> {
  const label = 'academia:read-neighbourhood';
  const dossier = await resolveAcademiaDossier({ ...input, label });
  if (dossier.kind !== 'ok') return dossier;
  const { type, rooms, surface } = dossier.facts;
  const reply = await readAcademiaView(
    'bien-client',
    dossier.key,
    dossier.academiaId,
    { type, pieces: rooms, surface },
    input.fetchImpl,
  );
  if (!reply.ok) {
    await reportServerError(
      label,
      new Error(`Academia : ${reply.reason}${reply.detail ? ` — ${reply.detail}` : ''}`),
    );
    return { kind: 'failed' };
  }
  const blocks = parseNeighbourhoodBlocks(reply.json);
  if (!blocks) {
    await reportServerError(label, new Error('Academia : vue « bien-client » hors contrat'));
    return { kind: 'failed' };
  }
  return { kind: 'ok', blocks, facts: dossier.facts };
}

export async function readNeighbourhoodChoice(input: {
  admin: SupabaseClient<Database>;
  // Le client du conseiller : le choix gardé se lit avec ses droits (sa seule agence).
  client: SupabaseClient<Database>;
  agencyId: string;
  projectId: string;
  property: AddressViewProperty | null;
  access: AcademiaAccess | null;
  fetchImpl?: AcademiaFetch;
}): Promise<NeighbourhoodChoiceState> {
  const [current, saved] = await Promise.all([
    readClientBlocks(input),
    readNeighbourhoodSnapshot(input.client, input.agencyId, input.projectId),
  ]);
  if (current.kind !== 'ok') return current;
  return { kind: 'ready', blocks: current.blocks, facts: current.facts, saved };
}

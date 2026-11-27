import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { parseKeptResult } from '@/features/competitor-search/services/kept-result';
import {
  mergeStreamEstateNote,
  type StreamEstateSearchNote,
} from '@/features/competitor-search/services/stream-estate-summary';
import type { PortalSearchResult } from '@/features/competitor-search/types';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import type { Database } from '@/lib/supabase/database.types';

// Mission 112 — le résultat payé est gardé par l'action qui a payé, AVANT de répondre au
// navigateur (remplace l'enregistrement par l'écran, M105) : une coupure, un onglet fermé ou une
// erreur qui suit ne le font plus perdre (M107). « Chercher encore » s'ajoute au résultat gardé :
// ses biens à la suite, son coût et ses écartés cumulés, comme l'écran le faisait.
export async function keepPaidSearchResult(input: {
  supabase: SupabaseClient<Database>;
  agencyId: string;
  profileId: string;
  projectId: string;
  fingerprint: string;
  portal: PortalSearchResult;
  note: StreamEstateSearchNote;
  resuming: boolean;
}): Promise<boolean> {
  let portal = input.portal;
  let note = input.note;
  if (input.resuming) {
    const { data, error } = await input.supabase
      .from('stream_estate_results')
      .select('result')
      .eq('project_id', input.projectId)
      .eq('agency_id', input.agencyId)
      .maybeSingle();
    const previous = parseKeptResult(data?.result) as {
      portal: PortalSearchResult;
      note: StreamEstateSearchNote;
    } | null;
    // Ce qui est déjà payé n'est jamais remplacé par la seule suite : une lecture en échec, ou un
    // résultat gardé illisible, laissent le résultat gardé tel quel (l'écran garde la suite).
    if (error || (data != null && previous == null)) {
      await reportServerError(
        'keepPaidSearchResult',
        error ?? new Error('résultat gardé illisible\u00a0: suite non ajoutée'),
      );
      return false;
    }
    if (previous) {
      const candidates = [...previous.portal.candidates, ...portal.candidates];
      portal = {
        ...portal,
        candidates,
        status: candidates.length > 0 ? 'ok' : 'empty',
        message: candidates.length > 0 ? null : portal.message,
      };
      note = mergeStreamEstateNote(previous.note, note);
    }
  }
  const kept = parseKeptResult({ portal, note });
  if (!kept) {
    await reportServerError('keepPaidSearchResult', new Error('résultat trop lourd ou illisible'));
    return false;
  }
  const { error } = await input.supabase.from('stream_estate_results').upsert(
    {
      agency_id: input.agencyId,
      project_id: input.projectId,
      saved_by: input.profileId,
      fingerprint: input.fingerprint,
      result: kept as never,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'project_id' },
  );
  if (error) {
    await reportServerError('keepPaidSearchResult', error);
    return false;
  }
  return true;
}

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { parseListingUrl } from '@/features/comparable-import/utils/normalize-listing-url';
import { isAllowedProtocol } from '@/features/comparable-import/utils/normalize-url';
import {
  READ_FAILURE_CAUSES,
  type ReadFailureCause,
} from '@/features/competitor-search/services/import-listing';
import { insertCompetitor } from '@/features/competitor-search/services/insert-competitor';
import {
  ALWAYS_VERIFY_AFTER_SEARCH_IMPORT,
  parseSearchSnapshot,
  snapshotPropertyType,
  snapshotToComparableInput,
} from '@/features/competitor-search/services/search-snapshot';
import {
  COMPETITOR_VERIFIABLE_FIELDS,
  importedFields,
  sanitizeFieldsToVerify,
} from '@/features/imported-fields/services/fields-to-verify';
import { maybePromoteToReady } from '@/features/projects/services/project-readiness';
import { recordAppError } from '@/lib/app-errors/record';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Mission 101 — aucun bien retenu perdu. Un bien que le conseiller retient est enregistré ICI,
// côté serveur, AVANT la lecture de son annonce : « retenu, import en attente ». Il survit à un
// rechargement ou à une fermeture d'onglet, et sa ligne part quand le concurrent est créé.
// Tout ce qui vient du navigateur est relu : l'adresse, les données de la carte, la cause.

export type PendingActionResult = { ok: true } | { ok: false; error: string };
export type CreateFromSearchResult =
  | { ok: true; retained: boolean; dismissedExisting?: string }
  | { ok: false; error: string; code?: 'no_price' };

const FAILURE = 'L’import en attente n’a pas pu être enregistré.';
const MAX_BATCH = 60;

type Scope = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  agencyId: string;
  profileId: string;
};

// L'appelant, non retiré, et le dossier dans SON agence (un dossier archivé ne s'ouvre plus).
async function scopeFor(projectId: string): Promise<Scope | null> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return null;
  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .neq('status', 'archived')
    .maybeSingle();
  return project ? { supabase, agencyId: profile.agency_id, profileId: profile.id } : null;
}

// Mission 108 — la même adresse nettoyée que partout ailleurs (`parseListingUrl`).
function listingUrl(raw: unknown): URL | null {
  const url = typeof raw === 'string' ? parseListingUrl(raw) : null;
  return url && isAllowedProtocol(url) ? url : null;
}

const entriesSchema = z
  .array(z.object({ url: z.string().max(2000), snapshot: z.unknown() }))
  .min(1)
  .max(MAX_BATCH);

// Les biens cochés, enregistrés d'un coup au clic « Retenir et importer », avant toute lecture.
// Un bien déjà en attente garde sa ligne : ses données sont rafraîchies.
export async function registerPendingImports(
  projectId: string,
  entries: unknown,
): Promise<PendingActionResult> {
  const scope = await scopeFor(projectId);
  if (!scope) return { ok: false, error: FAILURE };
  const parsed = entriesSchema.safeParse(entries);
  if (!parsed.success) return { ok: false, error: FAILURE };

  const now = new Date().toISOString();
  const rows = [];
  for (const entry of parsed.data) {
    const url = listingUrl(entry.url);
    const snapshot = parseSearchSnapshot(entry.snapshot);
    if (!url || !snapshot) continue; // une entrée illisible est ignorée, pas bloquante
    rows.push({
      agency_id: scope.agencyId,
      project_id: projectId,
      created_by: scope.profileId,
      listing_url: url.href,
      listing_host: url.hostname.toLowerCase(),
      snapshot,
      updated_at: now,
    });
  }
  if (rows.length === 0) return { ok: false, error: FAILURE };

  const { error } = await scope.supabase
    .from('pending_competitor_imports')
    .upsert(rows, { onConflict: 'project_id,listing_url' });
  if (error) return { ok: false, error: FAILURE };
  revalidatePath(`/builder/${projectId}/comparables`);
  revalidatePath(`/builder/${projectId}/avant-rendez-vous`);
  return { ok: true };
}

// La page de l'annonce est restée illisible : le concurrent est créé depuis ce que la recherche a
// déjà donné — les données relues en BASE (la ligne en attente), jamais renvoyées par l'écran.
// Aucun appel payant. Il porte « Importé depuis la recherche » et ses pastilles « À vérifier » ;
// vendeur et exclusivité restent inconnus (seule la page les dit, M83). Une annonce retirée entre
// quand même, avec sa mention, mais NON retenue : c'est le conseiller qui la retient.
export async function createCompetitorFromSearch(
  projectId: string,
  rawUrl: string,
  withdrawn: boolean,
): Promise<CreateFromSearchResult> {
  const scope = await scopeFor(projectId);
  const url = listingUrl(rawUrl);
  if (!scope || !url) return { ok: false, error: FAILURE };
  const { supabase, agencyId } = scope;

  const { data: pending } = await supabase
    .from('pending_competitor_imports')
    .select('id, snapshot')
    .eq('project_id', projectId)
    .eq('agency_id', agencyId)
    .eq('listing_url', url.href)
    .maybeSingle();
  if (!pending) return { ok: false, error: FAILURE };

  const clearPending = () =>
    supabase.from('pending_competitor_imports').delete().eq('id', pending.id);
  const done = async (retained: boolean): Promise<CreateFromSearchResult> => {
    await clearPending();
    if (retained) await maybePromoteToReady(supabase, projectId, agencyId);
    revalidatePath(`/builder/${projectId}/comparables`);
    revalidatePath(`/builder/${projectId}/avant-rendez-vous`);
    revalidatePath(`/builder/${projectId}`);
    revalidatePath('/builder');
    revalidatePath('/live');
    return { ok: true, retained };
  };

  // Une lecture coupée à 30 secondes a pu aboutir entre-temps : le concurrent est déjà là, on
  // n'en crée pas un second.
  const { data: existing } = await supabase
    .from('comparables')
    .select('id, is_selected')
    .eq('project_id', projectId)
    .eq('agency_id', agencyId)
    .eq('listing_url', url.href)
    .limit(1)
    .maybeSingle();
  if (existing) {
    // Mission 108 — déjà dans le dossier, écartée : rien n'est créé, le conseiller décide.
    if (!existing.is_selected) {
      await clearPending();
      return { ok: true, retained: false, dismissedExisting: existing.id };
    }
    return done(true);
  }

  const snapshot = parseSearchSnapshot(pending.snapshot);
  const input = snapshot ? snapshotToComparableInput(snapshot, url) : null;
  if (!snapshot || !input) {
    await supabase
      .from('pending_competitor_imports')
      .update({ last_cause: 'no_price', updated_at: new Date().toISOString() })
      .eq('id', pending.id);
    return { ok: false, error: 'La recherche ne donne pas le prix de ce bien.', code: 'no_price' };
  }

  const created = await insertCompetitor(supabase, projectId, agencyId, {
    ...input,
    property_type: snapshotPropertyType(snapshot),
    imported_from_search: true,
    listing_withdrawn: withdrawn,
    is_selected: !withdrawn,
    // Tout ce qui est rempli reste à relire (M97), plus ce que la recherche ne sait pas dire.
    fields_to_verify: sanitizeFieldsToVerify(
      [
        ...importedFields(input, COMPETITOR_VERIFIABLE_FIELDS),
        ...ALWAYS_VERIFY_AFTER_SEARCH_IMPORT,
        ...(input.bedrooms_count == null ? ['bedrooms_count'] : []),
      ],
      COMPETITOR_VERIFIABLE_FIELDS,
    ),
  });
  if (created.status === 'failed') return { ok: false, error: FAILURE };
  if (created.status === 'existing') {
    if (!created.selected) {
      await clearPending();
      return { ok: true, retained: false, dismissedExisting: created.id };
    }
    return done(true);
  }
  return done(!withdrawn);
}

const failureSchema = z.object({
  cause: z.enum(READ_FAILURE_CAUSES),
  attempts: z.number().int().min(1).max(10),
});

// Chaque bien dont la page n'a pas pu être lue : la cause est notée sur sa ligne en attente, et
// au journal sous l'origine « import » — le portail et la cause, JAMAIS l'adresse de l'annonce —
// pour connaître le taux réel d'échec par portail. Hors de la pastille « N erreurs depuis hier ».
export async function recordImportReadFailure(
  projectId: string,
  rawUrl: string,
  cause: ReadFailureCause,
  attempts: number,
): Promise<void> {
  const scope = await scopeFor(projectId);
  const url = listingUrl(rawUrl);
  const parsed = failureSchema.safeParse({ cause, attempts });
  if (!scope || !url || !parsed.success) return;
  await scope.supabase
    .from('pending_competitor_imports')
    .update({
      last_cause: parsed.data.cause,
      attempts: parsed.data.attempts,
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', projectId)
    .eq('agency_id', scope.agencyId)
    .eq('listing_url', url.href);
  await recordAppError({
    source: 'import',
    page: '/builder/[id]/comparables/find',
    error: importFailureMessage(url.hostname, parsed.data.cause),
    agencyId: scope.agencyId,
    userId: scope.profileId,
  });
}

// Le conseiller renonce à ce bien : sa ligne en attente est retirée. Rien d'autre n'est touché.
export async function dismissPendingImport(
  projectId: string,
  pendingId: string,
): Promise<PendingActionResult> {
  const scope = await scopeFor(projectId);
  if (!scope || !z.uuid().safeParse(pendingId).success) return { ok: false, error: FAILURE };
  const { data, error } = await scope.supabase
    .from('pending_competitor_imports')
    .delete()
    .eq('id', pendingId)
    .eq('project_id', projectId)
    .eq('agency_id', scope.agencyId)
    .select('id');
  if (error || !data || data.length === 0) return { ok: false, error: FAILURE };
  // Mission 108 — plus rien n'attend : le dossier peut devenir prêt.
  await maybePromoteToReady(scope.supabase, projectId, scope.agencyId);
  revalidatePath(`/builder/${projectId}/comparables`);
  revalidatePath(`/builder/${projectId}/avant-rendez-vous`);
  return { ok: true };
}

// « seloger.com · robots » — le portail (sans « www. ») et la clé de la cause. Lu tel quel par la
// page « Erreurs » pour compter les échecs par portail.
function importFailureMessage(hostname: string, cause: ReadFailureCause): string {
  return `${hostname.toLowerCase().replace(/^www\./, '')} · ${cause}`;
}

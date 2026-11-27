import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  createAcademiaClientLink,
  type AcademiaFetch,
} from '@/features/academia/services/academia-api';
import type { AcademiaAccess } from '@/features/academia/services/academia-api-access';
import { linkNeedsRenewal } from '@/features/academia/services/living-here-age';
import { propertyAddressLine } from '@/lib/academia';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import type { Database } from '@/lib/supabase/database.types';

// Mission 161 — le lien « Vivre ici » renouvelé par un écran du conseiller (Bien vendeur, « Avant le
// rendez-vous », la préparation d'un message à un acquéreur ; décision de Jean-Guy, 18/11) : un seul
// lien par bien, réutilisé partout tant qu'il a moins de 7 jours ; au-delà, un lien neuf. Une
// création en échec garde le lien encore valable : rien n'est bloqué, c'est noté au journal (M100).
// Les pages du vendeur n'appellent jamais Academia : elles lisent le lien le plus récent encore
// valable (`features/neighbourhood-link`). Seul un lien créé par l'API se renouvelle ; un lien collé
// à la main garde sa règle (M157). Jamais une exception.
export type LinkRenewal = 'fresh' | 'renewed' | 'kept' | 'none';

export async function renewLivingHereLinkIfOld(input: {
  admin: SupabaseClient<Database>;
  agencyId: string;
  projectId: string;
  access: AcademiaAccess | null;
  now?: Date;
  fetchImpl?: AcademiaFetch;
  // Un délai court sur le chemin d'un envoi (« Confirmer la visite ») : Academia muette ne le
  // retarde que de quelques secondes (deux essais au plus).
  timeoutMs?: number;
}): Promise<LinkRenewal> {
  try {
    return await renew(input);
  } catch (error) {
    await reportServerError('academia:renew-link', error);
    return 'kept';
  }
}

async function renew(input: {
  admin: SupabaseClient<Database>;
  agencyId: string;
  projectId: string;
  access: AcademiaAccess | null;
  now?: Date;
  fetchImpl?: AcademiaFetch;
  // Un délai court sur le chemin d'un envoi (« Confirmer la visite ») : Academia muette ne le
  // retarde que de quelques secondes (deux essais au plus).
  timeoutMs?: number;
}): Promise<LinkRenewal> {
  if (!input.access) return 'none';
  const now = input.now ?? new Date();
  const { data: row, error } = await input.admin
    .from('project_academia_requests')
    .select('academia_id, state, property_address, link_url, link_expires_at')
    .eq('project_id', input.projectId)
    .eq('agency_id', input.agencyId)
    .maybeSingle();
  if (error) {
    await reportServerError('academia:renew-link', error);
    return 'kept';
  }
  if (!row || row.state !== 'pret' || !row.link_url) return 'none';
  const { data: project } = await input.admin
    .from('projects')
    .select('academia_living_here_url')
    .eq('id', input.projectId)
    .eq('agency_id', input.agencyId)
    .maybeSingle();
  // Un lien collé à la main à sa place : pas le nôtre.
  if (project?.academia_living_here_url !== row.link_url) return 'none';
  const { data: subject } = await input.admin
    .from('subject_properties')
    .select('address, postal_code, city')
    .eq('project_id', input.projectId)
    .eq('agency_id', input.agencyId)
    .maybeSingle();
  const address = subject
    ? propertyAddressLine({
        address: subject.address,
        postalCode: subject.postal_code,
        city: subject.city,
      })
    : null;
  // L'adresse du bien a changé depuis la demande : le lien est oublié (contrat §3.3), pas renouvelé.
  if (!address || address !== row.property_address) return 'none';
  if (!linkNeedsRenewal(row.link_expires_at, now)) return 'fresh';

  const link = await createAcademiaClientLink(
    input.access.key,
    row.academia_id,
    input.fetchImpl,
    input.timeoutMs,
  );
  if (!link.ok) {
    await reportServerError(
      'academia:renew-link',
      new Error(
        `Academia\u00a0: ${link.reason}${link.detail ? ` — ${link.detail}` : ''} (lien gardé)`,
      ),
    );
    return 'kept';
  }
  const saved = await input.admin
    .from('project_academia_requests')
    .update({ link_url: link.url, link_expires_at: link.expiresAt })
    .eq('project_id', input.projectId)
    .eq('agency_id', input.agencyId);
  const savedProject = saved.error
    ? saved
    : await input.admin
        .from('projects')
        .update({ academia_living_here_url: link.url })
        .eq('id', input.projectId)
        .eq('agency_id', input.agencyId);
  if (saved.error || savedProject.error) {
    await reportServerError('academia:renew-link', saved.error ?? savedProject.error);
    return 'kept';
  }
  return 'renewed';
}

'use server';

import { createHash } from 'node:crypto';

import { revalidatePath } from 'next/cache';

import {
  academiaPropertyType,
  createAcademiaClientLink,
  createAcademiaDossier,
  readAcademiaDossier,
  type AcademiaFailure,
} from '@/features/academia/services/academia-api';
import { academiaApiAccess } from '@/features/academia/services/academia-api-access';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';
import { propertyAddressLine } from '@/lib/academia';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

// Mission 157 — « Créer le lien « Vivre ici » », sur le bien vendeur seulement (plan Academia du
// 16/11, maquette M157-1) : ACM demande à Mon secteur le dossier de l'adresse du bien
// (`POST /dossiers`), suit sa préparation (`GET /dossiers/{id}`), puis son lien client
// (`POST /dossiers/{id}/liens-client`), et le range sur le mandat (`projects.academia_living_here_url`,
// M147 A) avec son expiration (`project_academia_dossiers`). Le lien sert au vendeur et à chaque
// acquéreur à qui ce bien est proposé. Un geste, un bien : jamais pour plusieurs biens d'un coup.
//
// Tout est relu ici : le conseiller (non retiré), le dossier de son agence (non archivé), l'accès à
// l'API (décidé au serveur, la démo par sa clé d'essai et la seule adresse de son dossier fixe),
// l'adresse ENREGISTRÉE du bien, ou une adresse proposée par Academia que le conseiller a choisie
// (la fiche du bien ne change pas sans son geste). Seuls l'adresse, le type, les pièces et la surface
// partent ; jamais un nom. Un échec n'est jamais lu comme « pas de lien » (M98) : il est dit, et le
// conseiller peut coller le lien lui-même.

export type LivingHereLinkState =
  | { state: 'ready'; url: string; expiresAt: string }
  | { state: 'waiting' }
  | { state: 'idle' }
  | { state: 'ambiguous'; propositions: string[] }
  | { state: 'no_address' }
  | { state: 'closed' }
  | { state: 'failed'; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ACADEMIA_DOWN =
  'Academia ne répond pas pour l’instant. Réessayez dans un moment, ou collez le lien vous-même.';
const ACADEMIA_QUOTA =
  'Academia a atteint sa limite du jour : réessayez demain, ou collez le lien vous-même.';
const ACADEMIA_REFUSED =
  'Academia refuse la demande pour l’instant : l’équipe ACM Studio est prévenue. Collez le lien vous-même.';
const ACADEMIA_DOSSIER_FAILED =
  'Academia n’a pas pu préparer le dossier de cette adresse. Vérifiez l’adresse du bien, ou collez le lien vous-même.';
const SAVE_FAILED = 'Le lien n’a pas pu être enregistré. Réessayez.';

type Admin = ReturnType<typeof createServiceRoleClient>;
type DossierRow = {
  academia_dossier_id: string;
  state: string;
  address_sent: string;
  link_url: string | null;
  link_expires_at: string | null;
};

async function failed(reason: AcademiaFailure, where: string): Promise<LivingHereLinkState> {
  if (reason.reason === 'quota') return { state: 'failed', message: ACADEMIA_QUOTA };
  if (reason.reason === 'unavailable') return { state: 'failed', message: ACADEMIA_DOWN };
  // Une clé refusée, un compte en lecture seule, un droit absent : l'équipe le voit au journal (la
  // clé n'y est jamais écrite).
  await reportServerError(`academia:${where}`, new Error(`Academia : ${reason.reason}`));
  return { state: 'failed', message: ACADEMIA_REFUSED };
}

async function context(projectId: unknown) {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { error: 'Vous devez être connecté.' } as const;
  if (typeof projectId !== 'string' || !UUID.test(projectId)) {
    return { error: 'Dossier introuvable.' } as const;
  }
  const admin = createServiceRoleClient();
  const { data: project } = await admin
    .from('projects')
    .select('id, status, academia_living_here_url')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!project || project.status === 'archived') return { error: 'Dossier introuvable.' } as const;
  return { profile, admin, project };
}

async function readDossier(admin: Admin, agencyId: string, projectId: string) {
  const { data } = await admin
    .from('project_academia_dossiers')
    .select('academia_dossier_id, state, address_sent, link_url, link_expires_at')
    .eq('project_id', projectId)
    .eq('agency_id', agencyId)
    .maybeSingle();
  return (data as DossierRow | null) ?? null;
}

// Le dossier prêt : le lien client, rangé sur le mandat ; un lien encore valable n'est pas refait.
async function linkFor(
  admin: Admin,
  agencyId: string,
  projectId: string,
  key: string,
  row: { academia_dossier_id: string; link_url: string | null; link_expires_at: string | null },
  currentUrl: string | null,
): Promise<LivingHereLinkState> {
  if (
    row.link_url &&
    row.link_expires_at &&
    row.link_url === currentUrl &&
    new Date(row.link_expires_at).getTime() > Date.now()
  ) {
    return { state: 'ready', url: row.link_url, expiresAt: row.link_expires_at };
  }
  const link = await createAcademiaClientLink(key, row.academia_dossier_id);
  if (!link.ok) return failed(link, 'client-link');
  const { error: rowError } = await admin
    .from('project_academia_dossiers')
    .update({ link_url: link.url, link_expires_at: link.expiresAt })
    .eq('project_id', projectId)
    .eq('agency_id', agencyId);
  const { error: projectError } = rowError
    ? { error: rowError }
    : await admin
        .from('projects')
        .update({ academia_living_here_url: link.url })
        .eq('id', projectId)
        .eq('agency_id', agencyId);
  if (rowError || projectError) {
    await reportServerError('academia:save-link', rowError ?? projectError);
    return { state: 'failed', message: SAVE_FAILED };
  }
  revalidatePath(`/builder/${projectId}/property`);
  return { state: 'ready', url: link.url, expiresAt: link.expiresAt };
}

async function follow(
  admin: Admin,
  agencyId: string,
  projectId: string,
  key: string,
  row: DossierRow,
  currentUrl: string | null,
): Promise<LivingHereLinkState> {
  let state = row.state;
  if (state === 'en_cours') {
    const read = await readAcademiaDossier(key, row.academia_dossier_id);
    if (!read.ok) return failed(read, 'read-dossier');
    state = read.etat;
    if (state !== 'en_cours') {
      await admin
        .from('project_academia_dossiers')
        .update({ state })
        .eq('project_id', projectId)
        .eq('agency_id', agencyId);
    }
  }
  if (state === 'en_cours') return { state: 'waiting' };
  if (state === 'erreur') return { state: 'failed', message: ACADEMIA_DOSSIER_FAILED };
  return linkFor(admin, agencyId, projectId, key, row, currentUrl);
}

async function run(
  projectId: unknown,
  create: boolean,
  chosenAddress: unknown,
): Promise<LivingHereLinkState> {
  const ctx = await context(projectId);
  if ('error' in ctx) return { state: 'failed', message: ctx.error ?? 'Dossier introuvable.' };
  const { profile, admin, project } = ctx;
  const access = academiaApiAccess(await isDemoAgency(profile.agency_id));
  if (!access) return { state: 'closed' };

  const { data: subject } = await admin
    .from('subject_properties')
    .select('address, postal_code, city, property_type, rooms_count, surface_area')
    .eq('project_id', project.id)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  const chosen =
    typeof chosenAddress === 'string' && chosenAddress.trim().length >= 5
      ? chosenAddress.trim().slice(0, 300)
      : null;
  const address =
    access.demoAddress ??
    chosen ??
    (subject
      ? propertyAddressLine({
          address: subject.address,
          postalCode: subject.postal_code,
          city: subject.city,
        })
      : null);
  if (!address) return { state: 'no_address' };

  const row = await readDossier(admin, profile.agency_id, project.id);
  const currentUrl = project.academia_living_here_url ?? null;
  // Le dossier de cette adresse, encore valable : on le suit, sans nouvelle demande (un dossier
  // compte dans le plafond commun ; un lien, non).
  if (row && row.address_sent === address && row.state !== 'erreur') {
    return follow(admin, profile.agency_id, project.id, access.key, row, currentUrl);
  }
  if (!create)
    return row ? { state: 'failed', message: ACADEMIA_DOSSIER_FAILED } : { state: 'idle' };

  const type = academiaPropertyType(subject?.property_type ?? null);
  const pieces = subject?.rooms_count && subject.rooms_count > 0 ? subject.rooms_count : null;
  const surface =
    subject?.surface_area && Number(subject.surface_area) > 0
      ? Math.round(Number(subject.surface_area))
      : null;
  const dossier = await createAcademiaDossier({
    key: access.key,
    adresse: address,
    bien: type ? { type, ...(pieces ? { pieces } : {}), ...(surface ? { surface } : {}) } : null,
    idempotence: `acm-${project.id}-${createHash('sha256').update(address).digest('hex').slice(0, 16)}`,
  });
  if (!dossier.ok) {
    if (dossier.reason === 'ambiguous') {
      return { state: 'ambiguous', propositions: dossier.propositions };
    }
    return failed(dossier, 'create-dossier');
  }
  const saved = {
    academia_dossier_id: dossier.id,
    state: dossier.etat,
    address_sent: address,
    link_url: null,
    link_expires_at: null,
  };
  const { error } = await admin.from('project_academia_dossiers').upsert(
    {
      agency_id: profile.agency_id,
      project_id: project.id,
      requested_by: profile.id,
      ...saved,
    },
    { onConflict: 'project_id' },
  );
  if (error) {
    await reportServerError('academia:save-dossier', error);
    return { state: 'failed', message: SAVE_FAILED };
  }
  if (dossier.etat === 'en_cours') return { state: 'waiting' };
  if (dossier.etat === 'erreur') return { state: 'failed', message: ACADEMIA_DOSSIER_FAILED };
  return linkFor(admin, profile.agency_id, project.id, access.key, saved, currentUrl);
}

export async function createLivingHereLink(
  projectId: unknown,
  chosenAddress: unknown = null,
): Promise<LivingHereLinkState> {
  return run(projectId, true, chosenAddress);
}

// La suite d'une demande en préparation (l'écran la relance toutes les 10 s, 2 minutes au plus,
// puis à l'ouverture suivante, modèle du Localisateur, M75) : jamais une nouvelle demande de dossier.
export async function refreshLivingHereLink(projectId: unknown): Promise<LivingHereLinkState> {
  return run(projectId, false, null);
}

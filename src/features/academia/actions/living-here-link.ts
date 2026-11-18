'use server';

import { revalidatePath } from 'next/cache';

import {
  academiaPropertyType,
  createAcademiaClientLink,
  createAcademiaRequest,
  readAcademiaRequest,
  type AcademiaFailure,
} from '@/features/academia/services/academia-api';
import { academiaApiAccess } from '@/features/academia/services/academia-api-access';
import { academiaQuotaMessage } from '@/features/academia/services/academia-messages';
import { linkNeedsRenewal } from '@/features/academia/services/living-here-age';
import { renewLivingHereLinkIfOld } from '@/features/academia/services/living-here-renewal';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';
import { propertyAddressLine } from '@/lib/academia';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

// Mission 157 — « Créer le lien « Vivre ici » », sur le bien vendeur seulement (plan Academia du
// 16/11, maquette M157-1) : ACM demande à Mon secteur le dossier de l'adresse du bien
// (`POST /dossiers`), suit sa préparation (`GET /dossiers/{id}`), puis son lien client
// (`POST /dossiers/{id}/liens-client`), et le range sur le mandat (`projects.academia_living_here_url`,
// M147 A) avec son expiration (`project_academia_requests`). Le lien sert au vendeur et à chaque
// acquéreur à qui ce bien est proposé. Un geste, un bien : jamais pour plusieurs biens d'un coup.
//
// Tout est relu ici : le conseiller (non retiré), le dossier de son agence (non archivé), l'accès à
// l'API (décidé au serveur, la démo par sa clé d'essai et la seule adresse de son dossier fixe, sans
// les caractéristiques de son bien), l'adresse ENREGISTRÉE du bien, ou une adresse que le conseiller
// a choisie parmi celles qu'Academia vient de proposer pour elle, revérifiée ici (la fiche du bien
// ne change pas sans son geste). Seuls l'adresse, le type, les pièces et la surface partent ; jamais
// un nom. Le dossier et son lien sont ceux de l'adresse du bien au moment de la demande : elle
// change, ils sont oubliés (contrat §3.3). Un échec n'est jamais lu comme « pas de lien » (M98) : il
// est dit, au journal (M100), et le conseiller peut coller le lien lui-même.

export type LivingHereLinkState =
  | { state: 'ready'; url: string; expiresAt: string }
  | { state: 'waiting' }
  | { state: 'idle' }
  | { state: 'ambiguous'; propositions: string[] }
  // Mission 161 — 422 sans proposition : le conseiller corrige l'adresse du bien.
  | { state: 'address_not_found' }
  | { state: 'no_address' }
  | { state: 'closed' }
  // `retry` : « Réessayer » a un sens (pas au plafond du jour : « réessayez demain »).
  | { state: 'failed'; message: string; retry: boolean };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ACADEMIA_DOWN =
  'Academia ne répond pas pour l’instant. Réessayez dans un moment, ou collez le lien vous-même.';
const ACADEMIA_REFUSED =
  'Academia refuse la demande pour l’instant : l’équipe ACM Studio est prévenue. Collez le lien vous-même.';
const ACADEMIA_PREPARATION_FAILED =
  'Academia n’a pas pu préparer le dossier de cette adresse pour l’instant : réessayez plus tard, ou collez le lien vous-même.';
const ACADEMIA_GONE =
  'Le dossier de cette adresse a été effacé chez Academia : touchez « Réessayer » pour en refaire un.';
const READ_FAILED = 'La demande à Academia n’a pas pu être lue. Réessayez dans un moment.';
const SAVE_FAILED = 'Le lien n’a pas pu être enregistré. Réessayez.';
const ADDRESS_MAX = 300;
const ADDRESS_TOO_LONG =
  'L’adresse du bien est trop longue pour Academia (300 caractères au plus) : raccourcissez-la sur la fiche.';

type Admin = ReturnType<typeof createServiceRoleClient>;
type RequestRow = {
  academia_id: string;
  state: string;
  property_address: string;
  link_url: string | null;
  link_expires_at: string | null;
};

const fail = (message: string, retry = true): LivingHereLinkState => ({
  state: 'failed',
  message,
  retry,
});

// Chaque échec d'Academia part au journal, la clé jamais (M100).
async function failed(reason: AcademiaFailure, where: string): Promise<LivingHereLinkState> {
  await reportServerError(
    `academia:${where}`,
    new Error(`Academia : ${reason.reason}${reason.detail ? ` — ${reason.detail}` : ''}`),
  );
  if (reason.reason === 'quota') {
    const quota = academiaQuotaMessage(reason.retryAfter);
    return fail(quota.message, quota.retry);
  }
  if (reason.reason === 'unavailable') return fail(ACADEMIA_DOWN);
  return fail(ACADEMIA_REFUSED);
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

async function markError(admin: Admin, agencyId: string, projectId: string) {
  const { error } = await admin
    .from('project_academia_requests')
    .update({ state: 'erreur' })
    .eq('project_id', projectId)
    .eq('agency_id', agencyId);
  if (error) await reportServerError('academia:mark-error', error);
}

// Le dossier prêt : le lien client, rangé sur le mandat ; un lien encore valable n'est pas refait.
async function linkFor(
  admin: Admin,
  agencyId: string,
  projectId: string,
  key: string,
  row: { academia_id: string; link_url: string | null; link_expires_at: string | null },
  currentUrl: string | null,
): Promise<LivingHereLinkState | 'gone'> {
  // Mission 161 — un seul lien par bien, réutilisé tant qu'il a moins de 7 jours (Jean-Guy, 18/11).
  const current =
    row.link_url &&
    row.link_expires_at &&
    row.link_url === currentUrl &&
    new Date(row.link_expires_at).getTime() > Date.now()
      ? { url: row.link_url, expiresAt: row.link_expires_at }
      : null;
  if (current && !linkNeedsRenewal(current.expiresAt, new Date())) {
    return { state: 'ready', ...current };
  }
  const link = await createAcademiaClientLink(key, row.academia_id);
  // Le lien neuf n'a pas pu être créé : le lien encore valable est gardé, rien n'est bloqué, c'est
  // noté au journal (un dossier effacé, lui, est redemandé dans le même geste).
  if (!link.ok && current && link.reason !== 'not_found') {
    await reportServerError(
      'academia:client-link',
      new Error(`Academia : ${link.reason}${link.detail ? ` — ${link.detail}` : ''} (lien gardé)`),
    );
    return { state: 'ready', ...current };
  }
  if (!link.ok) {
    // Mission 161 — un dossier qu'Academia a effacé (90 jours, `effaceLe`) : il est redemandé, avec
    // un nouveau lien, dans le même geste.
    if (link.reason === 'not_found') {
      await markError(admin, agencyId, projectId);
      return 'gone';
    }
    return failed(link, 'client-link');
  }
  const { error: rowError } = await admin
    .from('project_academia_requests')
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
    return fail(SAVE_FAILED);
  }
  revalidatePath(`/builder/${projectId}/property`);
  return { state: 'ready', url: link.url, expiresAt: link.expiresAt };
}

async function follow(
  admin: Admin,
  agencyId: string,
  projectId: string,
  key: string,
  row: RequestRow,
  currentUrl: string | null,
): Promise<LivingHereLinkState | 'gone'> {
  let state = row.state;
  if (state === 'en_cours') {
    const read = await readAcademiaRequest(key, row.academia_id);
    if (!read.ok) {
      if (read.reason === 'not_found') {
        await markError(admin, agencyId, projectId);
        return 'gone';
      }
      return failed(read, 'read-request');
    }
    state = read.etat;
    if (state !== 'en_cours') {
      const { error } = await admin
        .from('project_academia_requests')
        .update({ state })
        .eq('project_id', projectId)
        .eq('agency_id', agencyId);
      if (error) {
        await reportServerError('academia:save-state', error);
        return fail(SAVE_FAILED);
      }
    }
  }
  if (state === 'en_cours') return { state: 'waiting' };
  if (state === 'erreur') return fail(ACADEMIA_PREPARATION_FAILED);
  return linkFor(admin, agencyId, projectId, key, row, currentUrl);
}

async function run(
  projectId: unknown,
  create: boolean,
  chosenAddress: unknown,
): Promise<LivingHereLinkState> {
  const ctx = await context(projectId);
  if ('error' in ctx) return fail(ctx.error ?? 'Dossier introuvable.', false);
  const { profile, admin, project } = ctx;
  const access = academiaApiAccess({
    demo: await isDemoAgency(profile.agency_id),
    agencyId: profile.agency_id,
  });
  if (!access) return { state: 'closed' };

  const { data: subject, error: subjectError } = await admin
    .from('subject_properties')
    .select('address, postal_code, city, property_type, rooms_count, surface_area')
    .eq('project_id', project.id)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (subjectError) {
    await reportServerError('academia:read-property', subjectError);
    return fail(READ_FAILED);
  }
  // L'adresse ENREGISTRÉE du bien : celle du dossier et de son lien.
  const propertyAddress = subject
    ? propertyAddressLine({
        address: subject.address,
        postalCode: subject.postal_code,
        city: subject.city,
      })
    : null;
  if (!propertyAddress) return { state: 'no_address' };
  // La base garde l'adresse sur 300 caractères au plus : au-delà, rien ne part.
  if (propertyAddress.length > ADDRESS_MAX) return fail(ADDRESS_TOO_LONG, false);

  const { data: rowData, error: rowError } = await admin
    .from('project_academia_requests')
    .select('academia_id, state, property_address, link_url, link_expires_at')
    .eq('project_id', project.id)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (rowError) {
    await reportServerError('academia:read-request-row', rowError);
    return fail(READ_FAILED);
  }
  const row = (rowData as RequestRow | null) ?? null;
  const currentUrl = project.academia_living_here_url ?? null;
  // Le dossier de l'adresse du bien, encore valable : on le suit, sans nouvelle demande (un dossier
  // compte dans le plafond commun ; un lien, non).
  if (row && row.property_address === propertyAddress && row.state !== 'erreur') {
    const followed = await follow(
      admin,
      profile.agency_id,
      project.id,
      access.key,
      row,
      currentUrl,
    );
    if (followed !== 'gone') return followed;
    // Effacé chez Academia : un geste du conseiller le redemande ; une simple relecture le dit.
    if (!create) return fail(ACADEMIA_GONE);
  } else if (!create) {
    return row && row.property_address === propertyAddress
      ? fail(ACADEMIA_PREPARATION_FAILED)
      : { state: 'idle' };
  }

  // La démo n'envoie que l'adresse de son dossier fixe, sans les caractéristiques de son bien (A2).
  const type = access.demoAddress ? null : academiaPropertyType(subject?.property_type ?? null);
  const pieces = subject?.rooms_count && subject.rooms_count > 0 ? subject.rooms_count : null;
  const surface =
    subject?.surface_area && Number(subject.surface_area) > 0
      ? Math.round(Number(subject.surface_area))
      : null;
  const bien = type
    ? { type, ...(pieces ? { pieces } : {}), ...(surface ? { surface } : {}) }
    : null;
  let sent = access.demoAddress ?? propertyAddress;
  let request = await createAcademiaRequest({
    key: access.key,
    adresse: sent,
    bien,
  });
  if (!request.ok && request.reason === 'ambiguous') {
    // Une adresse choisie n'est envoyée que si Academia vient de la proposer pour celle du bien :
    // revérifiée ici, jamais crue du navigateur (CLAUDE.md).
    const chosen = typeof chosenAddress === 'string' ? chosenAddress.trim() : '';
    if (!access.demoAddress && chosen && request.propositions.includes(chosen)) {
      sent = chosen;
      request = await createAcademiaRequest({
        key: access.key,
        adresse: sent,
        bien,
      });
    }
    if (!request.ok && request.reason === 'ambiguous') {
      return { state: 'ambiguous', propositions: request.propositions };
    }
  }
  if (!request.ok && request.reason === 'address_not_found') {
    await reportServerError(
      'academia:create-request',
      new Error(`Academia : adresse introuvable${request.detail ? ` — ${request.detail}` : ''}`),
    );
    return { state: 'address_not_found' };
  }
  if (!request.ok) return failed(request, 'create-request');
  const saved = {
    academia_id: request.id,
    state: request.etat,
    property_address: propertyAddress,
    address_sent: sent,
    link_url: null,
    link_expires_at: null,
  };
  const { error } = await admin.from('project_academia_requests').upsert(
    {
      agency_id: profile.agency_id,
      project_id: project.id,
      requested_by: profile.id,
      ...saved,
    },
    { onConflict: 'project_id' },
  );
  if (error) {
    await reportServerError('academia:save-request', error);
    return fail(SAVE_FAILED);
  }
  if (request.etat === 'en_cours') return { state: 'waiting' };
  if (request.etat === 'erreur') return fail(ACADEMIA_PREPARATION_FAILED);
  const made = await linkFor(admin, profile.agency_id, project.id, access.key, saved, currentUrl);
  // Un dossier tout juste créé, déjà introuvable : dit, jamais une boucle.
  return made === 'gone' ? fail(ACADEMIA_GONE) : made;
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

// Mission 161 — à l'ouverture d'« Avant le rendez-vous » (un écran du conseiller) : le lien « Vivre
// ici » de 7 jours ou plus est renouvelé, en action et jamais pendant l'affichage ; en échec, le
// lien encore valable reste. Rien n'est rendu à l'écran : il se relit à l'ouverture suivante.
export async function renewLivingHereLinkOnOpen(projectId: unknown): Promise<void> {
  const ctx = await context(projectId);
  if ('error' in ctx) return;
  const { profile, admin, project } = ctx;
  await renewLivingHereLinkIfOld({
    admin,
    agencyId: profile.agency_id,
    projectId: project.id,
    access: academiaApiAccess({
      demo: await isDemoAgency(profile.agency_id),
      agencyId: profile.agency_id,
    }),
  });
}

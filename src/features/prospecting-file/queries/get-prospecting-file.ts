import 'server-only';

import { getAgencyBranding } from '@/features/branding/queries/get-agency-branding';
import { isProspectingOpen } from '@/features/competitor-locator/services/build-prospecting-rows';
import { prospectingStep } from '@/features/competitor-mandate/services/mandate-columns';
import { geocodeSubject } from '@/features/competitor-search/services/fetch-geo';
import { distanceMeters } from '@/features/competitor-search/services/proximity';
import {
  fileBlocker,
  fileVersions,
  resolveFileVersion,
  type FileBlocker,
} from '@/features/prospecting-file/services/file-access';
import {
  OUR_LISTING_SELECT,
  THEIR_LISTING_SELECT,
  buildProspectingFacts,
} from '@/features/prospecting-file/services/prospecting-facts';
import { documentAgencyName } from '@/features/prospecting-file/services/document-name';
import { buildQrCode, type QrCode } from '@/features/prospecting-file/services/qr-code';
import {
  NO_SAVED_THEIR_PHOTO,
  THEIR_PHOTO_MODES,
  listingPhotoUrls,
  theirPhotoPrefix,
  type SavedTheirPhoto,
  type TheirPhotoMode,
} from '@/features/prospecting-file/services/their-photo';
import { buildVCard } from '@/features/prospecting-file/services/vcard';
import {
  NO_OVERRIDES,
  type ProspectingFileFacts,
  type ProspectingFileOverrides,
  type ProspectingFileVersion,
  type ProspectingSender,
} from '@/features/prospecting-file/types';
import { readPhotoPaths } from '@/features/subject-property-photos/services/get-property-photos';
import {
  signPropertyPhotos,
  type SignedPhoto,
} from '@/features/subject-property-photos/services/property-photo-storage';
import { getAgency } from '@/lib/auth/get-agency';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Mission 84 — tout ce qu'il faut pour afficher ou enregistrer le dossier d'un concurrent.
// Cadré sur l'agence de l'appelant ; ouvert seulement pour un dossier conclu « mandat signé »
// et un concurrent retenu. Chaque lecture nomme ses colonnes : le nom du vendeur, sa valeur
// perçue, l'analyse et la fourchette du conseiller ne sont jamais lus ici.
// Mission 87 — les photos de l'annonce du concurrent sont lues pour être PROPOSÉES au
// conseiller ; elles n'entrent pas dans les faits du dossier (`facts`).

// Le document reste ouvert le temps de le relire : les photos sont signées pour la demi-journée.
const PHOTO_URL_TTL_SECONDS = 60 * 60 * 12;

export type ProspectingFileContext =
  | { status: 'not_found' }
  | {
      status: 'choose';
      versions: { version: ProspectingFileVersion; blocker: FileBlocker | null }[];
    }
  | { status: 'blocked'; version: ProspectingFileVersion; blocker: FileBlocker }
  | {
      status: 'ready';
      version: ProspectingFileVersion;
      agencyId: string;
      profileId: string;
      facts: ProspectingFileFacts;
      sender: ProspectingSender;
      overrides: ProspectingFileOverrides;
      // Les photos du bien vendeur, dans l'ordre de la fiche : la première est proposée.
      photos: SignedPhoto[];
      // Mission 87 — la photo du bien concurrent : celles de son annonce, le choix enregistré,
      // les fichiers gardés dans le stockage de l'agence (signés), et le dossier où ils vivent.
      theirPhoto: {
        listing: string[];
        saved: SavedTheirPhoto;
        signed: Record<string, string | null>;
        prefix: string;
      };
      qr: QrCode;
    };

export async function getProspectingFile(
  projectId: string,
  competitorId: string,
  requestedVersion: unknown,
): Promise<ProspectingFileContext> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) {
    return { status: 'not_found' };
  }
  const agencyId = profile.agency_id;
  const supabase = await createClient();

  const [{ data: project }, { data: conclusion }, { data: competitor }, { data: property }] =
    await Promise.all([
      supabase
        .from('projects')
        .select('id, status')
        .eq('id', projectId)
        .eq('agency_id', agencyId)
        .maybeSingle(),
      supabase
        .from('project_meeting_conclusions')
        .select('outcome, commercialization_price')
        .eq('project_id', projectId)
        .eq('agency_id', agencyId)
        .maybeSingle(),
      supabase
        .from('comparables')
        .select(
          `id, is_selected, sold_by, exclusivity, locator_address, locator_confirmed, locator_latitude, locator_longitude, photo_urls, ${THEIR_LISTING_SELECT}`,
        )
        .eq('id', competitorId)
        .eq('project_id', projectId)
        .eq('agency_id', agencyId)
        .maybeSingle(),
      supabase
        .from('subject_properties')
        .select(`address, postal_code, photo_urls, ${OUR_LISTING_SELECT}`)
        .eq('project_id', projectId)
        .eq('agency_id', agencyId)
        .maybeSingle(),
    ]);

  if (
    !project ||
    !competitor ||
    !property ||
    !competitor.is_selected ||
    !isProspectingOpen(project.status, conclusion?.outcome)
  ) {
    return { status: 'not_found' };
  }

  // Mission 90 — l'adresse de l'agence conditionne le courrier au propriétaire : lue avant.
  const branding = await getAgencyBranding();

  const confirmedAddress =
    competitor.locator_confirmed === true ? competitor.locator_address?.trim() || null : null;
  const blockerFor = (version: ProspectingFileVersion): FileBlocker | null =>
    fileBlocker({
      version,
      addressConfirmed: confirmedAddress != null,
      advisorPhone: profile.phone,
      agencyAddress: branding?.postalAddress ?? null,
    });

  const step = prospectingStep(competitor);
  const version = resolveFileVersion(step, requestedVersion);
  if (version == null) {
    return {
      status: 'choose',
      versions: fileVersions(step).map((candidate) => ({
        version: candidate,
        blocker: blockerFor(candidate),
      })),
    };
  }
  const blocker = blockerFor(version);
  if (blocker) {
    return { status: 'blocked', version, blocker };
  }

  // La distance ne se mesure qu'entre deux positions sûres : l'adresse confirmée du concurrent
  // et notre adresse géocodée au numéro ou à la rue. Sinon « même secteur » seul.
  let distance: number | null = null;
  if (
    confirmedAddress != null &&
    competitor.locator_latitude != null &&
    competitor.locator_longitude != null &&
    property.city
  ) {
    const geocode = await geocodeSubject(property.address, property.postal_code, property.city);
    if (geocode.ok) {
      distance = distanceMeters(geocode.point, {
        lat: competitor.locator_latitude,
        lon: competitor.locator_longitude,
      });
    }
  }

  const photoPaths = readPhotoPaths(property.photo_urls);
  const [agency, saved, photos, advisorPhoto] = await Promise.all([
    getAgency(agencyId),
    supabase
      .from('competitor_prospecting_files')
      .select(
        'title, letter, key_message, proposal_1, proposal_2, proposal_3, contact_hook, show_prices, photo_path, their_photo_mode, their_photo_source_url, their_photo_path',
      )
      .eq('comparable_id', competitorId)
      .eq('version', version)
      .eq('agency_id', agencyId)
      .maybeSingle(),
    signPropertyPhotos(supabase, photoPaths, PHOTO_URL_TTL_SECONDS),
    profile.photo_path
      ? signPropertyPhotos(supabase, [profile.photo_path], PHOTO_URL_TTL_SECONDS)
      : Promise.resolve([]),
  ]);

  // Mission 87 — le nom imprimé : « Nom sur les documents » s'il est rempli, sinon l'agence.
  const agencyName = documentAgencyName(branding?.documentName, agency?.name);
  const row = saved.data;

  const prefix = theirPhotoPrefix(agencyId, projectId, competitorId);
  const savedTheirPhoto: SavedTheirPhoto = row
    ? {
        mode: (THEIR_PHOTO_MODES as readonly string[]).includes(row.their_photo_mode ?? '')
          ? (row.their_photo_mode as TheirPhotoMode)
          : null,
        sourceUrl: row.their_photo_source_url,
        // Un chemin hors du dossier de ce concurrent n'est jamais signé.
        path: row.their_photo_path?.startsWith(prefix) ? row.their_photo_path : null,
      }
    : NO_SAVED_THEIR_PHOTO;
  const theirSigned = savedTheirPhoto.path
    ? await signPropertyPhotos(supabase, [savedTheirPhoto.path], PHOTO_URL_TTL_SECONDS)
    : [];
  return {
    status: 'ready',
    version,
    agencyId,
    profileId: profile.id,
    facts: buildProspectingFacts({
      ours: property,
      ourPrice: conclusion?.commercialization_price ?? null,
      theirs: competitor,
      theirAddress: confirmedAddress,
      distanceMeters: distance,
    }),
    sender: {
      advisorName: `${profile.first_name} ${profile.last_name}`.trim(),
      email: profile.email,
      phone: profile.phone?.trim() || null,
      photoUrl: advisorPhoto[0]?.url ?? null,
      agencyName,
      logoUrl: branding?.logoLightUrl ?? null,
      postalAddress: branding?.postalAddress ?? null,
      professionalCard: branding?.professionalCard ?? null,
    },
    overrides: row
      ? {
          title: row.title,
          letter: row.letter,
          keyMessage: row.key_message,
          proposals: [row.proposal_1, row.proposal_2, row.proposal_3],
          contactHook: row.contact_hook,
          showPrices: row.show_prices,
          photoPath: row.photo_path,
        }
      : NO_OVERRIDES,
    photos,
    theirPhoto: {
      listing: listingPhotoUrls(competitor.photo_urls),
      saved: savedTheirPhoto,
      signed: Object.fromEntries(theirSigned.map((photo) => [photo.path, photo.url])),
      prefix,
    },
    qr: buildQrCode(
      buildVCard({
        firstName: profile.first_name,
        lastName: profile.last_name,
        agencyName,
        phone: profile.phone,
        email: profile.email,
      }),
    ),
  };
}

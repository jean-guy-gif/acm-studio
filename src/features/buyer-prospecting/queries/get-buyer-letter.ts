import 'server-only';

import { getAgencyBranding } from '@/features/branding/queries/get-agency-branding';
import {
  buyerLetterVersion,
  colleagueExclusivityCard,
  defaultBuyerColleagueLetter,
  defaultBuyerLetter,
  type BuyerLetterTexts,
  type BuyerLetterVersion,
} from '@/features/buyer-prospecting/services/buyer-letter';
import type { ExclusivityCard } from '@/features/buyer-prospecting/queries/get-buyer-letter-types';
import { buildBuyerProspectRow } from '@/features/buyer-prospecting/services/buyer-prospect-row';
import { comparableFacts, storedFacts } from '@/features/buyer-prospecting/services/prospect-facts';
import type { BuyerProspectFacts, BuyerProspectRecord } from '@/features/buyer-prospecting/types';
import { toBuyer } from '@/features/buyers/services/buyer-row';
import type { Buyer } from '@/features/buyers/types';
import { listingIdentityKey } from '@/features/comparable-import/utils/extract-listing-key';
import { buildQrCode, type QrCode } from '@/features/contact-card/services/qr-code';
import { buildVCard } from '@/features/contact-card/services/vcard';
import { documentAgencyName } from '@/features/prospecting-file/services/document-name';
import { fileBlocker, type FileBlocker } from '@/features/prospecting-file/services/file-access';
import { addressSource } from '@/features/prospecting-file/services/prospecting-facts';
import {
  NO_SAVED_THEIR_PHOTO,
  THEIR_PHOTO_MODES,
  type SavedTheirPhoto,
  type TheirPhotoMode,
} from '@/features/prospecting-file/services/their-photo';
import type { AddressSource, ProspectingSender } from '@/features/prospecting-file/types';
import { getOppositions } from '@/features/prospecting/queries/get-oppositions';
import { cardOpposedOn } from '@/features/prospecting/queries/prospecting-card-store';
import { opposedOn } from '@/features/prospecting/services/opposition';
import { signPropertyPhotos } from '@/features/subject-property-photos/services/property-photo-storage';
import { getAgency } from '@/lib/auth/get-agency';
import { getProfile } from '@/lib/auth/get-profile';
import { siteUrl } from '@/lib/site-url';
import { createClient } from '@/lib/supabase/server';

const PHOTO_URL_TTL_SECONDS = 60 * 60 * 12;

export type BuyerLetterOverrides = {
  title: string | null;
  letter: string | null;
  question: string | null;
  contactHook: string | null;
};

export type { ExclusivityCard };

export type BuyerLetterContext =
  | { status: 'not_found' }
  | { status: 'blocked'; buyerId: string; blocker: FileBlocker; version: BuyerLetterVersion }
  | {
      status: 'ready';
      originId: string;
      buyerId: string;
      agencyId: string;
      profileId: string;
      buyer: Buyer;
      facts: BuyerProspectFacts;
      // Mission 120 B — le courrier au propriétaire, ou le dossier au confrère (exclusivité).
      version: BuyerLetterVersion;
      // Le confrère n'a pas besoin de l'adresse du bien (M98, M108) : null pour lui.
      address: string | null;
      exclusivityCard: ExclusivityCard;
      addressSource: AddressSource;
      defaults: BuyerLetterTexts;
      overrides: BuyerLetterOverrides;
      sender: ProspectingSender;
      theirPhoto: {
        listing: string[];
        saved: SavedTheirPhoto;
        signed: Record<string, string | null>;
        prefix: string;
      };
      qr: QrCode;
    };

// Où vivent les photos du courrier d'une recherche acquéreur, dans le stockage de l'agence : tout
// chemin venu du navigateur doit commencer par là (M87).
export const buyerLetterPhotoPrefix = (agencyId: string, originId: string): string =>
  `${agencyId}/buyer-prospecting/${originId}/`;

const COMPARABLE_COLUMNS =
  'id, project_id, listing_url, exclusivity, prospecting_collaboration_declined_at, locator_address, locator_confirmed, locator_source, locator_latitude, locator_longitude, property_type, surface_area, rooms_count, land_area, outdoor_spaces, parking_types, listing_features, energy_rating, district, city, price, photo_urls';

// Mission 120 — tout ce qu'il faut pour afficher ou enregistrer le courrier au propriétaire d'une
// recherche acquéreur. Cadré sur l'agence de l'appelant. Les blocages sont ceux de tout courrier
// propriétaire, dans le même ordre (M90, M98, M102, M109, M111) : l'opposition, l'adresse
// confirmée, le téléphone du conseiller, l'adresse de l'agence, la carte professionnelle. Ce qui
// est lu de la fiche acquéreur ne sert qu'à choisir les caractéristiques communes : le courrier
// ne reçoit ni le nom ni le budget.
export async function getBuyerLetter(originId: string): Promise<BuyerLetterContext> {
  const profile = await getProfile();
  if (!profile || profile.removed_at || !/^[0-9a-f-]{36}$/i.test(originId)) {
    return { status: 'not_found' };
  }
  const agencyId = profile.agency_id;
  const supabase = await createClient();
  const { data: origin } = await supabase
    .from('buyer_prospect_origins')
    .select(
      'id, buyer_id, prospect_id, comparable_id, letter_version, letter_title, letter_body, letter_question, letter_contact_hook, their_photo_mode, their_photo_source_url, their_photo_path, buyers!inner(*)',
    )
    .eq('id', originId)
    .eq('agency_id', agencyId)
    .maybeSingle();
  if (!origin) {
    return { status: 'not_found' };
  }
  const buyer = toBuyer(origin.buyers as unknown as Parameters<typeof toBuyer>[0]);
  if (buyer.archivedAt != null) {
    return { status: 'not_found' };
  }

  const oppositions = await getOppositions(supabase, agencyId);
  let facts: BuyerProspectFacts;
  let address: string | null;
  let source: AddressSource;
  let opposed: boolean;
  let exclusivity: string | null;
  let collaborationDeclined: boolean;
  let listingUrl: string | null;
  if (origin.prospect_id) {
    const { data } = await supabase
      .from('buyer_prospects')
      .select('*')
      .eq('id', origin.prospect_id)
      .eq('agency_id', agencyId)
      .maybeSingle();
    if (!data) {
      return { status: 'not_found' };
    }
    const prospect = data as BuyerProspectRecord;
    const row = buildBuyerProspectRow(prospect, oppositions);
    facts = storedFacts(prospect.facts);
    address = row.confirmed ? row.address : null;
    source = addressSource(
      prospect.locator_source,
      prospect.locator_latitude != null && prospect.locator_longitude != null,
    );
    opposed = row.opposedOn != null;
    exclusivity = prospect.exclusivity;
    collaborationDeclined = prospect.prospecting_collaboration_declined_at != null;
    listingUrl = prospect.listing_url;
  } else {
    const { data } = await supabase
      .from('comparables')
      .select(COMPARABLE_COLUMNS)
      .eq('id', origin.comparable_id ?? '')
      .eq('agency_id', agencyId)
      .maybeSingle();
    if (!data) {
      return { status: 'not_found' };
    }
    facts = comparableFacts(data);
    address = data.locator_confirmed === true ? data.locator_address?.trim() || null : null;
    source = addressSource(
      data.locator_source,
      data.locator_latitude != null && data.locator_longitude != null,
    );
    // Mission 111 — l'opposition suit la carte entière.
    opposed =
      opposedOn(
        { address: data.locator_address, listingKey: listingIdentityKey(data.listing_url) },
        oppositions,
      ) != null || (await cardOpposedOn(data.project_id, data.id)) != null;
    exclusivity = data.exclusivity;
    collaborationDeclined = data.prospecting_collaboration_declined_at != null;
    listingUrl = data.listing_url;
  }
  // Mission 120 B — en exclusivité, le dossier au confrère ; un refus de collaboration le remet
  // en courrier au propriétaire (M115) ; sinon le propriétaire.
  const version: BuyerLetterVersion = buyerLetterVersion(exclusivity, collaborationDeclined);

  const branding = await getAgencyBranding();
  const blocker = fileBlocker({
    version,
    opposed,
    addressConfirmed: address != null,
    advisorPhone: profile.phone,
    agencyAddress: branding?.postalAddress ?? null,
    professionalCard: branding?.professionalCard ?? null,
    professionalCardIssuer: branding?.professionalCardIssuer ?? null,
  });
  if (blocker || (version === 'owner' && address == null)) {
    return {
      status: 'blocked',
      buyerId: buyer.id,
      blocker: blocker ?? 'address_unconfirmed',
      version,
    };
  }

  const prefix = buyerLetterPhotoPrefix(agencyId, origin.id);
  const saved: SavedTheirPhoto = origin.their_photo_mode
    ? {
        mode: (THEIR_PHOTO_MODES as readonly string[]).includes(origin.their_photo_mode)
          ? (origin.their_photo_mode as TheirPhotoMode)
          : null,
        sourceUrl: origin.their_photo_source_url,
        path: origin.their_photo_path?.startsWith(prefix) ? origin.their_photo_path : null,
      }
    : NO_SAVED_THEIR_PHOTO;
  const [agency, advisorPhoto, theirSigned] = await Promise.all([
    getAgency(agencyId),
    profile.photo_path
      ? signPropertyPhotos(supabase, [profile.photo_path], PHOTO_URL_TTL_SECONDS)
      : Promise.resolve([]),
    saved.path
      ? signPropertyPhotos(supabase, [saved.path], PHOTO_URL_TTL_SECONDS)
      : Promise.resolve([]),
  ]);
  const agencyName = documentAgencyName(branding?.documentName, agency?.name);
  const advisorName = `${profile.first_name} ${profile.last_name}`.trim();
  // Les textes enregistrés valent pour leur version : quand la version change (exclusivité
  // corrigée, collaboration refusée), ils sont ignorés, jamais effacés.
  const sameVersion = (origin.letter_version ?? 'owner') === version;
  return {
    status: 'ready',
    originId: origin.id,
    buyerId: buyer.id,
    agencyId,
    profileId: profile.id,
    buyer,
    facts,
    version,
    address: version === 'owner' ? address : null,
    exclusivityCard: colleagueExclusivityCard(facts, buyer, listingUrl),
    addressSource: source,
    defaults:
      version === 'colleague'
        ? defaultBuyerColleagueLetter(facts, buyer, { advisorName, agencyName })
        : defaultBuyerLetter(facts, buyer, { collaborationDeclined }),
    overrides: sameVersion
      ? {
          title: origin.letter_title,
          letter: origin.letter_body,
          question: origin.letter_question,
          contactHook: origin.letter_contact_hook,
        }
      : { title: null, letter: null, question: null, contactHook: null },
    sender: {
      advisorName,
      email: profile.email,
      phone: profile.phone?.trim() || null,
      photoUrl: advisorPhoto[0]?.url ?? null,
      agencyName,
      logoUrl: branding?.logoLightUrl ?? null,
      postalAddress: branding?.postalAddress ?? null,
      professionalCard: branding?.professionalCard ?? null,
      professionalCardIssuer: branding?.professionalCardIssuer ?? null,
      financialGuarantee: branding?.financialGuarantee ?? null,
      privacyUrl: `${siteUrl()
        .replace(/^https?:\/\//, '')
        .replace(/\/+$/, '')}/confidentialite`,
    },
    theirPhoto: {
      listing: facts.photoUrls,
      saved,
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

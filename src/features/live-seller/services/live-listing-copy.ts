import {
  readListingCopyFacts,
  readListingCopyPhotos,
} from '@/features/competitor-listing-copy/listing-copy';
import {
  OUTDOOR_SPACES,
  PARKING_TYPES,
  type OutdoorSpace,
  type ParkingType,
} from '@/features/subject-property/constants/property-options';

// Mission 152 (partie A) — ce que montre « Voir l'annonce » quand l'annonce n'est plus en ligne :
// la copie qu'ACM en a gardée, pour confirmer le prix, rien d'autre (Jean-Guy, 11/11). Une LISTE
// D'AUTORISATION (M51) : le prix et ses dates, les photos, les caractéristiques. Jamais le texte,
// le titre, l'adresse, le lien, le portail en clair d'une annonce de démonstration, « Vendu par »
// ni l'exclusivité (M83, M107). Pur.

export type LiveListingCopy = {
  // L'annonce n'est plus en ligne (preuve M103) ; depuis ce jour, quand la relecture l'a daté.
  // Retirée dès l'import, aucune date : jamais une date qui n'est pas celle du retrait.
  gone: boolean;
  goneSince: string | null;
  // Le portail de l'annonce, nommé (« SeLoger »), sinon null.
  portal: string | null;
  // Le jour où ACM a relevé l'annonce : la copie de l'import, sinon le premier relevé daté (M47).
  recordedOn: string | null;
  // Vrai seulement quand la copie de l'import existe : « à l'import » se dit alors.
  atImport: boolean;
  // Le prix relevé ce jour-là (la copie, sinon le premier relevé).
  recordedPrice: number | null;
  // Le prix que le vendeur vient de voir révélé.
  price: number;
  // La dernière relecture, si elle est plus récente que le relevé.
  lastCheck: { on: string; price: number } | null;
  // La dernière baisse connue — seulement quand la durée a été révélée (M95).
  drop: { from: number; to: number; on: string } | null;
  photoUrls: string[];
  surfaceArea: number | null;
  landArea: number | null;
  roomsCount: number | null;
  bedroomsCount: number | null;
  energyRating: string | null;
  outdoorSpaces: OutdoorSpace[];
  parkingTypes: ParkingType[];
};

export type ListingCopyRecord = {
  captured_at: string;
  price: number;
  photo_urls: unknown;
  facts: unknown;
} | null;

export type ListingObservation = { observed_on: string; price: number };

export type LiveListingEntryFacts = {
  price: number;
  photoUrls: string[];
  surfaceArea: number | null;
  roomsCount: number | null;
  bedroomsCount: number | null;
  energyRating: string | null;
  landArea: number | null;
  outdoorSpaces: string[];
  parkingTypes: string[];
};

function day(value: string): string {
  return value.slice(0, 10);
}

// Seulement les valeurs de la liste, et jamais « aucun » : une absence n'a pas de case.
function only<T extends string>(values: readonly string[], allowed: readonly T[]): T[] {
  return values.filter(
    (value): value is T => value !== 'none' && (allowed as readonly string[]).includes(value),
  );
}

export function buildLiveListingCopy(input: {
  copy: ListingCopyRecord;
  observations: ListingObservation[];
  entry: LiveListingEntryFacts;
  portal: string | null;
  gone: boolean;
  goneAt: string | null;
  durationRevealed: boolean;
}): LiveListingCopy {
  const { copy, entry } = input;
  const observations = [...input.observations].sort((a, b) =>
    a.observed_on.localeCompare(b.observed_on),
  );
  const facts = copy ? readListingCopyFacts(copy.facts) : null;
  const copyPhotos = copy ? readListingCopyPhotos(copy.photo_urls) : [];
  const recordedOn = copy ? day(copy.captured_at) : (observations[0]?.observed_on ?? null);
  const recordedPrice = copy
    ? Number(copy.price)
    : observations[0]
      ? Number(observations[0].price)
      : null;
  const last = observations.at(-1) ?? null;
  const lastCheck =
    last && recordedOn && last.observed_on > recordedOn
      ? { on: last.observed_on, price: Number(last.price) }
      : null;

  let drop: LiveListingCopy['drop'] = null;
  if (input.durationRevealed) {
    for (let index = observations.length - 1; index > 0; index -= 1) {
      const before = Number(observations[index - 1].price);
      const after = Number(observations[index].price);
      if (after < before) {
        drop = { from: before, to: after, on: observations[index].observed_on };
        break;
      }
      if (after > before) break;
    }
  }

  return {
    gone: input.gone,
    goneSince: input.gone && input.goneAt ? day(input.goneAt) : null,
    portal: input.portal,
    recordedOn,
    atImport: copy != null,
    recordedPrice,
    price: entry.price,
    lastCheck,
    drop,
    photoUrls: copyPhotos.length > 0 ? copyPhotos : entry.photoUrls,
    surfaceArea: facts?.surfaceArea ?? entry.surfaceArea,
    landArea: facts?.landArea ?? entry.landArea,
    roomsCount: facts?.roomsCount ?? entry.roomsCount,
    bedroomsCount: facts?.bedroomsCount ?? entry.bedroomsCount,
    energyRating: facts?.energyRating ?? entry.energyRating,
    outdoorSpaces: only(facts?.outdoorSpaces ?? entry.outdoorSpaces, OUTDOOR_SPACES),
    parkingTypes: only(facts?.parkingTypes ?? entry.parkingTypes, PARKING_TYPES),
  };
}

// L'adresse de l'annonce à ouvrir dans un nouvel onglet : http(s) seulement, sinon rien.
export function openableListingUrl(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

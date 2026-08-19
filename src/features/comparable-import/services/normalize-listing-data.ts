import type { ExtractedParts } from '@/features/comparable-import/services/extract-listing-data';
import type {
  ImportedComparableData,
  PartialListingData,
} from '@/features/comparable-import/types';
import { mapComparableCharacteristics } from '@/features/comparable-import/services/map-comparable-characteristics';
import { deduplicatePhotoUrls } from '@/features/comparable-import/utils/deduplicate-photo-urls';
import { isGenericImageUrl, isGenericTitle } from '@/features/comparable-import/utils/is-generic';
import { keepListingPhotos } from '@/features/comparable-import/utils/listing-photo-scope';
import { isDedicatedColumnLine } from '@/features/comparable-import/utils/extract-visible-features';
import { daysOnMarketSince } from '@/features/comparable-import/utils/extract-listing-published-at';

type ScalarField = Exclude<
  keyof ImportedComparableData,
  | 'listingUrl'
  | 'photoUrls'
  | 'listingFeatures'
  | 'source'
  | 'title'
  // Mission 24 structured fields are derived by mapping, not picked from extractors.
  | 'generalCondition'
  | 'exposure'
  | 'outdoorSpaces'
  | 'parkingTypes'
  // Mission 33 : la date vient d'un lecteur dédié et les jours en sont déduits.
  | 'listingPublishedAt'
  | 'daysOnMarket'
>;

const SCALAR_FIELDS: ScalarField[] = [
  'address',
  'postalCode',
  'city',
  'district',
  'surfaceArea',
  'landArea',
  'roomsCount',
  'bedroomsCount',
  'bathroomsCount',
  'energyRating',
  'gesRating',
  'constructionYear',
  'heatingType',
  'energySource',
  'price',
  'portalPricePerSquareMeter',
  'listingDescription',
];

// Fields advertised in the found/missing summary.
const SUMMARY_FIELDS: Array<ScalarField | 'title' | 'daysOnMarket'> = [
  'title',
  'price',
  'portalPricePerSquareMeter',
  'surfaceArea',
  'roomsCount',
  'bedroomsCount',
  'bathroomsCount',
  'city',
  'district',
  'energyRating',
  'gesRating',
  'listingDescription',
  'daysOnMarket',
];

function pickScalar(field: ScalarField, sources: PartialListingData[]): string | number | null {
  for (const source of sources) {
    const value = source[field];
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return null;
}

function pickTitle(sources: PartialListingData[], source: string): string | null {
  for (const candidate of sources) {
    const value = candidate.title;
    if (typeof value === 'string' && value.trim() !== '' && !isGenericTitle(value, source)) {
      return value.trim();
    }
  }
  return null;
}

function num(value: string | number | null): number | null {
  return typeof value === 'number' ? value : null;
}
function str(value: string | number | null): string | null {
  return typeof value === 'string' ? value : null;
}

// La description sert à cocher terrasse, garage, parking… : on retient la PLUS
// LONGUE des candidates, jamais la première. Terrain (19/08) : la balise `meta`
// arrive en tête du document et n'est qu'un résumé tronqué de 148 caractères,
// là où la vraie description en fait plus de mille.
function pickLongestDescription(
  sources: readonly PartialListingData[],
  ...extra: Array<string | null>
): string | null {
  const candidates = [...sources.map((source) => source.listingDescription), ...extra].filter(
    (value): value is string => typeof value === 'string' && value.trim() !== '',
  );
  if (candidates.length === 0) {
    return null;
  }
  return candidates.reduce((best, candidate) =>
    candidate.trim().length > best.trim().length ? candidate : best,
  );
}

function hostOf(url: string, baseUrl: string): string | null {
  try {
    return new URL(url, baseUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}

// Garde les adresses encastrées servies par le MÊME hébergeur que la photo de
// référence (la première fournie par la source la plus fiable). Terrain
// (19/08, SeLoger) : se fier à TOUS les hébergeurs déjà vus faisait entrer les
// logos d'agence, servis par un CDN distinct. Sans photo de référence, on ne
// devine rien : mieux vaut aucune photo qu'un habillage présenté au vendeur
// comme celle du bien.
function galleryFromSameHosts(
  embedded: readonly string[],
  reference: readonly string[],
  listingUrl: string,
): string[] {
  const trustedHosts = new Set(
    reference.map((url) => hostOf(url, listingUrl)).filter((host): host is string => host != null),
  );
  if (trustedHosts.size === 0) {
    return [];
  }
  return embedded.filter((url) => {
    if (isGenericImageUrl(url)) {
      return false;
    }
    const host = hostOf(url, listingUrl);
    return host != null && trustedHosts.has(host);
  });
}

// A page only counts as a real listing when at least one HARD business field was
// extracted. When a portal serves a block / captcha / search page instead of the
// listing, every one of these stays null — and whatever images that page carries
// (tracking pixels, browser icons, banners) must NOT be offered as the
// property's photos. A wrong photo is worse than no photo.
function hasListingSignal(data: ImportedComparableData): boolean {
  return (
    data.price != null || data.surfaceArea != null || data.roomsCount != null || data.title != null
  );
}

// Builds the editable feature lines from the genuine portal characteristics
// only. Structured values (price/m², GES, year, heating, energy, district) live
// in their own dedicated columns and must NOT be duplicated here.
function buildFeatures(sources: PartialListingData[]): string[] {
  const features: string[] = [];
  for (const source of sources) {
    for (const feature of source.listingFeatures ?? []) {
      if (feature.trim() !== '') {
        features.push(feature.trim());
      }
    }
  }
  return [...new Set(features)];
}

export function normalizeListingData(
  parts: ExtractedParts,
  listingUrl: string,
  source: string,
): { data: ImportedComparableData; foundFields: string[]; missingFields: string[] } {
  // Priority: portal extractor > JSON-LD > Open Graph > HTML.
  const ordered: PartialListingData[] = [parts.portal, parts.jsonLd, parts.openGraph, parts.html];

  // La date de mise en ligne vient d'abord du lecteur générique, qui balaie
  // toute la page ; un extracteur de portail peut la surcharger s'il sait faire
  // mieux sur son propre gabarit.
  const publishedAt =
    parts.portal.listingPublishedAt ??
    parts.jsonLd.listingPublishedAt ??
    parts.listingPublishedAt ??
    null;

  const merged = {} as Record<ScalarField, string | number | null>;
  for (const field of SCALAR_FIELDS) {
    merged[field] = pickScalar(field, ordered);
  }

  // Par source, dans l'ordre de priorité : la première source qui fournit des
  // photos donne l'hébergeur de référence (voir galleryFromSameHosts).
  const photoGroups = [
    parts.portal.photoUrls ?? [],
    parts.jsonLd.photoUrls ?? [],
    parts.openGraph.photoUrls ?? [],
    parts.html.photoUrls ?? [],
  ].map((group) => group.filter((url) => !isGenericImageUrl(url)));
  const identifiedPhotos = photoGroups.flat();
  const referencePhotos = photoGroups.find((group) => group.length > 0) ?? [];

  // Galerie chargée par script : on complète avec les adresses trouvées dans le
  // texte de la page, mais UNIQUEMENT chez les hébergeurs déjà identifiés comme
  // portant les photos de l'annonce. Sans ce filtre on ramasserait les visuels
  // du site (bandeaux, avatars, partenaires) ; avec lui on récupère les autres
  // photos du bien, qui sortent du même serveur d'images que la couverture.
  // Terrain (19/08, SeLoger) : le logo de l'agence est une vraie balise <img> de
  // la page, servie par un CDN d'images distinct. On applique donc le filtre
  // d'hébergeur à TOUTES les candidates, pas seulement à la galerie encastrée :
  // les photos d'un bien sortent du serveur d'images du portail.
  const combinedPhotos = galleryFromSameHosts(
    [...identifiedPhotos, ...(parts.embeddedPhotoUrls ?? [])],
    referencePhotos,
    listingUrl,
  );
  // Recette du 19/08 : la page contient aussi les photos des « biens
  // similaires » et l'habillage du site. On les écarte AVANT la déduplication.
  const candidatePhotos = deduplicatePhotoUrls(
    keepListingPhotos(combinedPhotos, listingUrl),
    listingUrl,
  );

  const data: ImportedComparableData = {
    title: pickTitle(ordered, source),
    listingUrl,
    source,
    address: str(merged.address),
    postalCode: str(merged.postalCode),
    city: str(merged.city),
    district: str(merged.district),
    surfaceArea: num(merged.surfaceArea),
    landArea: num(merged.landArea),
    roomsCount: num(merged.roomsCount),
    bedroomsCount: num(merged.bedroomsCount),
    bathroomsCount: num(merged.bathroomsCount),
    energyRating: str(merged.energyRating),
    gesRating: str(merged.gesRating),
    constructionYear: num(merged.constructionYear),
    heatingType: str(merged.heatingType),
    energySource: str(merged.energySource),
    price: num(merged.price),
    portalPricePerSquareMeter: num(merged.portalPricePerSquareMeter),
    listingDescription: pickLongestDescription(
      ordered,
      parts.embeddedDescription ?? null,
      parts.visibleDescription ?? null,
    ),
    listingFeatures: [],
    photoUrls: [],
    generalCondition: null,
    exposure: null,
    outdoorSpaces: [],
    parkingTypes: [],
    // Mission 33 — délai de commercialisation. La date est publiée par le
    // portail lui-même : `datePosted` (schema.org), `creationDate`… Elle est
    // conservée telle quelle, et les jours en sont déduits pour préremplir le
    // champ que le conseiller saisissait à la main. Date absente → les deux
    // restent nuls : on ne devine pas une durée.
    listingPublishedAt: publishedAt,
    daysOnMarket: daysOnMarketSince(publishedAt),
  };
  // A description that is just the portal's generic slogan is not usable.
  if (data.listingDescription && isGenericTitle(data.listingDescription, source)) {
    data.listingDescription = null;
  }

  // Photos are only kept when the page really looks like a listing (see above).
  data.photoUrls = hasListingSignal(data) ? candidatePhotos : [];

  // Caractéristiques affichées par le portail. Celles qui répètent une colonne
  // dédiée (année de construction, énergie…) sont retirées de la liste libre,
  // conformément à la règle ci-dessus — mais elles restent lues plus bas, car
  // elles renseignent l'état ou les équipements.
  const visibleFeatures = parts.visibleFeatures ?? [];
  data.listingFeatures = [
    ...buildFeatures(ordered),
    ...visibleFeatures.filter((feature) => !isDedicatedColumnLine(feature)),
  ];
  data.listingFeatures = [...new Set(data.listingFeatures)];

  // Deterministic mapping of structured characteristics from the accessible text.
  const mapped = mapComparableCharacteristics({
    features: [...data.listingFeatures, ...visibleFeatures],
    description: data.listingDescription,
    title: data.title,
  });
  data.generalCondition = mapped.generalCondition;
  data.exposure = mapped.exposure;
  data.outdoorSpaces = mapped.outdoorSpaces;
  data.parkingTypes = mapped.parkingTypes;

  const foundFields: string[] = [];
  const missingFields: string[] = [];
  for (const field of SUMMARY_FIELDS) {
    if (data[field] !== null) {
      foundFields.push(field);
    } else {
      missingFields.push(field);
    }
  }
  if (data.photoUrls.length > 0) {
    foundFields.push('photoUrls');
  } else {
    missingFields.push('photoUrls');
  }

  return { data, foundFields, missingFields };
}

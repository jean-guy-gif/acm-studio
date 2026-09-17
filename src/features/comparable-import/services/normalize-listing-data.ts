import type { ExtractedParts } from '@/features/comparable-import/services/extract-listing-data';
import type {
  ImportedComparableData,
  PartialListingData,
} from '@/features/comparable-import/types';
import { mapComparableCharacteristics } from '@/features/comparable-import/services/map-comparable-characteristics';
import { selectListingDescription } from '@/features/comparable-import/services/select-listing-description';
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
  // Mission 48 : suggestions d'extérieurs (proposées, pas cochées) — dérivées, pas
  // piochées dans un extracteur.
  | 'outdoorSuggestions'
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
  'floor',
  'floorsCount',
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

// Recette du 19/08 — le prix lu n'était pas celui de l'annonce.
//
// Green Acres : 6 490 000 € au lieu de 5 490 000 €. Belles Demeures collé : 30 €
// au lieu de 3 300 000 €. Même cause dans les deux cas : la page affiche aussi
// « Nos annonces similaires », et nos lecteurs y puisaient.
//
// La parade ne devine rien : le portail publie LUI-MÊME son prix au m². Le bon
// prix est celui qui, divisé par la surface, retombe sur ce prix au m². Sur la
// page Green Acres, 5 490 000 / 367 = 14 959 €/m² — exactement ce que le portail
// affiche ; 6 490 000 en donnerait 17 684, soit le chiffre erroné qui remontait
// jusqu'à la fourchette recommandée au conseiller.
//
// Écart toléré : 8 %, pour absorber les arrondis d'affichage. Si AUCUN candidat
// ne concorde, on garde l'ordre de priorité habituel — mieux vaut un prix
// discutable, que le conseiller voit et peut corriger, qu'aucun prix.
const PRICE_COHERENCE_TOLERANCE = 0.08;

function pickCoherentPrice(
  sources: readonly PartialListingData[],
  pricePerSquareMeter: number | null,
  surfaceArea: number | null,
): number | null {
  const candidates = sources
    .map((source) => source.price)
    .filter((value): value is number => typeof value === 'number' && value > 0);
  if (candidates.length === 0) {
    return null;
  }
  if (
    pricePerSquareMeter == null ||
    pricePerSquareMeter <= 0 ||
    surfaceArea == null ||
    surfaceArea <= 0
  ) {
    return candidates[0];
  }

  const expected = pricePerSquareMeter * surfaceArea;
  let best: number | null = null;
  let bestGap = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const gap = Math.abs(candidate - expected) / expected;
    if (gap <= PRICE_COHERENCE_TOLERANCE && gap < bestGap) {
      best = candidate;
      bestGap = gap;
    }
  }

  // Aucun candidat ne concorde : le prix trouvé n'est pas celui de l'annonce.
  // On préfère NE RIEN pré-remplir plutôt que de laisser un chiffre faux couler
  // jusqu'à la fourchette recommandée. Le champ apparaît alors dans « à
  // compléter », et le prix au m² du portail reste affiché pour le retrouver.
  // C'est le cas relevé le 19/08 : 6 490 000 € donnait 17 684 €/m² quand le
  // portail affichait 14 959 €/m².
  return best;
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

// Mission 49 — le choix de la description (« la plus longue » remplacé par le choix
// par provenance) vit désormais dans select-listing-description.

function hostOf(url: string, baseUrl: string): string | null {
  try {
    return new URL(url, baseUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}

// Garde les adresses encastrées servies par le MÊME hébergeur que la photo de
// référence. Sans photo de référence, on ne devine rien : aucune photo.
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

// Mission 49 — les portails à carrousel de voisins (mesurés) : chez eux, les lecteurs
// pleine page (html/jsonLd) rapportent les photos ET la description d'un autre bien.
// Pour eux, on ne collecte les photos QUE de sources cadrées à l'annonce. Ailleurs
// (portail inconnu, sans carrousel connu), la page EST l'annonce : pipeline complet.
const CADRE_PORTALS = new Set(['Green Acres', "Bien'ici", 'SeLoger', 'Maisons et Appartements']);

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

  // Le prix est le seul champ que l'on ne prend pas « au premier trouvé » : il
  // est recoupé avec le prix au m² publié par le portail (voir ci-dessus).
  merged.price = pickCoherentPrice(
    ordered,
    num(merged.portalPricePerSquareMeter),
    num(merged.surfaceArea),
  );

  // Mission 49 — les photos, comme la description, se collectent DANS le bloc de
  // l'annonce, jamais sur la page (SeLoger importait 8 photos de voisins sur 12 ; le
  // lecteur html rapportait 101 balises <img> chez Bien'ici, dont tout le carrousel).
  // Chez les portails à carrousel, on ne verse donc QUE des sources cadrées :
  //   - parts.portal.photoUrls : cadrées par l'extracteur (Green Acres par advert-id,
  //     Maisons et Appartements par l'id de groupe de l'image principale) ;
  //   - parts.openGraph.photoUrls : la couverture og, métadonnée de page (§2) ;
  //   - parts.embeddedPhotoUrls : la galerie encastrée, lue sur la SEULE tranche de
  //     l'annonce (extract-listing-data ne la lit plus que là).
  // Chez un portail inconnu (pas de carrousel connu), la page EST l'annonce : on garde
  // le pipeline complet (jsonLd/html inclus, filtre d'hébergeur). Fail-closed : rien
  // d'identifiable → aucune photo, journalisé — une vignette vide est honnête, la
  // cuisine du voisin est une affirmation fausse devant un vendeur.
  const referencePhotos = [
    ...(parts.portal.photoUrls ?? []),
    ...(parts.openGraph.photoUrls ?? []),
  ].filter((url) => !isGenericImageUrl(url));
  let scopedPhotos: string[];
  if (CADRE_PORTALS.has(source)) {
    // La galerie encastrée est déjà cadrée à la tranche de l'annonce ; on la retient
    // chez le MÊME hébergeur que la couverture (portal / og), pour écarter l'habillage
    // partenaire d'un CDN distinct. Sans couverture de référence, on ne devine rien :
    // aucune photo (§, une vignette vide est honnête).
    scopedPhotos = [
      ...referencePhotos,
      ...galleryFromSameHosts(parts.embeddedPhotoUrls ?? [], referencePhotos, listingUrl),
    ];
  } else {
    // Portail inconnu : pipeline complet d'origine (ordre portal, jsonLd, og, html),
    // filtré par hébergeur de la première source qui fournit des photos.
    const photoGroups = [
      parts.portal.photoUrls ?? [],
      parts.jsonLd.photoUrls ?? [],
      parts.openGraph.photoUrls ?? [],
      parts.html.photoUrls ?? [],
    ].map((group) => group.filter((url) => !isGenericImageUrl(url)));
    const identifiedPhotos = photoGroups.flat();
    const reference = photoGroups.find((group) => group.length > 0) ?? [];
    scopedPhotos = galleryFromSameHosts(
      [...identifiedPhotos, ...(parts.embeddedPhotoUrls ?? [])],
      reference,
      listingUrl,
    );
  }
  const candidatePhotos = deduplicatePhotoUrls(
    keepListingPhotos(scopedPhotos, listingUrl),
    listingUrl,
  );
  if (scopedPhotos.length > 0 && candidatePhotos.length === 0) {
    console.warn(
      `[photos] ${listingUrl} — cadrage sans photo identifiable, aucune retenue (fail-closed)`,
    );
  }

  // Mission 49 — description par PROVENANCE (voir select-listing-description) : lecture
  // cadrée de l'annonce (niveau 1), sinon og (niveau 2), sinon vide. Jamais un
  // ratissage pleine page (niveau 3, supprimé) qui rapporterait un voisin.
  const selectedDescription = selectListingDescription({
    portalScoped: parts.portal.listingDescription ?? null,
    regionVisible: parts.visibleDescription ?? null,
    regionEmbedded: parts.embeddedDescription ?? null,
    ogMeta: parts.openGraph.listingDescription ?? null,
  });

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
    floor: num(merged.floor),
    floorsCount: num(merged.floorsCount),
    // Mission 48 — extérieurs mentionnés dans la prose, PROPOSÉS (voir plus bas).
    outdoorSuggestions: parts.portal.outdoorSuggestions ?? [],
    listingDescription: selectedDescription.description,
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
    // Mission 47 — formes d'ancienneté propres au portail. Seuls les extracteurs de
    // portail les renseignent (Bien'ici / Green Acres) ; ailleurs elles restent
    // nulles. Elles ne perturbent pas le chemin schema.org de SeLoger ci-dessus.
    publicationLowerBoundLabel: parts.portal.publicationLowerBoundLabel ?? null,
    modifiedAt: parts.portal.modifiedAt ?? null,
    viewCount: parts.portal.viewCount ?? null,
    viewCountSince: parts.portal.viewCountSince ?? null,
  };
  // A description that is just the portal's generic slogan is not usable.
  if (data.listingDescription && isGenericTitle(data.listingDescription, source)) {
    data.listingDescription = null;
  }
  // Mission 49 — une description vide est un résultat VALIDE (jamais un voisin en
  // repli), mais on la journalise pour que sa disparition soit visible.
  if (data.listingDescription == null) {
    console.warn(
      `[description] ${listingUrl} — aucune description cadrée retenue (provenance ${selectedDescription.provenance})`,
    );
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
  // Mission 48 — when the portal PROPOSES outdoor spaces (Green Acres, whose
  // terrace/parking live only in prose), that prose is NOT authoritative for
  // auto-checking: a « terrasse » in the description must be PROPOSED, never ticked
  // in silence (§3). So we drop the free description from the mapping in that case;
  // outdoor/parking then come only from the structured features (none, for Green
  // Acres), and the advisor ticks the suggestion. Other portals are unchanged.
  const mapped = mapComparableCharacteristics({
    features: [...data.listingFeatures, ...visibleFeatures],
    description: data.outdoorSuggestions.length > 0 ? null : data.listingDescription,
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

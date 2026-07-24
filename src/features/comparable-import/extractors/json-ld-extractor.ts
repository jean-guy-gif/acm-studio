import type { PartialListingData } from '@/features/comparable-import/types';
import { normalizeArea } from '@/features/comparable-import/utils/normalize-area';
import { normalizeCount } from '@/features/comparable-import/utils/normalize-count';
import { normalizePrice } from '@/features/comparable-import/utils/normalize-price';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

// Keys under which real listing / gallery nodes are commonly nested.
const NESTED_NODE_KEYS = [
  '@graph',
  'itemListElement',
  'item',
  'hasPart',
  'mainEntity',
  'associatedMedia',
];

function collectNodes(root: unknown, out: Record<string, unknown>[]): void {
  if (Array.isArray(root)) {
    for (const item of root) {
      collectNodes(item, out);
    }
    return;
  }
  if (isRecord(root)) {
    out.push(root);
    for (const key of NESTED_NODE_KEYS) {
      if (key in root) {
        collectNodes(root[key], out);
      }
    }
  }
}

function collectImages(image: unknown, out: string[]): void {
  if (typeof image === 'string') {
    if (image.trim() !== '') {
      out.push(image.trim());
    }
    return;
  }
  if (Array.isArray(image)) {
    for (const item of image) {
      collectImages(item, out);
    }
    return;
  }
  if (isRecord(image)) {
    const url = asString(image.url) ?? asString(image.contentUrl);
    if (url) {
      out.push(url);
    }
  }
}

// Extracts partial listing data from all <script type="application/ld+json">
// blocks. Everything is treated as unknown; invalid JSON blocks are skipped and
// never fail the whole import.
export function extractJsonLd(html: string): PartialListingData {
  const result: PartialListingData = {};
  const photos: string[] = [];
  const features: string[] = [];
  const nodes: Record<string, unknown>[] = [];

  const blockRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let block: RegExpExecArray | null;
  while ((block = blockRegex.exec(html)) !== null) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(block[1].trim());
    } catch {
      continue;
    }
    collectNodes(parsed, nodes);
  }

  for (const node of nodes) {
    if (result.title == null) {
      const title = asString(node.name) ?? asString(node.title);
      if (title) {
        result.title = title;
      }
    }
    if (result.listingDescription == null) {
      const description = asString(node.description);
      if (description) {
        result.listingDescription = description;
      }
    }
    if (result.price == null) {
      const offers = node.offers;
      const offerNode = Array.isArray(offers)
        ? offers.find(isRecord)
        : isRecord(offers)
          ? offers
          : null;
      const priceRaw = offerNode ? (offerNode.price ?? offerNode.lowPrice) : node.price;
      const price = normalizePrice(priceRaw);
      if (price != null) {
        result.price = price;
      }
    }
    const address = isRecord(node.address) ? node.address : null;
    if (address) {
      if (result.address == null) {
        const street = asString(address.streetAddress);
        if (street) {
          result.address = street;
        }
      }
      if (result.postalCode == null) {
        const postal = asString(address.postalCode);
        if (postal) {
          result.postalCode = postal;
        }
      }
      if (result.city == null) {
        const city = asString(address.addressLocality);
        if (city) {
          result.city = city;
        }
      }
    }
    if (result.surfaceArea == null) {
      const floor = node.floorSize ?? node.size;
      const raw = isRecord(floor) ? floor.value : floor;
      const surface = normalizeArea(raw);
      if (surface != null) {
        result.surfaceArea = surface;
      }
    }
    if (result.roomsCount == null) {
      const rooms = normalizeCount(node.numberOfRooms);
      if (rooms != null) {
        result.roomsCount = rooms;
      }
    }
    if (result.bedroomsCount == null) {
      const bedrooms = normalizeCount(node.numberOfBedrooms ?? node.numberOfBedroomsTotal);
      if (bedrooms != null) {
        result.bedroomsCount = bedrooms;
      }
    }
    if (result.bathroomsCount == null) {
      const bathrooms = normalizeCount(node.numberOfBathroomsTotal ?? node.numberOfBathrooms);
      if (bathrooms != null) {
        result.bathroomsCount = bathrooms;
      }
    }
    if (result.energyRating == null) {
      const energy =
        asString(node.energyEfficiencyCategory) ??
        (isRecord(node.hasEnergyEfficiencyCategory)
          ? asString(node.hasEnergyEfficiencyCategory.name)
          : null);
      if (energy) {
        result.energyRating = energy;
      }
    }
    if (result.constructionYear == null) {
      const rawYear =
        typeof node.yearBuilt === 'number' ? node.yearBuilt : Number(asString(node.yearBuilt));
      if (Number.isInteger(rawYear) && rawYear > 1000 && rawYear < 3000) {
        result.constructionYear = rawYear;
      }
    }
    const amenities = node.amenityFeature;
    if (Array.isArray(amenities)) {
      for (const amenity of amenities) {
        if (isRecord(amenity)) {
          const name = asString(amenity.name);
          if (name) {
            features.push(name);
          }
        }
      }
    }
    // Images can live under several keys depending on the schema. A bare `url` is
    // only treated as an image on an ImageObject node (never the listing page URL).
    const type = node['@type'];
    const isImageObject =
      type === 'ImageObject' || (Array.isArray(type) && type.includes('ImageObject'));
    const imageKeys = [
      'image',
      'photo',
      'photos',
      'images',
      'gallery',
      'thumbnailUrl',
      'contentUrl',
    ];
    if (isImageObject) {
      imageKeys.push('url');
    }
    for (const key of imageKeys) {
      collectImages(node[key], photos);
    }
  }

  if (photos.length > 0) {
    result.photoUrls = photos;
  }
  if (features.length > 0) {
    result.listingFeatures = features;
  }
  return result;
}

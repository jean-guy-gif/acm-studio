import {
  extractBienIci,
  isBienIci,
} from '@/features/comparable-import/extractors/bienici-extractor';
import { extractFigaro, isFigaro } from '@/features/comparable-import/extractors/figaro-extractor';
import {
  extractGreenAcres,
  isGreenAcres,
} from '@/features/comparable-import/extractors/green-acres-extractor';
import { extractHtml } from '@/features/comparable-import/extractors/html-extractor';
import { extractJsonLd } from '@/features/comparable-import/extractors/json-ld-extractor';
import { extractOpenGraph } from '@/features/comparable-import/extractors/open-graph-extractor';
import {
  extractSeLoger,
  isSeLoger,
} from '@/features/comparable-import/extractors/seloger-extractor';
import type { PartialListingData } from '@/features/comparable-import/types';
import { extractEmbeddedDescription } from '@/features/comparable-import/utils/extract-embedded-description';
import { extractEmbeddedImageUrls } from '@/features/comparable-import/utils/extract-embedded-image-urls';
import { extractListingPublishedAt } from '@/features/comparable-import/utils/extract-listing-published-at';

export type ExtractedParts = {
  portal: PartialListingData;
  jsonLd: PartialListingData;
  openGraph: PartialListingData;
  html: PartialListingData;
  // Adresses d'images trouvées dans le texte de la page hors balises <img>
  // (galeries chargées par script). Volontairement séparées : elles ne sont
  // retenues que si elles proviennent du même hébergeur que les photos déjà
  // identifiées — voir normalize-listing-data.
  embeddedPhotoUrls: string[];
  // Description longue trouvée dans les données de la page (souvent la seule
  // complète : la balise `meta` est tronquée). Voir normalize-listing-data,
  // qui retient la description la plus longue, pas la première.
  embeddedDescription: string | null;
  // Date de première mise en ligne publiée par le portail lui-même
  // (`datePosted` schema.org, `creationDate`…). C'est la source du délai de
  // commercialisation : aucun service tiers n'est interrogé.
  listingPublishedAt: string | null;
};

// Runs the domain-specific extractor (if any) plus the generic ones. The portal
// extractor has the highest priority in the merge. originalUrl is the URL the
// advisor pasted (used e.g. for SeLoger location, before any canonical redirect).
export function extractListingData(html: string, originalUrl: string): ExtractedParts {
  let hostname = '';
  try {
    hostname = new URL(originalUrl).hostname;
  } catch {
    hostname = '';
  }

  let portal: PartialListingData = {};
  if (isGreenAcres(hostname)) {
    portal = extractGreenAcres(html, originalUrl);
  } else if (isSeLoger(hostname)) {
    portal = extractSeLoger(html, originalUrl);
  } else if (isBienIci(hostname)) {
    portal = extractBienIci(html);
  } else if (isFigaro(hostname)) {
    portal = extractFigaro(html);
  }

  return {
    portal,
    jsonLd: extractJsonLd(html),
    openGraph: extractOpenGraph(html),
    html: extractHtml(html),
    embeddedPhotoUrls: extractEmbeddedImageUrls(html),
    embeddedDescription: extractEmbeddedDescription(html),
    listingPublishedAt: extractListingPublishedAt(html),
  };
}

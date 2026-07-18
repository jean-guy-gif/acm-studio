import {
  extractBienIci,
  isBienIci,
} from '@/features/comparable-import/extractors/bienici-extractor';
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

export type ExtractedParts = {
  portal: PartialListingData;
  jsonLd: PartialListingData;
  openGraph: PartialListingData;
  html: PartialListingData;
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
  }

  return {
    portal,
    jsonLd: extractJsonLd(html),
    openGraph: extractOpenGraph(html),
    html: extractHtml(html),
  };
}

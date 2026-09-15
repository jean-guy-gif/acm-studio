import { describe, expect, it } from 'vitest';

import { extractListingData } from '@/features/comparable-import/services/extract-listing-data';
import { normalizeListingData } from '@/features/comparable-import/services/normalize-listing-data';

// NON-REGRESSION (Mission 47, the main risk of this commit): the new French text
// readers (Bien'ici « Publiée il y a… » / « Modifiée le… », Green Acres « Vu … fois
// depuis le… ») must NEITHER overwrite NOR disturb the existing schema.org path.
//
// They live in the Bien'ici / Green Acres portal extractors, which are dispatched by
// hostname — so on a SeLoger page they never run. We prove it by INJECTING those
// French phrases into a SeLoger page: the schema.org datePosted must still win, and
// no French-derived field may appear.
describe('SeLoger schema.org date is untouched by the new French readers', () => {
  const SELOGER_HTML = `
    <html><head>
      <script type="application/ld+json">
        {"@type":"Residence","datePosted":"2026-07-10T07:32:00.000Z"}
      </script>
    </head><body>
      <div>Prix 335 000 €</div>
      <!-- phrases that belong to OTHER portals, injected on purpose -->
      <span>Publiée il y a plus de 2 mois</span>
      <span>Vu 269 fois depuis le 23/07/2026</span>
      <span>Modifiée le 29 août 2026</span>
    </body></html>`;

  it('keeps datePosted as the publication date and reads no French-derived field', () => {
    const parts = extractListingData(
      SELOGER_HTML,
      'https://www.seloger.com/annonces/achat/appartement/nice-06000/26ZEJMLWB13Y',
    );
    const { data } = normalizeListingData(parts, 'https://www.seloger.com/x', 'SeLoger');

    // schema.org datePosted, unchanged.
    expect(data.listingPublishedAt).toBe('2026-07-10T07:32:00.000Z');
    // The French readers did not run (wrong portal): all their fields stay null.
    expect(data.publicationLowerBoundLabel).toBeNull();
    expect(data.viewCount).toBeNull();
    expect(data.viewCountSince).toBeNull();
    expect(data.modifiedAt).toBeNull();
  });
});

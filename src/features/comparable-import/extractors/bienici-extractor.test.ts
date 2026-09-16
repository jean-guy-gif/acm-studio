import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { extractBienIci } from '@/features/comparable-import/extractors/bienici-extractor';

// Real page measured on 16/09/2026 (bienici.com/annonce/vente/antibes/appartement/
// 4pieces/iad-france-1010343). A RECENT listing: Bien'ici prints exact dates.
// « Publiée le 8 sept. 2026 » / « Modifiée le 9 sept. 2026 ». The SAME page also
// carries « Date de réalisation du DPE : 13 juillet 2026 » in an identical
// labelInfo block — the trap this reader must never fall into.
const antibesHtml = readFileSync(join(__dirname, '__fixtures__', 'bienici-antibes.html'), 'utf8');

describe('extractBienIci', () => {
  it('real Antibes page: reads « Publiée le 8 sept. 2026 » and « Modifiée le 9 sept. 2026 »', () => {
    const data = extractBienIci(antibesHtml);
    expect(data.listingPublishedAt).toBe('2026-09-08T00:00:00.000Z');
    expect(data.modifiedAt).toBe('2026-09-09T00:00:00.000Z');
    // A lower bound is only for older listings — this one has an exact date.
    expect(data.publicationLowerBoundLabel).toBeUndefined();
  });

  it('never reads the DPE date (13 juillet 2026) as the listing date', () => {
    const data = extractBienIci(antibesHtml);
    // The DPE realisation date lives in an identical labelInfo block; anchoring on
    // the PHRASE (never « a French date ») keeps it out of both dated fields.
    expect(data.listingPublishedAt).not.toBe('2026-07-13T00:00:00.000Z');
    expect(data.modifiedAt).not.toBe('2026-07-13T00:00:00.000Z');
  });

  it('phrase-anchored: a DPE date next to « Publiée le » is never confused for it', () => {
    const html = `
      <section class="detailsSection detailsSection_aboutThisAd">
        <div class="labelInfo"><span>Date de réalisation du DPE&nbsp;: 13 juillet 2026</span></div>
        <div class="labelInfo"><span>Publiée le 8&nbsp;sept. 2026</span></div>
        <div class="labelInfo"><span>Modifiée le 9&nbsp;sept. 2026</span></div>
      </section>`;
    const data = extractBienIci(html);
    expect(data.listingPublishedAt).toBe('2026-09-08T00:00:00.000Z');
    expect(data.modifiedAt).toBe('2026-09-09T00:00:00.000Z');
  });
  it('returns nothing for the JS-rendered shell (no embedded ad data)', () => {
    const shell =
      '<html><body><div id="app"></div><script id="js-alternatives">[]</script></body></html>';
    const data = extractBienIci(shell);
    expect(data.price).toBeUndefined();
    expect(data.surfaceArea).toBeUndefined();
    expect(data.city).toBeUndefined();
  });

  it('reads an embedded ad JSON when present', () => {
    const html = `<script type="application/json" data-ad>{"price":455000,"surfaceArea":72,"roomsQuantity":3,"city":"Antibes"}</script>`;
    const data = extractBienIci(html);
    expect(data.price).toBe(455000);
    expect(data.surfaceArea).toBe(72);
    expect(data.roomsCount).toBe(3);
    expect(data.city).toBe('Antibes');
  });

  it('reads the lower-bound « Publiée il y a plus de 2 mois » (verbatim) and « Modifiée le 29 août 2026 »', () => {
    const html = `
      <span class="date-published">Publiée il y a plus de 2 mois</span>
      <span class="date-modified">Modifiée le 29 août 2026</span>
      <script type="application/json" data-ad>{"price":455000}</script>`;
    const data = extractBienIci(html);
    expect(data.publicationLowerBoundLabel).toBe('plus de 2 mois');
    expect(data.modifiedAt).toBe('2026-08-29T00:00:00.000Z');
    // A lower bound is NEVER an exact publication date.
    expect(data.listingPublishedAt).toBeUndefined();
  });
});

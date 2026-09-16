import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { extractGreenAcres } from '@/features/comparable-import/extractors/green-acres-extractor';
import { extractListingData } from '@/features/comparable-import/services/extract-listing-data';
import { normalizeListingData } from '@/features/comparable-import/services/normalize-listing-data';

// The REAL page measured in production on 16/09/2026 (579 984 chars), where the
// old first-match-over-the-whole-document reading shipped a wrong value. The page
// announces 349 000 € and 3 598 €/m² ; it also carries « biens similaires » cards
// (each ANOTHER listing) and a price-reduction/converter widget. The extractor
// must read the MAIN advert and nothing else.
const CAGNES_URL =
  'https://www.green-acres.fr/fr/properties/appartement/cagnes-sur-mer/A98cqw1yg8fmz1bt.htm';
const cagnesHtml = readFileSync(join(__dirname, '__fixtures__', 'green-acres-cagnes.html'), 'utf8');

// Residential fixture with the REAL Green Acres structured location sources
// (schema.org addressLocality microdata + breadcrumb). The <title> deliberately
// still contains "City/District" to prove it is NOT used for the location.
const FIXTURE = `
<title>Antibes/Ames Du Purgatoire</title>
<meta property="og:description" content="Bel appartement lumineux au calme" />
<div class="price-container"><span class="price">340&#xA0;000</span><span class="symbol">&#xA0;&#x20AC;</span></div>
<div class="surface-price">5&#xA0;070 &#x20AC;/m&#xB2;</div>
<ul itemscope itemtype="http://schema.org/BreadcrumbList">
  <li itemprop="itemListElement"><span itemprop="name">Accueil</span></li>
  <li itemprop="itemListElement"><span itemprop="name">Appartements Alpes-Maritimes</span></li>
  <li itemprop="itemListElement"><span itemprop="name">Appartements Antibes</span></li>
  <li itemprop="itemListElement"><span itemprop="name">Antibes/Ames Du Purgatoire</span></li>
</ul>
<div itemprop="addressLocality">Antibes (06600) &#x2013; quartier Ames Du Purgatoire</div>
<ul><li>57 m&#xB2; de surface habitable</li><li>3 pièces</li><li>2 chambres</li><li>1 salle de bain</li></ul>
<p>chauffage central au fuel</p>
<a data-advertid="A509112cym5e5z9p" href="#"></a>
<img src="https://lb1.green-acres.com/4221/A509112cym5e5z9p/Photos/A509112cym5e5z9p_1.jpg" />
<img src="https://lb1.green-acres.com/9999/OTHER123/miniPhotos/OTHER123_1.jpg" />
`;

// Commercial listing whose title contains a real "/" ("professionnel /
// commercial"). Reproduces the bug: the old title-split gave a false city.
const COMMERCIAL_FIXTURE = `
<title>Nice Centre – Avenue Jean Médecin - Opportunité rare – Local professionnel / commercial de 202 m²</title>
<ul itemscope itemtype="http://schema.org/BreadcrumbList">
  <li itemprop="itemListElement"><span itemprop="name">Accueil</span></li>
  <li itemprop="itemListElement"><span itemprop="name">Appartements Alpes-Maritimes</span></li>
  <li itemprop="itemListElement"><span itemprop="name">Appartements Nice</span></li>
  <li itemprop="itemListElement"><span itemprop="name">Nice Centre &#x2013; Avenue Jean M&#xE9;decin - Local professionnel / commercial de 202 m&#xB2;</span></li>
</ul>
<div itemprop="addressLocality">Nice (06000) &#x2013; quartier Musiciens</div>
`;

// Live-DOM hazard: the extension captures the HYDRATED DOM, where an EMPTY
// price-container (the price-reduction widget, before JS fills it) and a
// currency-converter number can appear BEFORE the real price, and « biens
// similaires » cards follow with their own info-price/surface. Reading any field
// by first match over the WHOLE document lets the empty span blank the price
// (production symptom) and a neighbour's number land in the advert. The extractor
// must delimit the main advert and ignore all of it.
const LIVE_DOM_HAZARD = `
<span class="sticky-price"><span class="price"></span></span>
<div class="price-reduction-graph"><div class="price-container" id="new-price"><div class="new-price"><span class="price"></span></div></div></div>
<p class="financial-value"><span class="price">4&nbsp;153</span></p>
<div class="mobile-details"><div class="price-detail">
  <div class="price-container"><span class="price">349&nbsp;000</span><span class="symbol">&nbsp;&#x20AC;</span></div>
  <div class="surface-price">3&nbsp;598 &#x20AC;/m&#xB2;</div>
</div></div>
<span class="views-count">Vu 118 fois depuis le 02/09/2026</span>
<section>
  <div class="announce-info"><span class="info-price-container"><strong class="info-price">299&nbsp;000 &#x20AC;</strong></span><div class="info-tag" title="Surface habitable">81 m&#xB2;</div></div>
</section>
`;

describe('extractGreenAcres', () => {
  it('real Cagnes page: reads the main advert price (349 000) and price/m² (3 598)', () => {
    const data = extractGreenAcres(cagnesHtml, CAGNES_URL);
    expect(data.price).toBe(349000);
    expect(data.portalPricePerSquareMeter).toBe(3598);
  });

  it('real Cagnes page: surface, rooms and city come from the main advert, not a neighbour', () => {
    const data = extractGreenAcres(cagnesHtml, CAGNES_URL);
    expect(data.surfaceArea).toBe(97); // neighbours read 81/95/68/75 m²
    expect(data.roomsCount).toBe(4);
    expect(data.city).toBe('Cagnes-sur-Mer');
  });

  it('real Cagnes page: « Vu 118 fois depuis le 02/09/2026 » — view count + exact listing date', () => {
    const data = extractGreenAcres(cagnesHtml, CAGNES_URL);
    expect(data.viewCount).toBe(118);
    expect(data.viewCountSince).toBe('2026-09-02T00:00:00.000Z');
    expect(data.listingPublishedAt).toBe('2026-09-02T00:00:00.000Z');
  });

  it('live-DOM hazard: an empty price-container first + a converter number + a neighbour never fool it', () => {
    const data = extractGreenAcres(LIVE_DOM_HAZARD);
    expect(data.price).toBe(349000); // not empty (the empty spans), not 4 153, not 299 000
    expect(data.portalPricePerSquareMeter).toBe(3598);
    expect(data.viewCount).toBe(118);
    expect(data.surfaceArea).toBeUndefined(); // the neighbour's 81 m² is cut off
  });

  it('no price-container with a value → price left empty, never an info-price fallback', () => {
    const onlySimilar =
      '<div class="announce-info"><span class="info-price-container"><strong class="info-price">299&nbsp;000 &#x20AC;</strong></span></div>';
    expect(extractGreenAcres(onlySimilar).price).toBeUndefined();
  });

  it('reads the labelled price, portal price/m², surface and rooms (not the price/m² as price)', () => {
    const data = extractGreenAcres(FIXTURE);
    expect(data.price).toBe(340000);
    expect(data.portalPricePerSquareMeter).toBe(5070);
    expect(data.surfaceArea).toBe(57);
    expect(data.roomsCount).toBe(3);
    expect(data.bedroomsCount).toBe(2);
    expect(data.bathroomsCount).toBe(1);
  });

  it('reads heating, energy source and description', () => {
    const data = extractGreenAcres(FIXTURE);
    expect(data.heatingType).toBe('central');
    expect(data.energySource).toBe('fuel');
    expect(data.listingDescription).toBe('Bel appartement lumineux au calme');
  });

  it('keeps only photos scoped to the current advert', () => {
    const data = extractGreenAcres(FIXTURE);
    expect(data.photoUrls).toEqual([
      'https://lb1.green-acres.com/4221/A509112cym5e5z9p/Photos/A509112cym5e5z9p_1.jpg',
    ]);
  });

  describe('city/district (structured sources only, never the title split)', () => {
    it('residential: reads city/district from the addressLocality microdata', () => {
      const data = extractGreenAcres(FIXTURE);
      expect(data.city).toBe('Antibes');
      expect(data.district).toBe('Ames Du Purgatoire');
    });

    it('commercial "professionnel / commercial": city from structure, never a title fragment', () => {
      const data = extractGreenAcres(COMMERCIAL_FIXTURE);
      expect(data.city).toBe('Nice');
      expect(data.district).toBe('Musiciens');
      expect(data.city).not.toContain('professionnel');
      expect(data.district).not.toContain('commercial');
    });

    it('title with several slashes and no structured source → city and district null', () => {
      const html =
        '<title>Local pro / commercial / bureaux / 200 m²</title><span class="info-price">100 000 €</span>';
      const data = extractGreenAcres(html);
      expect(data.city).toBeUndefined();
      expect(data.district).toBeUndefined();
    });

    it('falls back to the breadcrumb city when microdata is absent', () => {
      const html = `
        <title>Une annonce sans microdata</title>
        <ul itemscope itemtype="http://schema.org/BreadcrumbList">
          <li><span itemprop="name">Accueil</span></li>
          <li><span itemprop="name">Maisons Cannes</span></li>
          <li><span itemprop="name">Villa avec piscine</span></li>
        </ul>`;
      const data = extractGreenAcres(html);
      expect(data.city).toBe('Cannes');
      expect(data.district).toBeUndefined();
    });

    it('falls back to the URL city segment as a last resort', () => {
      const html = '<title>Sans localisation structurée</title>';
      const data = extractGreenAcres(
        html,
        'https://www.green-acres.fr/fr/properties/appartement/antibes/A123abc.htm',
      );
      expect(data.city).toBe('Antibes');
      expect(data.district).toBeUndefined();
    });

    it('no structured location anywhere → city and district null', () => {
      const data = extractGreenAcres('<title>Bien à vendre</title>');
      expect(data.city).toBeUndefined();
      expect(data.district).toBeUndefined();
    });

    it('rejects an ambiguous property-type word as a location', () => {
      const html = '<div itemprop="addressLocality">Local commercial</div>';
      const data = extractGreenAcres(html);
      expect(data.city).toBeUndefined();
      expect(data.district).toBeUndefined();
    });
  });
});

describe('extractGreenAcres — outdoor suggestions from the prose (Mission 48 §3)', () => {
  it('proposes the terrace with its area and the parking count, from the annonce block only', () => {
    const data = extractGreenAcres(cagnesHtml, CAGNES_URL);
    expect(data.outdoorSuggestions).toContain('terrasse (56 m²)');
    expect(data.outdoorSuggestions).toContain('2 places de parking');
    // Never a neighbour's / another block's figure (the 14 m² and the 449 000 €
    // terrace live in « biens similaires », outside mainAdvertRegion).
    expect((data.outdoorSuggestions ?? []).join(' ')).not.toContain('14 m²');
  });

  it('never auto-checks outdoor from the prose — it stays a suggestion (pipeline)', () => {
    const { data } = normalizeListingData(
      extractListingData(cagnesHtml, CAGNES_URL),
      CAGNES_URL,
      'green-acres.fr',
    );
    expect(data.outdoorSpaces).toEqual([]); // not ticked in silence
    expect(data.outdoorSuggestions).toContain('terrasse (56 m²)'); // proposed instead
  });

  it('« Structure/extérieur à restaurer » (building condition) proposes no exterior', () => {
    const html = `
      <a data-advertid="Axyz"></a>
      <div class="description-text">Maison à rénover. Structure/extérieur à restaurer. Séjour lumineux.</div>`;
    const data = extractGreenAcres(
      html,
      'https://www.green-acres.fr/fr/properties/maison/x/Axyz.htm',
    );
    expect(data.outdoorSuggestions ?? []).toEqual([]);
  });
});

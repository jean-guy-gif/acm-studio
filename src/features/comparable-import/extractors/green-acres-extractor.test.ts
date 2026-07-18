import { describe, expect, it } from 'vitest';

import { extractGreenAcres } from '@/features/comparable-import/extractors/green-acres-extractor';

// Residential fixture with the REAL Green Acres structured location sources
// (schema.org addressLocality microdata + breadcrumb). The <title> deliberately
// still contains "City/District" to prove it is NOT used for the location.
const FIXTURE = `
<title>Antibes/Ames Du Purgatoire</title>
<meta property="og:description" content="Bel appartement lumineux au calme" />
<div class="info-price-container">
  <span class="info-price">340&#xA0;000 &#x20AC;</span>
  <div class="surface-price">5&#xA0;070 &#x20AC;/m&#xB2;</div>
</div>
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

describe('extractGreenAcres', () => {
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

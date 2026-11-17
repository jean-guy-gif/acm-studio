import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { buildQrCode } from '@/features/contact-card/services/qr-code';
import { LivePageProperty } from '@/features/live-seller/components/live-page-property';
import { LiveTextsProvider } from '@/features/live-seller/components/live-texts';
import { NeighbourhoodLinkBlock } from '@/features/neighbourhood-link/components/neighbourhood-link-block';
import type { SellerPresentationProperty } from '@/features/seller-presentation/types/seller-presentation';

// Mission 157 B — le lien « Vivre ici » montré au vendeur (planches M157B-1 et M157B-2) : au Live,
// un bouton en contour sous les caractéristiques, qui ouvre un nouvel onglet ; dans les documents,
// « Ouvrir la page du quartier ↗ » à l'écran, le QR code et l'adresse à taper à l'impression, la
// date de validité quand elle est connue. Jamais le nom du service (Jean-Guy, 17/11).

const LINK = 'https://app.myacademia.ai/l/Vb4nT8wLp2';

const PROPERTY: SellerPresentationProperty = {
  propertyType: 'Maison',
  address: null,
  city: 'Vence',
  district: null,
  postalCode: '06140',
  description: null,
  surfaceArea: 135,
  roomsCount: 5,
  bedroomsCount: 4,
  floor: null,
  buildingFloors: null,
  exposure: null,
  constructionYear: null,
  generalCondition: null,
  outdoorSpaces: [],
  parkingTypes: [],
  monthlyCharges: null,
  propertyTax: null,
  energyRating: 'C',
  gesRating: null,
  heatingType: null,
  features: [],
  watchPoints: [],
  photoUrls: [],
};

const live = (
  neighbourhood: { url: string; validUntil: string | null } | null,
  language: 'fr' | 'en' = 'fr',
  asksSeller = true,
) =>
  renderToStaticMarkup(
    createElement(
      LiveTextsProvider,
      { language },
      createElement(LivePageProperty, {
        property: PROPERTY,
        summary: null,
        asksSeller,
        neighbourhood,
      }),
    ),
  );

describe('« Vivre ici » au Live, sur « Votre bien »', () => {
  it('un bouton en contour, qui ouvre le lien dans un nouvel onglet, sans dire d’où il vient', () => {
    for (const asksSeller of [true, false]) {
      const html = live({ url: LINK, validUntil: null }, 'fr', asksSeller);
      expect(html).toContain('data-testid="live-neighbourhood"');
      expect(html).toContain(`href="${LINK}"`);
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
      expect(html).toContain('Vivre ici');
      expect(html).toContain('Le quartier, les écoles, les commerces');
      expect(html.replaceAll(LINK, '')).not.toMatch(/academia/i);
      expect(html).not.toContain('btn-filled');
    }
  });

  it('en anglais', () => {
    const html = live({ url: LINK, validUntil: null }, 'en');
    expect(html).toContain('Living here');
    expect(html).toContain('The neighbourhood, schools and shops');
  });

  it('sans lien : rien', () => {
    expect(live(null)).not.toContain('live-neighbourhood');
  });
});

describe('« Vivre ici » dans la synthèse et l’Étude de marché', () => {
  const block = (validUntil: string | null, language: 'fr' | 'en' = 'fr') =>
    renderToStaticMarkup(
      createElement(NeighbourhoodLinkBlock, {
        link: { url: LINK, validUntil, qr: buildQrCode(LINK) },
        language,
      }),
    );

  it('à l’écran, « Ouvrir la page du quartier ↗ » ; à l’impression, le QR code et l’adresse à taper', () => {
    const html = block('2026-12-16T10:00:00Z');
    expect(html).toContain('Vivre ici — le quartier, les écoles, les commerces');
    expect(html).toContain('Ouvrir la page du quartier ↗');
    expect(html).toContain(`href="${LINK}"`);
    expect(html).toContain(
      'Scannez pour découvrir le quartier, ou tapez app.myacademia.ai/l/Vb4nT8wLp2',
    );
    expect(html).toContain('<svg');
    expect(html).toContain('Lien valable jusqu’au 16 décembre 2026.');
    // Le nom du service ne se dit pas : seule l'adresse du lien se voit.
    expect(html.replaceAll('app.myacademia.ai', '')).not.toMatch(/academia/i);
  });

  it('un lien collé à la main : sans date de validité', () => {
    expect(block(null)).not.toContain('valable');
  });

  it('en anglais', () => {
    const html = block('2026-12-16T10:00:00Z', 'en');
    expect(html).toContain('Open the neighbourhood page ↗');
    expect(html).toContain('Scan to discover the neighbourhood, or type');
    expect(html).toContain('Link valid until 16 December 2026.');
  });
});

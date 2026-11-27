import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LiveComparableHeader } from '@/features/live-seller/components/live-comparable-header';
import { LiveTextsProvider } from '@/features/live-seller/components/live-texts';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import type { TextLanguage } from '@/lib/client-texts';

// Lot A (Jean-Guy, 27/11) — sur chaque écran d'un concurrent, la ville n'est écrite qu'une fois :
// « Maison · 5 pièces · 135 m² · Saint-Paul-de-Vence », puis plus « Saint-Paul-de-Vence » dessous.
const render = (city: string | null, district: string | null, language: TextLanguage = 'fr') => {
  const heading = neutralComparableLabel(
    { propertyType: 'house', roomsCount: 5, surfaceArea: 135, city, district },
    language,
  );
  return renderToStaticMarkup(
    createElement(
      LiveTextsProvider,
      { language },
      createElement(LiveComparableHeader, { heading, city, district }),
    ),
  );
};
const count = (html: string, text: string) => html.split(text).length - 1;

describe('l’en-tête d’un concurrent au Live', () => {
  it('sans quartier : la ville une fois, dans le titre, et pas de ligne dessous', () => {
    const html = render('Saint-Paul-de-Vence', null);
    expect(count(html, 'Saint-Paul-de-Vence')).toBe(1);
    expect(html).not.toContain('<p');
  });

  it('avec un quartier : le quartier dans le titre, la ville une fois dessous', () => {
    const html = render('Vence', 'Centre-ville');
    expect(count(html, 'Centre-ville')).toBe(1);
    expect(count(html, 'Vence')).toBe(1);
    expect(html).toMatch(/<p[^>]*>Vence<\/p>/);
  });

  it('en anglais, la même règle', () => {
    expect(count(render('Saint-Paul-de-Vence', null, 'en'), 'Saint-Paul-de-Vence')).toBe(1);
  });

  it('ni ville ni quartier : « Localisation inconnue », comme avant', () => {
    expect(render(null, null)).toContain('Localisation inconnue');
    expect(render(null, null, 'en')).toContain('Location unknown');
  });
});

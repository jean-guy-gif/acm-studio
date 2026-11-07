import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  groupDigits,
  PriceInput,
  priceDigits,
} from '@/features/live-seller/components/price-input';

// Mission 143 (I6) — un prix se lit pendant la frappe : « 790 000 », jamais « 790000 » ; la valeur
// envoyée reste le nombre entier.
describe('la saisie d’un prix dans le Live', () => {
  it('ne garde que les chiffres, sans zéro de tête, dix au plus', () => {
    expect(priceDigits('790 000 €')).toBe('790000');
    expect(priceDigits('00790000')).toBe('790000');
    expect(priceDigits('0')).toBe('0');
    expect(priceDigits('abc')).toBe('');
    expect(priceDigits('12345678901234')).toBe('1234567890');
  });

  it('groupe les milliers selon la langue', () => {
    expect(groupDigits('790000', 'fr')).toBe('790\u202f000');
    expect(groupDigits('1639500', 'fr')).toBe('1\u202f639\u202f500');
    expect(groupDigits('1639500', 'en')).toBe('1,639,500');
    expect(groupDigits('950', 'fr')).toBe('950');
  });

  it('un champ texte au clavier numérique, la valeur entière dans le champ envoyé', () => {
    const html = renderToStaticMarkup(
      createElement(PriceInput, {
        name: 'estimatedPrice',
        language: 'fr',
        className: 'x',
        required: true,
        defaultValue: 790000,
      }),
    );
    expect(html).toContain('inputMode="numeric"');
    expect(html).toContain('value="790\u202f000"');
    expect(html).toContain('type="hidden" name="estimatedPrice" value="790000"');
    expect(html).toContain('data-price-required="true"');
    expect(html).not.toContain('type="number"');
  });
});

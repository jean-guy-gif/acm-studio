import { describe, expect, it } from 'vitest';

import { parseComparableForm } from '@/features/comparables/utils/comparable-input';

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

describe('parseComparableForm', () => {
  it('accepts a valid form and parses typed fields', () => {
    const result = parseComparableForm(
      form({
        title: 'Bel appartement',
        price: '250000',
        surface_area: '60',
        rooms_count: '3',
        city: 'Lyon',
        listing_features: 'Balcon\nParking\nBalcon',
        photo_urls: JSON.stringify([
          'https://example.com/a.jpg',
          'not-a-url',
          'https://example.com/a.jpg',
        ]),
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.price).toBe(250000);
      expect(result.input.surface_area).toBe(60);
      expect(result.input.rooms_count).toBe(3);
      expect(result.input.city).toBe('Lyon');
      // Deduplicated features, absolute-URL-only photos.
      expect(result.input.listing_features).toEqual(['Balcon', 'Parking']);
      expect(result.input.photo_urls).toEqual(['https://example.com/a.jpg']);
    }
  });

  it('accepts a manually entered photo list (one URL per line), filtered + deduped', () => {
    const result = parseComparableForm(
      form({
        price: '250000',
        photo_urls:
          'https://example.com/a.jpg\nftp://bad/x\nhttps://example.com/a.jpg\nhttps://example.com/b.jpg',
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.photo_urls).toEqual([
        'https://example.com/a.jpg',
        'https://example.com/b.jpg',
      ]);
    }
  });

  it('accepts valid structured characteristics (condition, exposure, multi outdoor/parking)', () => {
    const fd = new FormData();
    fd.set('price', '250000');
    fd.set('general_condition', 'good');
    fd.set('exposure', 'south');
    fd.append('outdoor_spaces', 'balcony');
    fd.append('outdoor_spaces', 'terrace');
    fd.append('parking_types', 'garage');
    fd.append('parking_types', 'outdoor_parking');
    const result = parseComparableForm(fd);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.general_condition).toBe('good');
      expect(result.input.exposure).toBe('south');
      expect(result.input.outdoor_spaces).toEqual(['balcony', 'terrace']);
      expect(result.input.parking_types).toEqual(['garage', 'outdoor_parking']);
    }
  });

  it('normalises empty structured fields to null / []', () => {
    const result = parseComparableForm(
      form({ price: '250000', general_condition: '', exposure: '' }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.general_condition).toBeNull();
      expect(result.input.exposure).toBeNull();
      expect(result.input.outdoor_spaces).toEqual([]);
      expect(result.input.parking_types).toEqual([]);
    }
  });

  it('rejects "aucun" combined with another outdoor value', () => {
    const fd = new FormData();
    fd.set('price', '250000');
    fd.append('outdoor_spaces', 'none');
    fd.append('outdoor_spaces', 'balcony');
    const result = parseComparableForm(fd);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors).toHaveProperty('outdoor_spaces');
  });

  it('rejects an invalid condition / exposure and drops unknown array values', () => {
    expect(parseComparableForm(form({ price: '250000', general_condition: 'ruined' })).ok).toBe(
      false,
    );
    expect(parseComparableForm(form({ price: '250000', exposure: 'up' })).ok).toBe(false);
    const fd = new FormData();
    fd.set('price', '250000');
    fd.append('outdoor_spaces', 'balcony');
    fd.append('outdoor_spaces', 'not-a-real-value');
    const result = parseComparableForm(fd);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.input.outdoor_spaces).toEqual(['balcony']);
  });

  it('reports a field error on price when it is missing', () => {
    const result = parseComparableForm(form({ surface_area: '60' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.price).toBeDefined();
      // The general summary mirrors the price error.
      expect(result.error).toBe(result.fieldErrors.price);
    }
  });

  it('attributes a numeric error to the specific invalid field', () => {
    const result = parseComparableForm(form({ price: '250000', surface_area: '-5' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.surface_area).toBeDefined();
      expect(result.fieldErrors.price).toBeUndefined();
    }
  });

  it('accumulates errors across several invalid fields', () => {
    const result = parseComparableForm(
      form({ price: '-1', surface_area: '-5', rooms_count: '-2' }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.fieldErrors).sort()).toEqual(
        ['price', 'rooms_count', 'surface_area'].sort(),
      );
      // A rejected negative price is a "positive value" error, not "required".
      expect(result.fieldErrors.price).toContain('positif');
    }
  });

  it('accepts a form with only the required price', () => {
    const result = parseComparableForm(form({ price: '199000' }));
    expect(result.ok).toBe(true);
  });
});

// Mission 33 — la date de mise en ligne vient de l'annonce, jamais d'une saisie.
describe('parseComparableForm — délai de commercialisation', () => {
  // Un délai daté du jour de l'import serait périmé le jour du rendez-vous :
  // c'est la date qu'on conserve, et le nombre de jours s'en déduit à l'affichage.
  it('conserve la date quand le délai affiché en découle', () => {
    const publishedAt = new Date(Date.now() - 131 * 86_400_000).toISOString();
    const result = parseComparableForm(
      form({ price: '303000', listing_published_at: publishedAt, days_on_market: '131' }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.listing_published_at).toBe(publishedAt);
      expect(result.input.days_on_market).toBe(131);
    }
  });

  // Le conseiller a le dernier mot : s'il corrige le délai, la date du portail
  // ne doit pas reprendre la main au moment du Live et effacer sa correction.
  it('écarte la date quand le conseiller corrige le délai', () => {
    const publishedAt = new Date(Date.now() - 131 * 86_400_000).toISOString();
    const result = parseComparableForm(
      form({ price: '303000', listing_published_at: publishedAt, days_on_market: '45' }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.listing_published_at).toBeNull();
      expect(result.input.days_on_market).toBe(45);
    }
  });

  it('ignore une date illisible sans rejeter le formulaire', () => {
    const result = parseComparableForm(
      form({ price: '303000', listing_published_at: 'avant-hier' }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.listing_published_at).toBeNull();
    }
  });
});

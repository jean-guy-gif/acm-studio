import { describe, expect, it } from 'vitest';

import { idealPageLayout, type PageEntry } from '@/features/ideal-properties/services/ideal-page';
import type { SelectionItemInput } from '@/features/ideal-properties/services/ideal-selection';

// Essai de Jean-Guy (26/10) — sur Biens idéaux, un même bien n'apparaît qu'une fois.
const SELOGER = 'https://www.seloger.com/annonces/achat/maison/mougins-06/26ZEJMLWB13Y.htm';
const SELOGER_TRACKED = `${SELOGER}?utm_source=stream`;
const OTHER = 'https://www.seloger.com/annonces/achat/maison/mougins-06/27ABCDEFGH12.htm';

const item = (source: SelectionItemInput['source'], reference: string): SelectionItemInput => ({
  source,
  reference,
  label: `${source} ${reference}`,
  listedPrice: 1_000_000,
  category: source === 'listing' ? 'strong' : 'agency',
  gaps: [],
  snapshot: null,
});
const entry = (value: SelectionItemInput, listingUrl: string | null): PageEntry => ({
  item: value,
  listingUrl,
});

describe('Biens idéaux : un bien n’apparaît qu’une fois', () => {
  it('le bandeau : la sélection retenue, puis les biens cochés depuis, sans doublon', () => {
    const mandate = item('project', 'p1');
    const listing = item('listing', OTHER);
    const { banner } = idealPageLayout({
      baseline: [mandate],
      selected: [mandate, listing],
      agency: [],
    });
    expect(banner).toEqual([mandate, listing]);
  });

  it('un bien du bandeau ne se répète ni dans l’agence ni dans le marché', () => {
    const mandate = item('project', 'p1');
    const listing = item('listing', OTHER);
    const layout = idealPageLayout({ baseline: [mandate, listing], selected: [], agency: [] });
    expect(layout.showAgency(entry(mandate, null))).toBe(false);
    expect(layout.showMarket(entry(listing, OTHER))).toBe(false);
    expect(layout.showAgency(entry(item('project', 'p2'), null))).toBe(true);
  });

  it('une annonce du marché que l’agence connaît comme concurrent ne s’affiche qu’une fois, côté agence', () => {
    const competitor = entry(item('competitor', 'c1'), SELOGER);
    const layout = idealPageLayout({ baseline: [], selected: [], agency: [competitor] });
    // La même annonce publiée, même avec des paramètres de suivi.
    expect(layout.showMarket(entry(item('listing', SELOGER_TRACKED), SELOGER_TRACKED))).toBe(false);
    expect(layout.showAgency(competitor)).toBe(true);
    expect(layout.showMarket(entry(item('listing', OTHER), OTHER))).toBe(true);
  });

  it('retenue comme annonce du marché, la même annonce ne revient pas comme concurrent', () => {
    const competitor = entry(item('competitor', 'c1'), SELOGER);
    const layout = idealPageLayout({
      baseline: [item('listing', SELOGER)],
      selected: [],
      agency: [competitor],
    });
    expect(layout.showAgency(competitor)).toBe(false);
  });

  it('une annonce non reconnue n’est rapprochée de rien', () => {
    const layout = idealPageLayout({
      baseline: [],
      selected: [],
      agency: [entry(item('competitor', 'c1'), 'https://exemple.invalid/a')],
    });
    expect(
      layout.showMarket(
        entry(item('listing', 'https://exemple.invalid/a'), 'https://exemple.invalid/a'),
      ),
    ).toBe(true);
  });
});

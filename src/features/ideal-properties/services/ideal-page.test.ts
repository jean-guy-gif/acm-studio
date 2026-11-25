import { describe, expect, it } from 'vitest';

import {
  idealPageLayout,
  marketBienId,
  notRepeatedFrom,
  type PageEntry,
} from '@/features/ideal-properties/services/ideal-page';
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

// Lancement, mission 3 (suite, 25/11) — vu sur un vrai dossier : la recherche du marché rend un
// bien que la veille a déjà trouvé, sous une AUTRE annonce (le même bien chez le fournisseur).
describe('Biens idéaux : un bien de la veille ne se répète pas dans le marché', () => {
  const WATCH_AD = 'https://www.bienici.com/annonce/vente/mouans-sartoux/maison/11pieces/ag-1';
  const MARKET_AD = 'https://www.bienici.com/annonce/vente/mouans-sartoux/maison/11pieces/ag-2';
  const watch = [{ url: WATCH_AD, key: 'b3733e06' }];

  it('la même annonce : une seule fois (comme avant)', () => {
    expect(notRepeatedFrom(watch)({ url: WATCH_AD, key: null })).toBe(false);
  });

  it('une autre annonce du même bien chez le fournisseur : une seule fois', () => {
    expect(notRepeatedFrom(watch)({ url: MARKET_AD, key: 'b3733e06' })).toBe(false);
  });

  it('un autre bien reste dans le marché', () => {
    expect(notRepeatedFrom(watch)({ url: MARKET_AD, key: '735ba130' })).toBe(true);
  });

  it('sans identifiant du fournisseur, seule l’annonce compte : deux biens sans identifiant ne se confondent pas', () => {
    const unknown = [{ url: WATCH_AD, key: null }];
    expect(notRepeatedFrom(unknown)({ url: MARKET_AD, key: null })).toBe(true);
    expect(notRepeatedFrom(unknown)({ url: MARKET_AD, key: 'b3733e06' })).toBe(true);
  });

  it('un bien se compte une fois : par son identifiant chez le fournisseur, sinon par son annonce', () => {
    expect(marketBienId({ url: WATCH_AD, key: 'b3733e06' })).toBe(
      marketBienId({ url: MARKET_AD, key: 'b3733e06' }),
    );
    expect(marketBienId({ url: WATCH_AD, key: null })).not.toBe(
      marketBienId({ url: MARKET_AD, key: null }),
    );
    // Une annonce ne se confond jamais avec un identifiant.
    expect(marketBienId({ url: 'b3733e06', key: null })).not.toBe(
      marketBienId({ url: MARKET_AD, key: 'b3733e06' }),
    );
  });
});

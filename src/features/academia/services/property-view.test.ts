import { describe, expect, it } from 'vitest';

import { parsePropertyView } from '@/features/academia/services/property-view';
import realView from '@/test-fixtures/academia-vue-bien.json';

// Mission 158 — la vue « bien » d'Academia, relue champ par champ, sur la vraie réponse de l'API
// d'essai (dossier de démonstration, données fictives, 17/11).
describe('parsePropertyView', () => {
  const view = parsePropertyView(realView);

  it('lit les ventes : le rayon de la liste, les rayons cumulés, la vente à l’adresse, la liste', () => {
    expect(view?.sales).toMatchObject({
      ok: true,
      source: 'DVF (DGFiP), ventes de logements anciens',
      date: '2026-10-07',
      type: 'maison',
      rooms: 5,
      since: 2021,
      listRadius: 250,
      atAddress: { date: '2022-04-28', price: 524950, surface: 65, rooms: 3 },
    });
    expect(view?.sales?.rings).toEqual([
      { radius: 50, sales: 1 },
      { radius: 100, sales: 1 },
      { radius: 250, sales: 11 },
      { radius: 300, sales: 14 },
      { radius: 500, sales: 27 },
      { radius: 800, sales: 77 },
    ]);
    expect(view?.sales?.list).toHaveLength(11);
    expect(view?.sales?.list[0]).toEqual({
      date: '2025-11-06',
      price: 876800,
      surface: 118,
      rooms: 5,
      land: 628,
      pricePerSquareMeter: 7431,
      distance: 120,
      street: 'Boulevard Marechal Juin',
    });
  });

  it('range la valeur indicative à part, avec sa mention mot pour mot', () => {
    expect(view?.indicative).toEqual({
      low: 955000,
      high: 1060000,
      middle: 980000,
      pricePerSquareMeter: 7263,
      reliability: 'moyenne',
      mention: 'Valeur indicative : elle ne remplace pas un avis de valeur.',
      date: '2026-11-17',
    });
  });

  it('lit les autres blocs, chacun avec sa source, sa date et sa note', () => {
    expect(view?.dpe).toMatchObject({ ok: true, latest: { label: 'E', matches: false } });
    expect(view?.planning?.sentence).toMatch(/^Rien de relevé sur la parcelle/);
    expect(view?.planning?.elements).toHaveLength(3);
    expect(view?.permits).toMatchObject({ radius: 300, demolitionUnchecked: true });
    expect(view?.permits?.build).toHaveLength(2);
    expect(view?.risks).toMatchObject({
      clay: 'Exposition moyenne',
      earthquake: '4 - MOYENNE',
      radon: '1',
      disasters: { count: 2, latest: '2023-03-31' },
      planningZone: 'Zone UF : zones pavillonnaires',
    });
    expect(view?.population).toMatchObject({ inhabitants: 1120, households: 500 });
    expect(view?.condominium).toMatchObject({ dwellingLots: 6, builtPeriod: '1975-1993' });
  });

  it('liste d’autorisation : un champ inconnu ne passe jamais ; une valeur douteuse vaut « absent »', () => {
    const trap = structuredClone(realView) as Record<string, unknown> & {
      blocs: Record<string, Record<string, unknown>>;
    };
    trap.blocs.ventes.liste = [
      { date: '2025-01-01', prix: 'cher', rue: 'X' },
      { date: '2025-02-01', prix: 700000, numero: '12', proprietaire: 'M. Piège' },
    ];
    trap.blocs.estimation.etat = 'erreur';
    trap.blocs.secret = { cle: 'msk_piege' };
    const parsed = parsePropertyView(trap);
    expect(parsed?.sales?.list).toHaveLength(1);
    expect(JSON.stringify(parsed)).not.toMatch(/Piège|msk_piege|proprietaire|numero/);
    // Une valeur indicative que la source dit en échec n'est pas montrée.
    expect(parsed?.indicative).toBeNull();
  });

  it('une réponse sans blocs n’est pas une vue', () => {
    expect(parsePropertyView(null)).toBeNull();
    expect(parsePropertyView({ dossier: { id: 'x' } })).toBeNull();
  });
});

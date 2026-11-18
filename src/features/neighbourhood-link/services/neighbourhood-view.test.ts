import { describe, expect, it } from 'vitest';

import { parseNeighbourhoodBlocks } from '@/features/neighbourhood-link/services/neighbourhood-blocks';
import { neighbourhoodView } from '@/features/neighbourhood-link/services/neighbourhood-view';
import { CLIENT_TEXTS } from '@/lib/client-texts';
import clientView from '@/test-fixtures/academia-vue-bien-client.json';

// Mission 159 — les textes vus par le vendeur, recomposés depuis les chiffres de la vraie vue
// « bien-client » (dossier de démonstration, 17/11), en français et en anglais (Jean-Guy, 17/11).
const blocks = parseNeighbourhoodBlocks(clientView)!;
const fr = (key: Parameters<typeof neighbourhoodView>[1]) =>
  neighbourhoodView(blocks, key, CLIENT_TEXTS.fr, 'fr');
const en = (key: Parameters<typeof neighbourhoodView>[1]) =>
  neighbourhoodView(blocks, key, CLIENT_TEXTS.en, 'en');
const NB = ' ';
// Le séparateur des milliers en français : l'espace fine insécable.
const THIN = '\u202f';

describe('le quartier, dit au vendeur', () => {
  it('l’urbanisme : « Rien de relevé », chaque fait avec sa distance', () => {
    const view = fr('urbanisme');
    expect(view).toMatchObject({
      kind: 'rings',
      headline: `Rien de relevé sur votre parcelle, ni à moins de 40${NB}m.`,
      scale: `Autour du bien, à moins de 300${NB}m`,
      inner: { count: 'rien de relevé', hit: false },
      outer: {
        count: '3',
        label: 'éléments relevés',
        sub: `le plus proche à 153${NB}m`,
        hit: true,
      },
    });
    expect(view?.kind === 'rings' && view.legend[2]?.text).toBe(
      `3 emplacements réservés pour une voie, le plus proche à 153${NB}m`,
    );
    expect(en('urbanisme')).toMatchObject({
      headline: `Nothing recorded on your plot, nor within 40${NB}m.`,
    });
    // Jamais « rien de prévu ».
    expect(JSON.stringify(view)).not.toMatch(/prévu/);
  });

  it('les risques : les échelles officielles, chacune avec son échelle (la commune, l’adresse du bien)', () => {
    const view = fr('risques');
    expect(view).toMatchObject({
      kind: 'risks',
      headline: 'Séisme et argiles : un niveau moyen.',
      disasters: {
        scale: 'la commune',
        count: '2',
        caption: 'reconnues, la dernière le 31 mars 2023',
      },
      flood: {
        title: 'Commune classée',
        caption: 'territoire à risque important d’inondation : Nice Cannes Mandelieu',
      },
    });
    expect(
      view?.kind === 'risks' && view.gauges.map((g) => [g.title, g.scale, g.value, g.caption]),
    ).toEqual([
      ['Séisme', 'la commune', 4, 'zone 4 sur 5 : « moyenne »'],
      ['Argiles', 'l’adresse du bien', 2, 'exposition moyenne, sur 3 niveaux'],
      ['Radon', 'la commune', 1, 'catégorie 1 sur 3 : potentiel « faible »'],
    ]);
    expect(en('risques')).toMatchObject({ headline: 'Earthquake and clay: a medium level.' });
  });

  it('la population : des pictogrammes entiers, le chiffre exact écrit', () => {
    expect(fr('population')).toMatchObject({
      headline: `1${THIN}120 habitants autour de votre bien.`,
      groups: [
        { value: `1${THIN}120`, pictograms: 11, note: '(un pictogramme : 100 habitants)' },
        { value: '500', pictograms: 10, note: '(un pictogramme : 50 ménages)' },
        { value: '2,2', pictograms: 2, note: null },
      ],
    });
  });

  it('la copropriété : ni son nom, ni son immatriculation', () => {
    const view = fr('copropriete');
    expect(view).toMatchObject({
      headline: 'Une copropriété de 6 lots d’habitation, construite entre 1975 et 1993.',
      lots: 6,
      chips: [
        { big: '6', text: 'lots d’habitation' },
        { big: 'Mandat de syndic', text: 'terminé le 17 janvier 2026' },
      ],
    });
    expect(JSON.stringify(view)).not.toMatch(/Démonstration|AC1/);
  });

  it('les permis : la rue, jamais un numéro ; les ventes : au mois, à environ N m', () => {
    expect(fr('permis')).toMatchObject({
      headline: `2 permis de construire à moins de 300${NB}m, depuis 2022.`,
      outer: { count: '2', sub: `à 128${NB}m et à 234${NB}m` },
    });
    const sales = fr('ventes');
    expect(sales).toMatchObject({
      // La vue « bien-client » ne dit pas encore depuis quand : 2021, confirmé par Jean-Guy.
      headline: '11 maisons de 5 pièces vendues autour de chez vous depuis 2021',
      scale: `À moins de 250${NB}m de votre bien`,
    });
    expect(sales?.kind === 'sales' && sales.cards[0]).toEqual({
      price: `876${THIN}800${NB}€`,
      month: 'novembre 2025',
      street: 'Boulevard Marechal Juin',
      facts: `118${NB}m² · à environ 100${NB}m`,
    });
    expect(en('ventes')).toMatchObject({
      headline: '11 houses with 5 rooms sold around you since 2021',
    });
  });

  it('le jour où la vue donne le début de la période, le titre reprend sa valeur', () => {
    const withSince = { ...blocks, ventes: { ...blocks.ventes!, since: 2022 } };
    expect(neighbourhoodView(withSince, 'ventes', CLIENT_TEXTS.fr, 'fr')).toMatchObject({
      headline: '11 maisons de 5 pièces vendues autour de chez vous depuis 2022',
    });
  });

  it('un bloc absent n’a pas d’écran', () => {
    expect(
      neighbourhoodView({ ...blocks, ventes: null }, 'ventes', CLIENT_TEXTS.fr, 'fr'),
    ).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';

import {
  extractVisibleFeatures,
  isDedicatedColumnLine,
} from '@/features/comparable-import/utils/extract-visible-features';

describe('extractVisibleFeatures', () => {
  // Terrain (19/08) : sur les CINQ portails testés, la liste affichée à côté de
  // l'annonce n'entrait jamais dans l'outil.
  it('lit la liste des caractéristiques du portail', () => {
    const html = `<div class="caracteristiques"><ul>
      <li>Ascenseur</li><li>Box de stationnement</li><li>Jardin</li><li>Terrasse</li>
    </ul></div>`;
    expect(extractVisibleFeatures(html)).toEqual([
      'Ascenseur',
      'Box de stationnement',
      'Jardin',
      'Terrasse',
    ]);
  });

  // Terrain (19/08, Belles Demeures) : l'énumération tient dans une phrase.
  it('lit l’énumération en une phrase', () => {
    const html =
      '<meta content="Découvrez cette maison qui dispose des atouts suivants: Piscine,Terrasse,3 Parkings" />';
    expect(extractVisibleFeatures(html)).toEqual(['Piscine', 'Terrasse', '3 Parkings']);
  });

  it('écarte les étiquettes d’interface, les puces vides et les doublons', () => {
    const html = `<div class="criteres"><ul>
      <li>Voir plus</li><li>—</li><li>12</li><li>Terrasse</li><li>terrasse</li>
      <li>Caractéristiques</li>
    </ul></div>`;
    expect(extractVisibleFeatures(html)).toEqual(['Terrasse']);
  });

  it('ne lit pas les listes hors d’un bloc de caractéristiques', () => {
    // Sans ce filtre, on ramasserait le menu du site et les annonces voisines.
    expect(extractVisibleFeatures('<ul><li>Accueil</li><li>Contact</li></ul>')).toEqual([]);
    expect(extractVisibleFeatures('')).toEqual([]);
  });
});

describe('isDedicatedColumnLine', () => {
  // Ces lignes ont déjà leur propre colonne : les répéter dans la liste libre
  // ferait doublon sur la fiche.
  it('reconnaît ce qui appartient à une colonne dédiée', () => {
    expect(isDedicatedColumnLine('Année de construction 1980')).toBe(true);
    expect(isDedicatedColumnLine('Sources d’énergie Électrique')).toBe(true);
    expect(isDedicatedColumnLine('Chauffage central au gaz')).toBe(true);
    expect(isDedicatedColumnLine('Terrasse')).toBe(false);
    expect(isDedicatedColumnLine('Box de stationnement')).toBe(false);
  });
});

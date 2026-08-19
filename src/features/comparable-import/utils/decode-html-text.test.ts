import { describe, expect, it } from 'vitest';

import {
  decodeHtmlEntities,
  htmlFragmentToText,
} from '@/features/comparable-import/utils/decode-html-text';

describe('decodeHtmlEntities', () => {
  // Terrain (19/08, Green Acres) : tout le texte de l'annonce était encodé.
  it('décode les entités numériques et nommées', () => {
    expect(decodeHtmlEntities('exposition sud-ouest, v&#xE9;randa 12 m&sup2;')).toBe(
      'exposition sud-ouest, véranda 12 m²',
    );
    expect(decodeHtmlEntities('caf&#233; &amp; th&eacute;')).toBe('café & thé');
    expect(decodeHtmlEntities('l&#x2019;appartement')).toBe('l’appartement');
  });

  it('laisse intact ce qui n’est pas une entité connue', () => {
    expect(decodeHtmlEntities('R&D et 3 &pasuneentite; 4')).toBe('R&D et 3 &pasuneentite; 4');
  });
});

describe('htmlFragmentToText', () => {
  it('retire les balises et sépare les éléments de liste', () => {
    // Sans séparateur, « TerrasseGarage » ne serait reconnu ni comme terrasse
    // ni comme garage.
    expect(htmlFragmentToText('<ul><li>Terrasse</li><li>Garage</li></ul>')).toBe(
      'Terrasse\nGarage',
    );
  });

  it('transforme les sauts de ligne et compacte les espaces', () => {
    expect(htmlFragmentToText('<p>Salon<br/>Cuisine   &#xE9;quip&#xE9;e</p>')).toBe(
      'Salon\nCuisine équipée',
    );
  });

  it('ignore le contenu des scripts, des styles et des commentaires', () => {
    const fragment = '<div>Vrai texte<script>var a="Faux texte";</script><!-- caché --></div>';
    expect(htmlFragmentToText(fragment)).toBe('Vrai texte');
  });
});

import { describe, expect, it } from 'vitest';

import { collectBlocksByAttribute } from '@/features/comparable-import/utils/extract-visible-blocks';

const HINT = /description/i;

describe('collectBlocksByAttribute', () => {
  it('rend le contenu du bloc, fermeture correctement appariée', () => {
    // Le piège : un bloc imbriqué ferme avant le bloc cherché. Un simple
    // « jusqu'au prochain </div> » couperait la description en deux.
    const html =
      '<div class="description-text">Avant<div class="inner">Milieu</div>Après</div><div>Hors sujet</div>';
    expect(collectBlocksByAttribute(html, HINT)).toEqual([
      'Avant<div class="inner">Milieu</div>Après',
    ]);
  });

  it('ne retient que les blocs dont un attribut correspond', () => {
    const html = '<div class="autre">A</div><section id="description">B</section>';
    expect(collectBlocksByAttribute(html, HINT)).toEqual(['B']);
  });

  it('ignore un bloc jamais refermé et les balises auto-fermantes', () => {
    expect(collectBlocksByAttribute('<div class="description">Sans fin', HINT)).toEqual([]);
    expect(collectBlocksByAttribute('<div class="description" />', HINT)).toEqual([]);
  });

  it('ne renvoie rien sur une page vide', () => {
    expect(collectBlocksByAttribute('', HINT)).toEqual([]);
  });
});

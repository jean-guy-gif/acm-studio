import { describe, expect, it } from 'vitest';

import { extractVisibleDescription } from '@/features/comparable-import/utils/extract-visible-description';

const LONG = 'Bel appartement traversant au calme, avec balcon et cave. '.repeat(4);

describe('extractVisibleDescription', () => {
  // Terrain (19/08, Green Acres) : la balise `meta` ne portait que le titre
  // (38 caractères) ; le vrai texte, encodé, vivait dans le corps de la page.
  it('lit le texte de l’annonce dans le corps de la page', () => {
    const html = `<html><body><div class="description-text">${LONG}</div></body></html>`;
    expect(extractVisibleDescription(html)).toBe(LONG.trim());
  });

  it('retient le bloc le plus long quand la page en propose plusieurs', () => {
    const html = `<div class="descriptif">${LONG}</div><div class="description">${LONG + LONG}</div>`;
    expect(extractVisibleDescription(html)).toBe((LONG + LONG).trim());
  });

  it('écarte une étiquette trop courte pour être une description', () => {
    expect(
      extractVisibleDescription('<div class="description">Grand appartement</div>'),
    ).toBeNull();
  });

  it('ne renvoie rien quand la page ne porte aucun bloc de description', () => {
    expect(extractVisibleDescription(`<div class="prix">${LONG}</div>`)).toBeNull();
    expect(extractVisibleDescription('')).toBeNull();
  });
});

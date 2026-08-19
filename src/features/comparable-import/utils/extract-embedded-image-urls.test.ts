import { describe, expect, it } from 'vitest';

import { extractEmbeddedImageUrls } from '@/features/comparable-import/utils/extract-embedded-image-urls';

describe('extractEmbeddedImageUrls', () => {
  // Terrain (19/08, SeLoger) : la couverture est en <img>, la galerie vit dans
  // un bloc de données JavaScript avec les barres obliques échappées.
  it('lit les adresses échappées à la mode JSON', () => {
    const html = `<script>window.__DATA__={"photos":[
      {"url":"https:\\/\\/v.seloger.com\\/s\\/crop\\/800x600\\/visuels\\/1\\/a\\/salon.jpg"},
      {"url":"https:\\/\\/v.seloger.com\\/s\\/crop\\/800x600\\/visuels\\/1\\/a\\/cuisine.jpg"}
    ]}</script>`;
    expect(extractEmbeddedImageUrls(html)).toEqual([
      'https://v.seloger.com/s/crop/800x600/visuels/1/a/salon.jpg',
      'https://v.seloger.com/s/crop/800x600/visuels/1/a/cuisine.jpg',
    ]);
  });

  it('lit aussi les adresses normales et supprime les doublons exacts', () => {
    const html = `
      <img src="https://cdn.portail.fr/a.jpg">
      <script>var g=["https://cdn.portail.fr/a.jpg","https://cdn.portail.fr/b.webp"]</script>
    `;
    expect(extractEmbeddedImageUrls(html)).toEqual([
      'https://cdn.portail.fr/a.jpg',
      'https://cdn.portail.fr/b.webp',
    ]);
  });

  it('accepte les extensions courantes et les paramètres de redimensionnement', () => {
    const html = `"https://cdn.portail.fr/1.jpeg" "https://cdn.portail.fr/2.png?w=1200&h=800"
      "https://cdn.portail.fr/3.avif" "https://cdn.portail.fr/4.webp"`;
    expect(extractEmbeddedImageUrls(html)).toEqual([
      'https://cdn.portail.fr/1.jpeg',
      'https://cdn.portail.fr/2.png?w=1200&h=800',
      'https://cdn.portail.fr/3.avif',
      'https://cdn.portail.fr/4.webp',
    ]);
  });

  it('ignore ce qui n’est pas une image et ne renvoie rien sur une page vide', () => {
    const html = `<a href="https://www.seloger.com/annonces/1.htm">Voir</a>
      <script src="https://cdn.portail.fr/app.js"></script>`;
    expect(extractEmbeddedImageUrls(html)).toEqual([]);
    expect(extractEmbeddedImageUrls('')).toEqual([]);
  });
});

describe('extractEmbeddedImageUrls — nettoyage', () => {
  // Terrain (19/08, SeLoger) : l'échappement fermant la chaîne restait collé.
  it('retire la barre oblique inverse finale', () => {
    const html = String.raw`{"a":"https:\/\/mms.seloger.com\/1\/a.jpg?ci_seal=abc\","b":1}`;
    expect(extractEmbeddedImageUrls(html)).toEqual(['https://mms.seloger.com/1/a.jpg?ci_seal=abc']);
  });
});

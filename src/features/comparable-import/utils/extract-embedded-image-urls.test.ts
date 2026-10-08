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

// Mission 76 — mesuré le 07/10/2026 (Bien'ici, laforet-immo-facile-52960884) : le
// nom de fichier de l'agence continue APRÈS l'extension. Coupée à « .jpg », l'adresse
// n'existait pas (404) : 18 photos sur 19 échouaient.
describe('extractEmbeddedImageUrls — l’adresse ne se coupe plus à l’extension', () => {
  it('garde le chemin entier d’une adresse en « .jpg_DATEMAJ_… »', () => {
    const html = `<img src="https://cdn.portail.fr/photo/52960884b.jpg_DATEMAJ_02_10_2026-15_21_57">
      <script>var g={"u":"https:\\/\\/cdn.portail.fr\\/photo\\/52960884c.jpg_DATEMAJ_02_10_2026-15_21_57"}</script>`;
    expect(extractEmbeddedImageUrls(html)).toEqual([
      'https://cdn.portail.fr/photo/52960884b.jpg_DATEMAJ_02_10_2026-15_21_57',
      'https://cdn.portail.fr/photo/52960884c.jpg_DATEMAJ_02_10_2026-15_21_57',
    ]);
  });

  it('garde aussi ce qui suit « .png » et « .webp »', () => {
    const html = `"https://cdn.portail.fr/a.png_v2" "https://cdn.portail.fr/b.webp/1600"`;
    expect(extractEmbeddedImageUrls(html)).toEqual([
      'https://cdn.portail.fr/a.png_v2',
      'https://cdn.portail.fr/b.webp/1600',
    ]);
  });

  it('s’arrête aux guillemets écrits en entités et à l’adresse suivante d’une liste', () => {
    const html = `<div style="background:url(&quot;https://cdn.portail.fr/a.jpg&quot;)"></div>
      <i data-list="https://cdn.portail.fr/b.jpg,https://cdn.portail.fr/c.jpg"></i>`;
    expect(extractEmbeddedImageUrls(html)).toEqual([
      'https://cdn.portail.fr/a.jpg',
      'https://cdn.portail.fr/b.jpg',
      'https://cdn.portail.fr/c.jpg',
    ]);
  });

  it('ne retire que les paramètres de vignette connus, par hébergeur', () => {
    const html = `"https://file.bienici.com/photo/x_a.jpg_DATEMAJ_1?width=600&amp;height=370&amp;fit=cover"
      "https://mms.seloger.com/1/a.jpg?ci_seal=abc&amp;w=800"`;
    expect(extractEmbeddedImageUrls(html)).toEqual([
      'https://file.bienici.com/photo/x_a.jpg_DATEMAJ_1',
      'https://mms.seloger.com/1/a.jpg?ci_seal=abc&w=800',
    ]);
  });

  it('une extension qui n’est que le début d’un mot ne fait pas une image', () => {
    expect(
      extractEmbeddedImageUrls('"https://cdn.portail.fr/page.jpgx" "https://x.fr/a.pngs"'),
    ).toEqual([]);
  });
});

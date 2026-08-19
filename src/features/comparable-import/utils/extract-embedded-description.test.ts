import { describe, expect, it } from 'vitest';

import { extractEmbeddedDescription } from '@/features/comparable-import/utils/extract-embedded-description';

describe('extractEmbeddedDescription', () => {
  // Terrain (19/08, SeLoger) : la balise `meta` ne porte qu'un résumé tronqué de
  // 148 caractères ; la vraie description (plus de 1 000) est doublement
  // échappée dans un bloc de données. C'est elle qui permet de cocher terrasse,
  // véranda ou garage.
  it('retient la description la plus longue, pas la première', () => {
    const html = `
      <meta name="description" content="ignorée, ce n'est pas du JSON">
      <script>{"description":"Résumé tronqué…"}</script>
      <script>window.d="{\\"description\\":\\"Appartement rénové avec véranda et agréable terrasse, box ferme en sous-sol.\\"}"</script>
    `;
    const description = extractEmbeddedDescription(html);
    expect(description).toContain('véranda');
    expect(description).toContain('terrasse');
    expect(description!.length).toBeGreaterThan('Résumé tronqué…'.length);
  });

  it('décode les retours à la ligne et les guillemets échappés', () => {
    const html = String.raw`<script>{"description":"Ligne 1\nLigne 2 dite \"belle vue\""}</script>`;
    expect(extractEmbeddedDescription(html)).toBe('Ligne 1\nLigne 2 dite "belle vue"');
  });

  it('renvoie null quand la page ne porte aucune description', () => {
    expect(extractEmbeddedDescription('<html><body>rien</body></html>')).toBeNull();
    expect(extractEmbeddedDescription('')).toBeNull();
  });
});

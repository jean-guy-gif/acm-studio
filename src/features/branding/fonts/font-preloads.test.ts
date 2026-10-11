import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { liveFontPreloads } from '@/features/branding/fonts/font-preloads';
import { EMBEDDED_FONTS } from '@/features/branding/fonts/font-registry';

const names = (files: readonly string[]) =>
  files.map((file) =>
    file
      .split('/')
      .pop()
      ?.replace(/\.[^.]+\.woff2$/, '.woff2'),
  );

describe('les polices du Live sont préchargées (mission 95)', () => {
  it('sans charte validée : le défaut produit, Montserrat et les trois graisses de Rajdhani', () => {
    expect(names(liveFontPreloads(null))).toEqual([
      'montserrat-latin.woff2',
      'rajdhani-latin-500.woff2',
      'rajdhani-latin-600.woff2',
      'rajdhani-latin-700.woff2',
    ]);
  });

  it('avec la police d’une agence : seulement la sienne, en alphabet latin', () => {
    expect(names(liveFontPreloads('inter'))).toEqual(['inter-latin.woff2']);
    expect(names(liveFontPreloads('poppins'))).toHaveLength(4);
    for (const font of EMBEDDED_FONTS) {
      const files = names(liveFontPreloads(font.key));
      expect(files.length).toBeGreaterThan(0);
      for (const file of files) {
        expect(file).toMatch(/-latin(-\d+)?\.woff2$/);
      }
    }
  });

  it('une clé inconnue retombe sur le défaut, comme la feuille de style', () => {
    expect(liveFontPreloads('comic-sans; }')).toEqual(liveFontPreloads(null));
  });

  it('ne se fait que sur les écrans du Live', () => {
    const src = join(process.cwd(), 'src');
    expect(readFileSync(join(src, 'app', '(stage)', 'layout.tsx'), 'utf8')).toContain(
      '<LiveFontPreload />',
    );
    expect(readFileSync(join(src, 'app', 'layout.tsx'), 'utf8')).not.toContain('LiveFontPreload');
  });
});

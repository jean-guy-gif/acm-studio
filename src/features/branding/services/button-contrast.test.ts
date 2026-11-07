import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { brandingCssVariables } from '@/features/branding/services/branding-css';
import { contrastRatio, derivePalette } from '@/features/branding/services/palette';

// Mission 143 (B3, décision de Jean-Guy du 07/11) — les boutons pleins se lisent : un texte blanc
// sur la variante foncée de la couleur de l'agence, au moins 4,5 : 1, pour TOUTE couleur d'agence,
// claires comprises ; et aucun texte blanc posé sur la couleur exacte (un aplat clair).

const WHITE = '#ffffff';
const LIGHT_COLORS = [
  '#3ea9ff',
  '#ffff00',
  '#ffffff',
  '#f0e68c',
  '#7fffd4',
  '#ffc0cb',
  '#00ff00',
  '#ffa500',
  '#87ceeb',
];

describe('la couleur des boutons pleins', () => {
  it('au moins 4,5 : 1 avec le blanc, pour des couleurs d’agence claires', () => {
    for (const color of LIGHT_COLORS) {
      const { brandDeep } = derivePalette(color);
      expect(contrastRatio(brandDeep, WHITE), color).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('relue à l’émission du style, même si la base gardait une couleur trop claire', () => {
    const css = brandingCssVariables({
      brand: '#3ea9ff',
      brandDeep: '#7fd0ff',
      brandSoft: '#eaf5ff',
      brandDarker: '#013a58',
      brandDarkest: '#01283b',
      onBrandText: '#ffffff',
    });
    const deep = /--color-brand-deep: (#[0-9a-f]{6});/i.exec(css)?.[1];
    expect(deep).toBeDefined();
    expect(contrastRatio(deep!, WHITE)).toBeGreaterThanOrEqual(4.5);
    // La couleur exacte reste pour les aplats décoratifs.
    expect(css).toContain('--color-brand: #3ea9ff;');
  });
  it('les couleurs par défaut de l’outil', () => {
    const globals = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');
    const deep = /--color-brand-deep:\s*(#[0-9a-f]{6})/i.exec(globals)?.[1];
    expect(contrastRatio(deep!, WHITE)).toBeGreaterThanOrEqual(4.5);
    // Le gris des textes secondaires (zinc-500) sur blanc.
    expect(contrastRatio('#71717a', WHITE)).toBeGreaterThanOrEqual(4.5);
  });
});

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

describe('aucun texte blanc sur la couleur exacte', () => {
  it('ni `bg-brand` avec `text-white`, ni `text-zinc-400` (trop clair sur blanc)', () => {
    const offenders: string[] = [];
    for (const path of filesUnder(join(process.cwd(), 'src'))) {
      if (!/\.(ts|tsx)$/.test(path) || /\.test\.tsx?$/.test(path)) continue;
      readFileSync(path, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          // Hors de la scène sombre du Live (`stage:`), où la couleur exacte porte un texte foncé.
          const fills = [...line.matchAll(/(?:^|[\s"'`])((?:[a-z-]+:)*)bg-brand(?=[\s"'`]|$)/g)];
          const exactFill = fills.some((fill) => !fill[1]!.startsWith('stage:'));
          if (exactFill && /text-white|text-on-brand/.test(line))
            offenders.push(`${path}:${index + 1}`);
          if (
            /(^|[\s"'`])(?:[a-z-]+:)?text-zinc-400(?=[\s"'`]|$)/.test(line) &&
            !/stage:text-zinc-400/.test(line)
          ) {
            offenders.push(`${path}:${index + 1} (zinc-400)`);
          }
        });
    }
    expect(offenders).toEqual([]);
  });
});

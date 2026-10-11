import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  EMBEDDED_FONTS,
  embeddedFontCssVar,
  isEmbeddedFontKey,
} from '@/features/branding/fonts/font-registry';

describe('font-registry (Mission 57)', () => {
  it('la liste embarquée est courte et sobre (5 à 6 polices)', () => {
    // « Chercher la qualité, pas la couverture » : une liste courte se parcourt d'un œil.
    expect(EMBEDDED_FONTS.length).toBeGreaterThanOrEqual(5);
    expect(EMBEDDED_FONTS.length).toBeLessThanOrEqual(6);
  });

  it('chaque police a une clé slug et une variable CSS --font-*', () => {
    for (const font of EMBEDDED_FONTS) {
      expect(font.key).toMatch(/^[a-z0-9-]+$/);
      expect(font.cssVar).toMatch(/^--font-[a-z0-9-]+$/);
    }
  });

  it('isEmbeddedFontKey n’accepte QUE les clés de la liste', () => {
    for (const font of EMBEDDED_FONTS) {
      expect(isEmbeddedFontKey(font.key)).toBe(true);
    }
    // Ni null, ni valeur libre, ni tentative d'injection.
    expect(isEmbeddedFontKey(null)).toBe(false);
    expect(isEmbeddedFontKey('')).toBe(false);
    expect(isEmbeddedFontKey('helvetica')).toBe(false);
    expect(isEmbeddedFontKey('inter; } body { display: none')).toBe(false);
    expect(isEmbeddedFontKey(42)).toBe(false);
  });

  it('embeddedFontCssVar mappe une clé connue vers sa variable, sinon null', () => {
    expect(embeddedFontCssVar('montserrat')).toBe('--font-montserrat');
    expect(embeddedFontCssVar('work-sans')).toBe('--font-work-sans');
    expect(embeddedFontCssVar('inconnue')).toBeNull();
    expect(embeddedFontCssVar(null)).toBeNull();
  });
});

// Mission 95 — plus aucune police n'est téléchargée à la compilation : ce téléchargement a fait
// échouer trois déploiements. Leurs fichiers sont dans le dépôt, une feuille par famille.
describe('les polices sont embarquées dans le dépôt', () => {
  const SRC = join(process.cwd(), 'src');
  const FONTS = join(SRC, 'features', 'branding', 'fonts');
  const sources = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        return entry.name === '__fixtures__' ? [] : sources(path);
      }
      return /\.(ts|tsx|css)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
    });

  it('aucun fichier ne passe par next/font/google ni par les serveurs de Google Fonts', () => {
    const offenders = sources(SRC).filter((path) =>
      /next\/font\/google|fonts\.googleapis\.com|fonts\.gstatic\.com/.test(
        readFileSync(path, 'utf8'),
      ),
    );
    expect(offenders).toEqual([]);
  });

  it('chaque variable de police est définie par une feuille embarquée, fichiers et licence compris', () => {
    const imported = readFileSync(join(FONTS, 'embedded-fonts.ts'), 'utf8');
    const variables = [...EMBEDDED_FONTS.map((font) => font.cssVar), '--font-rajdhani'];
    for (const cssVar of variables) {
      const slug = cssVar.replace('--font-', '');
      expect(imported).toContain(`import './${slug}/${slug}.css';`);
      const css = readFileSync(join(FONTS, slug, `${slug}.css`), 'utf8');
      expect(css).toContain(`${cssVar}:`);
      // Chaque fichier nommé par la feuille existe, et rien ne pointe hors du dépôt.
      const files = [...css.matchAll(/url\('\.\/([^']+\.woff2)'\)/g)].map((match) => match[1]);
      expect(files.length).toBeGreaterThan(0);
      for (const file of files) {
        expect(existsSync(join(FONTS, slug, file)), `${slug}/${file}`).toBe(true);
      }
      expect(css).not.toMatch(/url\(\s*['"]?https?:/);
      expect(existsSync(join(FONTS, slug, 'OFL.txt'))).toBe(true);
    }
  });
});

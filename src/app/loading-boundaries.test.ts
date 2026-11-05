import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// Mission 128 — la vitesse : chaque espace montre son attente tout de suite après le clic, sans
// rien lire ; les fiches n'en ont pas, pour garder leur 404 et leurs redirections ; les fonctions
// tournent à Paris, près de la base.
const PROTECTED = 'src/app/(protected)';
const BOUNDARIES = [
  `${PROTECTED}/suivi/loading.tsx`,
  `${PROTECTED}/prospection/loading.tsx`,
  `${PROTECTED}/visites/loading.tsx`,
  `${PROTECTED}/live/loading.tsx`,
  `${PROTECTED}/builder/(liste)/loading.tsx`,
  `${PROTECTED}/acquereurs/(liste)/loading.tsx`,
];

const all = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? all(path) : [path];
  });

describe('les attentes des espaces', () => {
  it('chaque espace a la sienne, et seulement celles-là', () => {
    for (const path of BOUNDARIES) expect(existsSync(path), path).toBe(true);
    const found = all('src/app').filter((path) => path.endsWith('loading.tsx'));
    expect(found.sort()).toEqual([...BOUNDARIES].sort());
  });

  it('une attente ne lit rien : ni session, ni base, ni paramètre', () => {
    for (const path of [...BOUNDARIES, 'src/components/ui/page-skeleton.tsx']) {
      const source = readFileSync(path, 'utf8');
      expect(source, path).not.toMatch(
        /\basync\b|\bawait\b|params|searchParams|next\/headers|@\/lib\/supabase|\/queries\/|@\/lib\/auth|'use client'/,
      );
      const imports = [...source.matchAll(/from '([^']+)'/g)].map((match) => match[1]);
      for (const source of imports) expect(source, path).toMatch(/^@\/components\/ui\//);
    }
  });

  it('elle se dit aux lecteurs d’écran', () => {
    const skeleton = readFileSync('src/components/ui/page-skeleton.tsx', 'utf8');
    expect(skeleton).toContain('role="status"');
    expect(skeleton).toContain('aria-busy="true"');
    expect(skeleton).toContain('Chargement…');
  });

  it('les listes de Préparation et des acquéreurs gardent leur adresse, leurs fiches leur 404', () => {
    expect(existsSync(`${PROTECTED}/builder/(liste)/page.tsx`)).toBe(true);
    expect(existsSync(`${PROTECTED}/acquereurs/(liste)/page.tsx`)).toBe(true);
    expect(existsSync(`${PROTECTED}/builder/page.tsx`)).toBe(false);
    expect(existsSync(`${PROTECTED}/acquereurs/page.tsx`)).toBe(false);
    expect(existsSync(`${PROTECTED}/builder/[projectId]/loading.tsx`)).toBe(false);
    expect(existsSync(`${PROTECTED}/acquereurs/[buyerId]/loading.tsx`)).toBe(false);
  });

  it('les fonctions tournent à Paris (cdg1), le cron de la nuit est inchangé', () => {
    const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
    expect(config.regions).toEqual(['cdg1']);
    expect(config.crons).toEqual([
      { path: '/api/cron/verifier-oppositions', schedule: '37 3 * * *' },
    ]);
  });
});

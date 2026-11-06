import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// Mission 128 — les fonctions tournent à Paris, près de la base. Correctif de la 128 (05/11) : les
// attentes des espaces (`loading.tsx`) sont retirées. Sous elles, un geste qui enregistre ne
// rafraîchissait plus la page (la relance du Suivi restait invisible), et un lien vers un espace
// déjà visité pouvait ouvrir une page vide (Prospection depuis le Suivi) : prouvé par l'e2e du
// parcours sur l'essai, rouge avec elles, vert sans elles.
const PROTECTED = 'src/app/(protected)';

const all = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? all(path) : [path];
  });

describe('aucune attente d’espace', () => {
  it('aucun loading.tsx sous src/app', () => {
    expect(all('src/app').filter((path) => path.endsWith('loading.tsx'))).toEqual([]);
  });

  it('les listes de Préparation et des acquéreurs gardent leur adresse', () => {
    expect(existsSync(`${PROTECTED}/builder/(liste)/page.tsx`)).toBe(true);
    expect(existsSync(`${PROTECTED}/acquereurs/(liste)/page.tsx`)).toBe(true);
    expect(existsSync(`${PROTECTED}/builder/page.tsx`)).toBe(false);
    expect(existsSync(`${PROTECTED}/acquereurs/page.tsx`)).toBe(false);
  });

  it('les fonctions tournent à Paris (cdg1), les crons de la nuit sont ceux attendus', () => {
    const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
    expect(config.regions).toEqual(['cdg1']);
    expect(config.crons).toEqual([
      { path: '/api/cron/verifier-oppositions', schedule: '37 3 * * *' },
      // Mission 136 — la veille des acquéreurs, à une heure creuse.
      { path: '/api/cron/veille-acquereurs', schedule: '17 2 * * *' },
    ]);
  });
});

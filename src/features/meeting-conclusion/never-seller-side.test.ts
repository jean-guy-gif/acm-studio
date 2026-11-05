import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

// Mission 96, critère 2 — « Ce que le vendeur a dit », l'historique des relances et le message
// de relance sont des écrans CONSEILLER : rien de tout cela ne passe côté vendeur. Et le bloc ne
// lit aucune adresse de concurrent (comme M75, M83, M86).
const SRC = join(process.cwd(), 'src');

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return files(path);
    }
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });

describe('la relance ne passe jamais côté vendeur', () => {
  it('aucun code montré au vendeur n’importe ces briques ni ne lit ces tables', () => {
    const SELLER_SIDE = [
      join('features', 'live-seller'),
      join('features', 'seller-presentation'),
      join('app', '(stage)'),
      join('app', '(protected)', 'live'),
    ];
    const offenders = SELLER_SIDE.flatMap((dir) => files(join(SRC, dir)))
      .filter((path) =>
        /seller-said|seller-insights|follow-up-|dossier-follow-up|follow_up_contacts|follow_up_motive|followUpMotive|revealed_listing_price/.test(
          readFileSync(path, 'utf8'),
        ),
      )
      .map((path) => relative(SRC, path));
    expect(offenders).toEqual([]);
  });

  it('la lecture du bloc ne demande ni adresse, ni annonce, ni titre d’un concurrent', () => {
    const query = readFileSync(
      join(SRC, 'features', 'meeting-conclusion', 'queries', 'get-seller-insights.ts'),
      'utf8',
    );
    const selects = [...query.matchAll(/\.select\(\s*'([^']*)'/g)].map((match) => match[1]);
    expect(selects.length).toBeGreaterThan(0);
    for (const columns of selects) {
      expect(columns).not.toMatch(/\*|address|locator|listing_url|title|description|street/);
    }
  });

  it('les composants du bloc et du message ne reçoivent aucun concurrent', () => {
    for (const name of ['seller-said-block.tsx', 'follow-up-panel.tsx', 'follow-up-history.tsx']) {
      const source = readFileSync(
        join(SRC, 'features', 'meeting-conclusion', 'components', name),
        'utf8',
      );
      expect(source).not.toMatch(/comparable|locator|address|listing/i);
    }
  });
});

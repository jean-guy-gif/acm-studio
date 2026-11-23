import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// Mission 163 C — l'Étude de marché ne classe le bien qu'au prix de commercialisation CONVENU :
// aucun fichier de l'Étude (feature, page du conseiller, lien public) ne lit l'analyse du
// conseiller ni la décision de prix qui la porte (remplace M131, « sinon à l'analyse du
// conseiller », pour l'Étude seulement).

const ROOTS = [
  'src/features/market-study',
  'src/app/etude-de-marche',
  'src/app/(print)/builder/[projectId]/etude-de-marche',
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('l’Étude de marché ne lit jamais l’analyse du conseiller', () => {
  it('ni la table de la décision de prix, ni la colonne de l’analyse', () => {
    const all = ROOTS.flatMap(files);
    expect(all.length).toBeGreaterThan(5);
    const offenders = all.filter((path) =>
      /project_price_positionings|advisor_comparative_market_price|advisorAnalysis|advisor_price|advisor_analysis/.test(
        readFileSync(path, 'utf8'),
      ),
    );
    expect(offenders).toEqual([]);
  });
});

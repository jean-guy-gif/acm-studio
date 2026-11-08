import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// Mission 145 (partie B) — aucune tâche d'appel vers un propriétaire prospecté : le démarchage
// téléphonique sans consentement est interdit depuis le 11/08/2026 ; la prospection passe par
// courrier et passage (décision de Jean-Guy, 07/11). Aucun lien `tel:` ni « Appeler » dans le code
// de la prospection, des courriers et de leurs alertes. « Appeler le confrère » (M86) vise un
// professionnel, pas un propriétaire : il vit hors de ces dossiers.
const ROOTS = [
  'src/features/prospecting',
  'src/features/prospecting-file',
  'src/features/buyer-prospecting',
  'src/features/competitor-locator',
  'src/features/today/services',
  'src/app/(protected)/prospection',
  // La tournée, les courriers en lot et le courrier d'une recherche acquéreur.
  'src/app/(print)',
];

// Les lignes de démarchage d'« Aujourd'hui » : le composant qui les affiche ne propose pas d'appel
// pour elles (les tâches d'un client en relation, vendeur sous mandat ou acquéreur, le peuvent).
const TODAY_PROSPECT = 'src/features/today/components';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('jamais d’appel vers un propriétaire prospecté', () => {
  it('ni `tel:` ni « Appeler le propriétaire » dans la prospection et ses alertes', () => {
    const offenders = ROOTS.flatMap(files).filter((path) => {
      const source = readFileSync(path, 'utf8');
      return /tel:/.test(source) || /Appeler le propriétaire|appelez le propriétaire/i.test(source);
    });
    expect(offenders).toEqual([]);
  });

  it('aucune ligne d’« Aujourd’hui » n’affiche de lien `tel:`', () => {
    const offenders = files(TODAY_PROSPECT).filter((path) =>
      /tel:/.test(readFileSync(path, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// Mission 151 (partie B) — la raison du rang est pour le conseiller seul pendant la bêta (Jean-Guy,
// 10/11) : rien de ce qui part vers l'acquéreur (présentation, dossier et son lien, son PDF, ses
// messages) ne lit le classement, ses jugements ni ses citations.

const BUYER_SIDE = [
  'src/features/buyer-deck',
  'src/features/buyer-dossier',
  'src/features/buyer-presentation',
  'src/features/buyer-messages',
  'src/app/dossier',
  'src/app/(stage)/presentation',
  'src/app/(print)/acquereurs/[buyerId]/dossier',
];

function files(dir: string): string[] {
  try {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return files(path);
      return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
    });
  } catch {
    return [];
  }
}

describe('jamais côté acquéreur', () => {
  it('aucun fichier côté acquéreur ne lit le classement ni ses citations', () => {
    const scanned = BUYER_SIDE.flatMap(files);
    expect(scanned.length).toBeGreaterThan(10);
    for (const path of scanned) {
      const source = readFileSync(path, 'utf8');
      expect(source, path).not.toMatch(/features\/soft-ranking|watchReasons|softReasons|SoftWhy/);
    }
  });
});

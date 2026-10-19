import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// Mission 108 — le socle : plus de fichier mort, et tous les tests SQL dans la CI.
describe('Mission 108 — le socle', () => {
  it('le fichier mort `record-usage.ts` est supprimé', () => {
    expect(
      existsSync(
        join(process.cwd(), 'src', 'features', 'search-budget', 'services', 'record-usage.ts'),
      ),
    ).toBe(false);
  });

  it('chaque test SQL de `supabase/tests` tourne dans la CI', () => {
    const ci = readFileSync(join(process.cwd(), '.github', 'workflows', 'ci.yml'), 'utf8');
    const missing = readdirSync(join(process.cwd(), 'supabase', 'tests'))
      .filter((file) => file.endsWith('.sql'))
      .map((file) => file.replace(/\.sql$/, ''))
      .filter((name) => !new RegExp(`\\b${name}\\b`).test(ci));
    expect(missing).toEqual([]);
  });

  it('aucun test SQL ne crée de profil avec un rôle qui n’existe plus', () => {
    const dir = join(process.cwd(), 'supabase', 'tests');
    const offenders = readdirSync(dir)
      .filter((file) => file.endsWith('.sql'))
      .filter((file) => /'owner'\s*\)/.test(readFileSync(join(dir, file), 'utf8')));
    expect(offenders).toEqual([]);
  });
});

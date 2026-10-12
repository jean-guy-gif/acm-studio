import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  listingPayload,
  readListingPayload,
} from '@/features/competitor-search/services/listing-payload';

// Correctif du 12/10 — l'import en lot est resté figé sur « 4 sur 6 » : la cinquième page
// d'annonce dépassait un million de caractères, et React rejetait l'appel de l'action.

// Encode puis décode les arguments d'une action, exactement comme le font le navigateur et le
// serveur (le décodeur de React ne se charge que dans un processus `react-server`).
function throughReact(mode: 'string' | 'form', characters: number) {
  const out = execFileSync(
    'node',
    [
      '--conditions=react-server',
      join(process.cwd(), 'src/test-fixtures/decode-action-args.mjs'),
      mode,
      String(characters),
    ],
    { encoding: 'utf8', cwd: process.cwd() },
  );
  return JSON.parse(out) as { ok: true; length: number } | { ok: false; error: string };
}

describe('la page d’une annonce, du navigateur à l’action d’import', () => {
  it('REPRODUIT la panne : passée en argument, une page de plus d’un million de caractères est rejetée', () => {
    expect(throughReact('string', 900_000)).toEqual({ ok: true, length: 900_000 });
    expect(throughReact('string', 1_100_000)).toEqual({
      ok: false,
      error:
        'Maximum array nesting exceeded. Large nested arrays can be dangerous. Try adding intermediate objects.',
    });
  });

  it('dans un formulaire, la même page arrive entière — et une page de 3,5 millions aussi', () => {
    expect(throughReact('form', 1_100_000)).toEqual({ ok: true, length: 1_100_000 });
    expect(throughReact('form', 3_500_000)).toEqual({ ok: true, length: 3_500_000 });
  });

  it('l’écran envoie un formulaire, et l’action ne reçoit plus la page en argument', () => {
    const read = (path: string) => readFileSync(join(process.cwd(), 'src', path), 'utf8');
    expect(read('features/competitor-search/components/competitor-search-panel.tsx')).toContain(
      'importAction(listingPayload(url, read.html, candidate.propertyType))',
    );
    const action = read('features/competitor-search/actions/import-and-create-competitor.ts');
    expect(action).toContain('readListingPayload(payload)');
    expect(action).not.toMatch(/html: string/);
  });
});

describe('listingPayload / readListingPayload', () => {
  it('fait l’aller-retour de l’adresse, de la page et du type', () => {
    const payload = listingPayload('https://x.test/a', '<html>é</html>', 'apartment');
    expect(readListingPayload(payload)).toEqual({
      url: 'https://x.test/a',
      html: '<html>é</html>',
      propertyType: 'apartment',
    });
  });

  it('un type inconnu reste inconnu', () => {
    expect(readListingPayload(listingPayload('https://x.test/a', '<p/>', null))).toEqual({
      url: 'https://x.test/a',
      html: '<p/>',
      propertyType: null,
    });
  });

  it('refuse ce qui n’est pas le formulaire attendu', () => {
    expect(readListingPayload(null)).toBeNull();
    expect(readListingPayload('https://x.test/a')).toBeNull();
    expect(readListingPayload(new FormData())).toBeNull();
    const withFile = new FormData();
    withFile.set('url', 'https://x.test/a');
    withFile.set('html', new Blob(['<p/>']));
    expect(readListingPayload(withFile)).toBeNull();
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement, Suspense } from 'react';
import { renderToReadableStream } from 'react-dom/server.edge';
import { describe, expect, it, vi } from 'vitest';

// Mission 158 — « Avant le rendez-vous » s'affiche tout de suite ; le dossier d'adresse arrive
// ensuite, et une Academia lente ou muette ne retient rien d'autre (Jean-Guy, 17/11).
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => ({}) }));
// Academia ne répond jamais.
vi.mock('@/features/academia/queries/read-address-view', () => ({
  readAddressView: () => new Promise(() => {}),
}));
const { AddressViewLoading, AddressViewSection } =
  await import('@/features/academia/components/address-view-section');

async function firstChunk(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const { value } = await reader.read();
  reader.cancel().catch(() => undefined);
  return new TextDecoder().decode(value);
}

describe('le dossier d’adresse ne retient pas la page', () => {
  it('Academia muette : le reste de la page et la ligne d’attente partent tout de suite', async () => {
    const page = createElement(
      'main',
      null,
      createElement('h1', null, 'Avant le rendez-vous'),
      createElement(
        Suspense,
        { fallback: createElement(AddressViewLoading) },
        createElement(AddressViewSection, {
          agencyId: 'a1',
          projectId: 'p1',
          access: { key: 'k', demoAddress: null },
          property: { address: 'x', propertyType: 'Maison', rooms: 5, surface: 135 },
          savedRange: { min: null, max: null },
          demo: false,
        }),
      ),
      createElement('section', null, 'Votre décision de prix'),
    );
    const started = Date.now();
    const html = await firstChunk(await renderToReadableStream(page));
    expect(Date.now() - started).toBeLessThan(2000);
    expect(html).toContain('Avant le rendez-vous');
    expect(html).toContain('Votre décision de prix');
    expect(html).toContain('Lecture du dossier d’adresse d’Academia…');
  });

  it('la page ne lit jamais le dossier d’adresse elle-même : seulement dans sa limite', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/app/(protected)/builder/[projectId]/avant-rendez-vous/page.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/readAddressView|readAcademiaPropertyView/);
    expect(source).toMatch(/<Suspense fallback=\{<AddressViewLoading \/>\}>\s*<AddressViewSection/);
  });
});

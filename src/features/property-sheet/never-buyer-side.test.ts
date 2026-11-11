import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { presentedItems } from '@/features/buyer-presentation/queries/load-presentation';
import type { IdealSelectionItem } from '@/features/ideal-properties/types';

// Mission 152 (partie B) — la fiche complète est pour le conseiller SEUL (Jean-Guy, 11/11) : rien
// n'en part vers un acquéreur. Ni la présentation, ni le dossier acquéreur, ni son lien public, ni
// son PDF n'importent la fiche, son action ou ses sources ; la page de l'acquéreur ne change pas.

const ROOTS = [
  'src/features/buyer-deck',
  'src/features/buyer-dossier',
  'src/features/buyer-presentation',
  'src/app/dossier',
  'src/app/(print)/acquereurs',
  'src/app/(stage)/presentation',
];

function files(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(entry) && !/\.test\./.test(entry) ? [path] : [];
  });
}

describe('la fiche complète ne part jamais vers l’acquéreur', () => {
  const sources = ROOTS.flatMap(files);

  it('les écrans et documents de l’acquéreur existent (le garde lit du vrai code)', () => {
    expect(sources.length).toBeGreaterThan(10);
  });

  it('aucun n’importe la fiche complète, son action ni ses sources', () => {
    const offenders = sources.filter((path) =>
      /features\/property-sheet|originalPhotos/.test(readFileSync(path, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});

// La charge : le `snapshot` d'une annonce retenue (écrit par le navigateur à la sélection) porte
// désormais le texte et les photos d'origine de la recherche. La lecture qui sert la présentation,
// le dossier acquéreur, son lien et son PDF (`presentedItems`) n'en laisse rien passer.
const TRAP_TEXT = 'EXCLUSIVITÉ Agence Dupont, visites : Paul, 12 rue des Lilas';
const TRAP_PHOTO = 'https://piege.example.com/origine.jpg';

function tableClient(rows: Record<string, unknown[]>) {
  const chain = (table: string): unknown => {
    const self: unknown = new Proxy(
      {},
      {
        get(_target, property) {
          if (property === 'then') {
            return (resolve: (value: unknown) => unknown) =>
              resolve({ data: rows[table] ?? [], error: null });
          }
          return () => self;
        },
      },
    );
    return self;
  };
  return {
    from: (table: string) => chain(table),
    storage: { from: () => ({ createSignedUrls: async () => ({ data: [], error: null }) }) },
  };
}

describe('le texte de la recherche ne part pas vers l’acquéreur', () => {
  it('la lecture de la présentation et du dossier ne reprend ni le texte ni les photos d’origine', async () => {
    const url = 'https://www.seloger.com/annonces/achat/maison/vence-06/123456.htm';
    const item: IdealSelectionItem = {
      id: 'i-1',
      position: 1,
      source: 'listing',
      reference: url,
      label: 'Maison · 5 pièces · 150 m² · Vence',
      listedPrice: 735_000,
      priceSeenOn: '2026-11-10',
      category: 'strong',
      gaps: [],
      photoUrl: null,
      imported: false,
      pitch: null,
      snapshot: null,
    };
    const snapshot = {
      url,
      city: 'Vence',
      surfaceArea: 150,
      roomsCount: 5,
      propertyType: 'house',
      photoUrls: ['https://pictures.notif.immo/1.jpg'],
      streamEstate: { description: TRAP_TEXT, originalPhotos: [TRAP_PHOTO], priceDrops: [] },
    };
    const presented = await presentedItems(
      tableClient({ buyer_selection_items: [{ id: 'i-1', snapshot, imported: null }] }) as never,
      [item],
      'a-1',
    );
    expect(presented).toHaveLength(1);
    const payload = JSON.stringify(presented);
    expect(payload).toContain('pictures.notif.immo');
    expect(payload).not.toContain('Dupont');
    expect(payload).not.toContain('Lilas');
    expect(payload).not.toContain(TRAP_PHOTO);
  });
});

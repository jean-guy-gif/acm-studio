import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { buildExtensionZip, ICON_SIZES } from '../scripts/extension-zip.mjs';

// Mission 73 — le paquet déposé sur le Chrome Web Store : ce que Chrome charge, rien d'autre.
const extensionDir = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(join(extensionDir, 'manifest.json'), 'utf8'));

// Les noms relus DANS le zip (répertoire central), pas dans la liste qui a servi à le faire.
function zipEntryNames(buffer) {
  const names = [];
  let offset = buffer.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  while (offset !== -1 && buffer.readUInt32LE(offset) === 0x02014b50) {
    const nameLength = buffer.readUInt16LE(offset + 28);
    names.push(buffer.toString('utf8', offset + 46, offset + 46 + nameLength));
    offset += 46 + nameLength + buffer.readUInt16LE(offset + 30) + buffer.readUInt16LE(offset + 32);
  }
  return names;
}

describe('paquet de l’extension', () => {
  it('ne contient ni test ni README, et contient ce que le manifeste déclare', async () => {
    const { buffer } = await buildExtensionZip(extensionDir);
    const names = zipEntryNames(buffer);

    expect(names.some((name) => name.endsWith('.test.js'))).toBe(false);
    expect(names.some((name) => /readme/i.test(name))).toBe(false);
    expect(names).toContain('manifest.json');
    expect(names).toContain(manifest.background.service_worker);
    for (const script of manifest.content_scripts.flatMap((entry) => entry.js)) {
      expect(names).toContain(script);
    }
    for (const icon of Object.values(manifest.icons)) expect(names).toContain(icon);
  });

  it('déclare la version 1.0.0 et les quatre icônes', () => {
    expect(manifest.version).toBe('1.0.0');
    expect(Object.keys(manifest.icons)).toEqual(ICON_SIZES.map(String));
  });

  it('chaque icône est un PNG carré de la taille déclarée', () => {
    for (const [size, file] of Object.entries(manifest.icons)) {
      const png = readFileSync(join(extensionDir, file));
      expect(png.toString('latin1', 1, 4)).toBe('PNG');
      expect(png.readUInt32BE(16)).toBe(Number(size));
      expect(png.readUInt32BE(20)).toBe(Number(size));
    }
  });

  it('la description courte tient dans les 132 caractères du Store, et la fiche la reprend', () => {
    expect(manifest.description.length).toBeLessThanOrEqual(132);
    const sheet = readFileSync(join(extensionDir, '..', 'docs', 'extension-store.md'), 'utf8');
    expect(sheet).toContain(manifest.description);
  });

  it('ne demande que les permissions justifiées dans la fiche', () => {
    expect(manifest.permissions).toEqual(['tabs', 'scripting']);
    const sheet = readFileSync(join(extensionDir, '..', 'docs', 'extension-store.md'), 'utf8');
    for (const host of manifest.host_permissions) expect(sheet).toContain(host);
  });
});

// Mission 73 — le paquet de l'extension pour le Chrome Web Store.
//
//   npm run extension:zip   → dist/acm-studio-extension-<version>.zip
//
// Le paquet contient le dossier `extension/` SANS les tests ni le README : seulement ce que
// Chrome charge. Aucune dépendance : un zip est une suite d'entrées compressées (zlib de Node)
// suivie d'un répertoire central.
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateRawSync } from 'node:zlib';

export const ICON_SIZES = [16, 32, 48, 128];

const EXCLUDED = [/\.test\.js$/, /(^|\/)README\.md$/i, /(^|\/)\./];

// Les fichiers du paquet, en chemins relatifs à `extension/` (toujours avec « / »), triés.
export async function listExtensionFiles(extensionDir) {
  const entries = await readdir(extensionDir, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(extensionDir, join(entry.parentPath, entry.name)).split(sep).join('/'))
    .filter((name) => !EXCLUDED.some((pattern) => pattern.test(name)))
    .sort();
}

// Date fixe dans les entrées : deux paquets du même code sont identiques à l'octet.
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

export async function buildExtensionZip(extensionDir) {
  const names = await listExtensionFiles(extensionDir);
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const name of names) {
    const content = await readFile(join(extensionDir, name));
    const compressed = deflateRawSync(content, { level: 9 });
    const nameBytes = Buffer.from(name, 'utf8');

    // En-tête commun aux deux répertoires : version, drapeaux (UTF-8), méthode 8 (deflate).
    const shared = Buffer.alloc(26);
    shared.writeUInt16LE(20, 0);
    shared.writeUInt16LE(0x0800, 2);
    shared.writeUInt16LE(8, 4);
    shared.writeUInt16LE(DOS_TIME, 6);
    shared.writeUInt16LE(DOS_DATE, 8);
    shared.writeUInt32LE(crc32(content), 10);
    shared.writeUInt32LE(compressed.length, 14);
    shared.writeUInt32LE(content.length, 18);
    shared.writeUInt16LE(nameBytes.length, 22);
    shared.writeUInt16LE(0, 24);

    const localSignature = Buffer.alloc(4);
    localSignature.writeUInt32LE(0x04034b50, 0);
    const local = Buffer.concat([localSignature, shared, nameBytes, compressed]);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    shared.copy(central, 6);
    central.writeUInt32LE(offset, 42);

    locals.push(local);
    centrals.push(Buffer.concat([central, nameBytes]));
    offset += local.length;
  }

  const centralDirectory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(names.length, 8);
  end.writeUInt16LE(names.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);

  return { names, buffer: Buffer.concat([...locals, centralDirectory, end]) };
}

async function main() {
  const root = process.cwd();
  const extensionDir = join(root, 'extension');
  const manifest = JSON.parse(await readFile(join(extensionDir, 'manifest.json'), 'utf8'));
  const { names, buffer } = await buildExtensionZip(extensionDir);

  const outDir = join(root, 'dist');
  await mkdir(outDir, { recursive: true });
  const file = join(outDir, `acm-studio-extension-${manifest.version}.zip`);
  await writeFile(file, buffer);

  console.log(`${relative(root, file)} — ${names.length} fichiers, ${buffer.length} octets`);
  for (const name of names) console.log(`  ${name}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();

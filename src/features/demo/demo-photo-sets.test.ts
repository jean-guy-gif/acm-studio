import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import generated from '@/features/demo/data/photo-sets.generated.json';
import {
  DEMO_PHOTO_SET_IDS,
  DEMO_PHOTO_SET_RULES,
  DEMO_PHOTO_SET_VIEWS,
  completePhotoSet,
  demoPhotoSet,
  demoPhotoSetFolders,
} from '@/features/demo/data/photo-sets';
import { DEMO_SCENARIOS } from '@/features/demo/data/scenarios';
import { DEMO_SEED_SUBJECTS } from '@/features/demo/services/demo-seed';
import { servedDemoPhotoFile } from '@/lib/photo-url';

// Mission 155 — un jeu de photos par bien (décision de Jean-Guy, 13/11) : toutes les photos d'un
// bien montrent le même bien, aucune n'est partagée entre deux biens, chaque jeu dans son dossier.
// Ces tests tiennent ce qu'un dépôt doit respecter ; un jeu qui ne le respecte pas ne part pas.

const ROOT = join(process.cwd(), 'public', 'demo', 'photos');
const FILE = /^(\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*\.jpg$/;
const folders = readdirSync(ROOT).filter((name) => statSync(join(ROOT, name)).isDirectory());
const listingIds = new Set(DEMO_SCENARIOS.flatMap((s) => s.listings.map((l) => l.id)));
const known = new Set<string>([...DEMO_PHOTO_SET_IDS, ...listingIds]);

// Largeur et hauteur d'un JPEG, lues dans son en-tête (marqueur SOF).
function jpegSize(bytes: Buffer): { width: number; height: number } | null {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1]!;
    const length = bytes.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

describe('les jeux de photos de la démo, un dossier par bien', () => {
  it('la liste lue par le jeu de données est celle des dossiers', () => {
    const onDisk: Record<string, string[]> = {};
    for (const folder of folders) {
      const files = readdirSync(join(ROOT, folder))
        .filter((name) => FILE.test(name))
        .sort();
      if (files.length > 0) onDisk[folder] = files;
    }
    expect(generated).toEqual(onDisk);
    expect(demoPhotoSetFolders().sort()).toEqual(Object.keys(onDisk).sort());
  });

  it('chaque dossier est celui d’un bien connu : une faute de frappe ne passe pas', () => {
    for (const folder of folders) expect(known.has(folder), folder).toBe(true);
  });

  it('chaque jeu : 3 à 6 photos numérotées 01, 02…, au format attendu', () => {
    const { minPhotos, maxPhotos, width, height, maxBytes } = DEMO_PHOTO_SET_RULES;
    for (const folder of folders) {
      const files = readdirSync(join(ROOT, folder)).filter((name) => !name.startsWith('.'));
      if (files.length === 0) continue;
      for (const name of files) expect(name, `${folder}/${name}`).toMatch(FILE);
      const numbers = files.map((name) => Number(name.match(FILE)?.[1])).sort((a, b) => a - b);
      expect(numbers, folder).toEqual(numbers.map((_, index) => index + 1));
      expect(files.length, folder).toBeGreaterThanOrEqual(minPhotos);
      expect(files.length, folder).toBeLessThanOrEqual(maxPhotos);
      for (const name of files) {
        const bytes = readFileSync(join(ROOT, folder, name));
        expect(bytes.length, `${folder}/${name} : poids`).toBeLessThanOrEqual(maxBytes);
        expect(jpegSize(bytes), `${folder}/${name} : JPEG ${width} × ${height}`).toEqual({
          width,
          height,
        });
      }
    }
  });

  it('un bien qui a son jeu ne montre que ses photos, et aucune photo n’est à deux biens', () => {
    const owner = new Map<string, string>();
    for (const scenario of DEMO_SCENARIOS) {
      const subjectSet = scenario.subject.photoSet && demoPhotoSet(scenario.subject.photoSet);
      if (subjectSet) expect(scenario.subject.photos, scenario.id).toEqual(subjectSet);
      for (const listing of scenario.listings) {
        const set = demoPhotoSet(listing.id);
        if (set) expect(listing.photos, listing.id).toEqual(set);
        for (const photo of listing.photos.filter((p) => p.includes('/'))) {
          expect(photo.startsWith(`${listing.id}/`), `${listing.id} : ${photo}`).toBe(true);
          expect(owner.get(photo) ?? listing.id, photo).toBe(listing.id);
          owner.set(photo, listing.id);
        }
      }
    }
  });

  it('le dossier de chaque bien est attendu, et chaque mandat a sa fiche photo dans docs/DEMO.md', () => {
    const doc = readFileSync(join(process.cwd(), 'docs', 'DEMO.md'), 'utf8');
    const subjects = [
      ...DEMO_SCENARIOS.map((scenario) => scenario.subject),
      ...Object.values(DEMO_SEED_SUBJECTS),
    ];
    for (const subject of subjects) {
      expect(DEMO_PHOTO_SET_IDS as readonly string[]).toContain(subject.photoSet);
    }
    for (const id of DEMO_PHOTO_SET_IDS.filter((each) => each.startsWith('mandat-'))) {
      expect(doc, id).toContain(`### Fiche — \`${id}\``);
    }
  });

  it('les vues attendues de chaque mandat sont celles de sa fiche dans docs/DEMO.md', () => {
    const doc = readFileSync(join(process.cwd(), 'docs', 'DEMO.md'), 'utf8');
    for (const id of DEMO_PHOTO_SET_IDS.filter((each) => each.startsWith('mandat-'))) {
      const fiche = doc.split(`### Fiche — \`${id}\``)[1]!.split('\n### ')[0]!;
      const views = [...fiche.matchAll(/^ {2}\d\. `(\d{2}-[a-z0-9-]+\.jpg)`/gm)].map((m) => m[1]);
      expect(views.length, id).toBeGreaterThanOrEqual(DEMO_PHOTO_SET_RULES.minPhotos);
      expect(DEMO_PHOTO_SET_VIEWS[id], id).toEqual(views);
    }
  });

  it('un jeu ne s’affiche que complet : toutes les vues de sa fiche, rien d’autre', () => {
    const expected = ['01-facade.jpg', '02-sejour.jpg', '03-cuisine.jpg'];
    expect(
      completePhotoSet(['01-facade.jpg', '02-sejour.jpg', '03-cuisine.jpg'], expected),
    ).toEqual(expected);
    expect(completePhotoSet(['01-facade.jpg', '02-sejour.jpg'], expected)).toBeNull();
    expect(completePhotoSet(['01-facade.jpg'], undefined)).toEqual(['01-facade.jpg']);
    for (const id of DEMO_PHOTO_SET_IDS) {
      const views = DEMO_PHOTO_SET_VIEWS[id];
      const shown = demoPhotoSet(id);
      if (!views || !shown) continue;
      expect(shown, id).toEqual(views.map((file) => `${id}/${file}`));
    }
  });

  it('un dossier qui a une fiche ne contient que des vues de sa fiche', () => {
    for (const folder of folders) {
      const views = DEMO_PHOTO_SET_VIEWS[folder as (typeof DEMO_PHOTO_SET_IDS)[number]];
      if (!views) continue;
      for (const file of readdirSync(join(ROOT, folder)).filter((name) => FILE.test(name))) {
        expect(views, `${folder}/${file}`).toContain(file);
      }
    }
  });

  it('chaque jeu déposé a sa ligne au registre de docs/DEMO.md : source, licence, date', () => {
    const doc = readFileSync(join(process.cwd(), 'docs', 'DEMO.md'), 'utf8');
    for (const folder of demoPhotoSetFolders()) {
      const line = doc.split('\n').find((row) => row.includes(`\`${folder}/\``));
      expect(line, folder).toBeDefined();
      expect(line).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    }
  });

  it('une photo d’un jeu se sert par son chemin, jamais un chemin qui remonte', () => {
    expect(servedDemoPhotoFile('/demo/photos/mandat-mougins-villa/01-facade.jpg')).toBe(
      'mandat-mougins-villa/01-facade.jpg',
    );
    expect(servedDemoPhotoFile('/demo/photos/../secret/01-facade.jpg')).toBeNull();
    expect(servedDemoPhotoFile('/demo/photos/a/b/01-facade.jpg')).toBeNull();
    expect(existsSync(ROOT)).toBe(true);
  });
});

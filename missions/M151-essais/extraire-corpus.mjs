// Mission 151, étape 0 — reconstitue HORS du dépôt les 73 annonces réelles de la mesure du 10/11
// (concurrents importés de SeLoger et Bien'ici, lus dans une sauvegarde locale), pour
// `mesure.mjs --classement`. Leur texte n'entre jamais dans le dépôt.
//   node missions/M151-essais/extraire-corpus.mjs <sauvegarde>/data-public.sql <sortie.json>

import { readFileSync, writeFileSync } from 'node:fs';

const [dump, out] = process.argv.slice(2);
if (!dump || !out) throw new Error('usage : extraire-corpus.mjs <data-public.sql> <sortie.json>');
const sql = readFileSync(dump, 'utf8').split('\n');
const start = sql.findIndex((l) => l.startsWith('COPY "public"."comparables"'));
const cols = sql[start]
  .match(/\((.*)\) FROM stdin/)[1]
  .split(', ')
  .map((c) => c.replace(/"/g, ''));
const rows = [];
for (let j = start + 1; sql[j] !== '\\.'; j += 1) {
  const f = sql[j]
    .split('\t')
    .map((v) =>
      v === '\\N'
        ? null
        : v
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '')
            .replace(/\\t/g, ' ')
            .replace(/\\\\/g, '\\'),
    );
  rows.push(Object.fromEntries(cols.map((c, k) => [c, f[k]])));
}
const seen = new Set();
const corpus = [];
for (const r of rows) {
  if (!r.listing_description || r.listing_description.length <= 80) continue;
  if (/demonstration\.invalid|exempleville/i.test(`${r.listing_url ?? ''}${r.city ?? ''}`)) continue;
  const key = r.listing_url ?? r.listing_description.slice(0, 60);
  if (seen.has(key)) continue;
  seen.add(key);
  corpus.push({ id: r.id, type: r.property_type, city: r.city, d: r.listing_description, f: r.listing_features });
}
writeFileSync(out, JSON.stringify(corpus, null, 1));
console.log(`${corpus.length} annonces écrites dans ${out}`);

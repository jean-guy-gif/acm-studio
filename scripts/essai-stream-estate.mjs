// Script jetable — essai API Stream Estate (non commité). Mesure seulement.
// Écrit les réponses brutes dans OUT_DIR ; n'affiche jamais la clé.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const OUT_DIR = process.env.OUT_DIR ?? '/tmp/essai-stream-estate';
mkdirSync(OUT_DIR, { recursive: true });

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const KEY = env
  .match(/^STREAM_ESTATE_API_KEY=(.*)$/m)?.[1]
  ?.trim()
  .replace(/^["']|["']$/g, '');
if (!KEY) throw new Error('STREAM_ESTATE_API_KEY absente de .env.local');

const SEARCHES = {
  a: {
    label: 'Appartement 4 p, 72–88 m², 400–480 k€',
    type: 0,
    rooms: 4,
    surface: [72, 88],
    budget: [400000, 480000],
  },
  b: {
    label: 'Appartement 1 p, 17–23 m², 150–200 k€',
    type: 0,
    rooms: 1,
    surface: [17, 23],
    budget: [150000, 200000],
  },
  c: {
    label: 'Maison 5 p, 135–165 m², 650–950 k€',
    type: 1,
    rooms: 5,
    surface: [135, 165],
    budget: [650000, 950000],
  },
};

const only = process.argv.slice(2);
for (const [id, s] of Object.entries(SEARCHES)) {
  if (only.length && !only.includes(id)) continue;
  const p = new URLSearchParams();
  p.append('transactionType', '0');
  p.append('propertyTypes[]', String(s.type));
  p.append('includedInseeCodes[]', '06088');
  p.append('roomMin', String(s.rooms));
  p.append('roomMax', String(s.rooms));
  p.append('surfaceMin', String(s.surface[0]));
  p.append('surfaceMax', String(s.surface[1]));
  p.append('budgetMin', String(s.budget[0]));
  p.append('budgetMax', String(s.budget[1]));
  p.append('expired', 'false'); // les portails n'affichent que les annonces en ligne
  p.append('itemsPerPage', process.env.ITEMS ?? '30');
  if (process.env.ORDER) p.append('order[createdAt]', process.env.ORDER);
  if (process.env.FROM_UPDATED) p.append('fromUpdatedAt', process.env.FROM_UPDATED);
  if (process.env.PAGE) p.append('page', process.env.PAGE);
  const res = await fetch(`https://api.stream.estate/documents/properties?${p}`, {
    headers: { 'X-API-KEY': KEY, Accept: 'application/ld+json' },
  });
  const headers = Object.fromEntries([...res.headers].filter(([k]) => !/key|auth|cookie/i.test(k)));
  const body = await res.text();
  writeFileSync(`${OUT_DIR}/${id}${process.env.TAG ?? ''}${process.env.PAGE ?? ''}.json`, body);
  writeFileSync(
    `${OUT_DIR}/${id}${process.env.TAG ?? ''}${process.env.PAGE ?? ''}.headers.json`,
    JSON.stringify({ status: res.status, headers }, null, 2),
  );
  console.log(id, res.status, body.length, 'octets');
}

// Lancement, mission 9 — mesure du coût de la lecture des annonces par l'IA, sur vingt annonces
// RÉELLES (demande de Jean-Guy, 23/11) : le texte, avec la demande de la production telle quelle,
// puis les photos, avec la demande du code (`photo-request.ts`). Outil de mesure, pas du code produit : il n'entre ni
// dans `src/` ni dans `npm test`, et ne part que sur l'ordre de Jean-Guy.
//
//   L9_ANNONCES=<annonces.json, hors du dépôt> L9_SORTIE=<dossier, hors du dépôt> \
//   npx vitest run --config missions/L9-essais/vitest.mesure.config.mjs
//
// `annonces.json` : une liste de { id, text, photos: [adresses], type, city }, tirée de la base en
// lecture seule (les concurrents des vraies agences). Rien n'en est écrit dans le dépôt : seuls
// les chiffres du bilan y entrent (`missions/L9-mesure.md`). La clé AWS est lue dans `.env.local`,
// jamais affichée. Une photo que son hébergeur refuse est comptée, jamais contournée.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { test } from 'vitest';

import { BUYER_SOFT_CRITERIA } from '@/features/buyers/types';
import {
  PHOTO_CRITERIA,
  photoInstructions,
  photoSchema,
} from '@/features/soft-ranking/photo-request';
import {
  RANKING_BATCH,
  RANKING_MAX_OUTPUT_TOKENS,
  rankingBatchText,
  rankingInstructions,
  rankingSchema,
} from '@/features/soft-ranking/ranking-request';
import { callStructured } from '@/lib/ai/bedrock';
import { costMillicents } from '@/lib/ai/models';

const MODEL = process.env.L9_MODELE ?? 'eu.anthropic.claude-sonnet-4-6';
const PHOTOS_PER_LISTING = Number(process.env.L9_PHOTOS ?? 6);
const SMALL_EDGE = Number(process.env.L9_PETIT_COTE ?? 640);
const POOL = 3;

// --- outils ------------------------------------------------------------------------------------

function loadKeys() {
  const file = readFileSync('.env.local', 'utf8');
  for (const key of ['ACM_AWS_ACCESS_KEY_ID', 'ACM_AWS_SECRET_ACCESS_KEY', 'ACM_AWS_REGION']) {
    const value = file
      .match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]
      ?.trim()
      .replace(/^["']|["']$/g, '');
    if (!value) throw new Error(`${key} manque dans .env.local`);
    process.env[key] = value;
  }
}

async function inPool(items, run) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.min(POOL, queue.length) }, async () => {
      for (let item = queue.shift(); item !== undefined; item = queue.shift()) await run(item);
    }),
  );
}

const MEDIA = { 'image/jpeg': 1, 'image/png': 1, 'image/webp': 1, 'image/gif': 1 };

// Une photo telle que son hébergeur la sert, et la même réduite. Un refus ou une image trop
// lourde se compte ; rien n'est contourné.
async function fetchPhoto(url, sharp) {
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  } catch {
    return { refused: 'réseau' };
  }
  if (!response.ok) return { refused: `HTTP ${response.status}` };
  const mediaType = (response.headers.get('content-type') ?? '').split(';')[0].trim();
  if (!MEDIA[mediaType]) return { refused: `type ${mediaType || 'inconnu'}` };
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 4_500_000) return { refused: 'trop lourde' };
  const meta = await sharp(bytes).metadata();
  const small = await sharp(bytes)
    .rotate()
    .resize({ width: SMALL_EDGE, height: SMALL_EDGE, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .toBuffer();
  const smallMeta = await sharp(small).metadata();
  return {
    asIs: { mediaType, data: bytes.toString('base64'), bytes: bytes.length },
    small: { mediaType: 'image/jpeg', data: small.toString('base64'), bytes: small.length },
    size: `${meta.width}×${meta.height}`,
    smallSize: `${smallMeta.width}×${smallMeta.height}`,
  };
}

const photoContent = (photos, variant) =>
  photos.flatMap((photo, index) => [
    { type: 'text', text: `Photo ${index + 1} :` },
    {
      type: 'image',
      source: {
        type: 'base64',
        media_type: photo[variant].mediaType,
        data: photo[variant].data,
      },
    },
  ]);

const euros = (millicents) => (millicents / 100_000).toFixed(4).replace('.', ',');
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / (values.length || 1);
const round = (value) => Math.round(value);

// --- la mesure -----------------------------------------------------------------------------------

test('mesure : le texte puis les photos de vingt annonces réelles', async () => {
  const source = process.env.L9_ANNONCES;
  const out = process.env.L9_SORTIE;
  if (!source || !out) throw new Error('L9_ANNONCES et L9_SORTIE sont exigés (hors du dépôt)');
  mkdirSync(out, { recursive: true });
  loadKeys();
  const { default: sharp } = await import('sharp');
  const listings = JSON.parse(readFileSync(source, 'utf8')).map((row, index) => ({
    key: `a${index + 1}`,
    id: row.id,
    text: row.text,
    tags: [],
    photos: row.photos,
    label: [row.type, row.city].filter(Boolean).join(' · '),
  }));
  const lines = [];
  const say = (line = '') => {
    lines.push(line);
    console.log(line);
  };
  const raw = { model: MODEL, text: {}, photos: {} };

  // 1. Le texte, avec la demande de la production : lots de 8, trois à la fois.
  const textPass = async (name, criteria) => {
    const batches = [];
    for (let i = 0; i < listings.length; i += RANKING_BATCH)
      batches.push(
        listings.slice(i, i + RANKING_BATCH).map((listing) => ({ id: listing.key, listing })),
      );
    const calls = [];
    const verdicts = {};
    const started = Date.now();
    await inPool(batches, async (batch) => {
      const at = Date.now();
      const answer = await callStructured({
        system: rankingInstructions(criteria),
        content: [{ type: 'text', text: rankingBatchText(batch) }],
        schema: rankingSchema(criteria),
        maxTokens: RANKING_MAX_OUTPUT_TOKENS,
        model: MODEL,
      });
      calls.push({
        listings: batch.length,
        ok: answer.ok,
        cause: answer.ok ? null : answer.cause,
        usage: answer.usage,
        ms: Date.now() - at,
      });
      if (answer.ok)
        for (const entry of answer.json.annonces ?? [])
          verdicts[entry.id] = Object.fromEntries(
            (entry.jugements ?? []).map((j) => [j.critere, j.verdict]),
          );
    });
    const usage = calls.reduce(
      (sum, call) => ({
        input_tokens: sum.input_tokens + (call.usage?.input_tokens ?? 0),
        output_tokens: sum.output_tokens + (call.usage?.output_tokens ?? 0),
      }),
      { input_tokens: 0, output_tokens: 0 },
    );
    const cost = costMillicents(MODEL, usage) ?? 0;
    raw.text[name] = { criteria, calls, verdicts, usage, cost, wallMs: Date.now() - started };
    say(
      `| Texte, ${criteria.length} critères | ${listings.length} annonces en ${calls.length} appels | ${usage.input_tokens} | ${usage.output_tokens} | ${euros(cost)} € | ${euros(cost / listings.length)} € | ${round(mean(calls.map((c) => c.ms)) / 100) / 10} s par appel, ${round((Date.now() - started) / 100) / 10} s en tout |`,
    );
    return verdicts;
  };

  say(`# Mesure du ${new Date().toISOString().slice(0, 10)} — ${MODEL}`);
  say();
  say(`Vingt annonces réelles (${listings.length} lues), texte de ${round(mean(listings.map((l) => l.text.length)))} caractères en moyenne.`);
  say();
  say('| Lecture | Volume | Jetons lus | Jetons écrits | Coût | Par annonce | Durée |');
  say('| --- | --- | --- | --- | --- | --- | --- |');
  const textVerdicts = await textPass('dix', [...BUYER_SOFT_CRITERIA]);
  await textPass('trois', ['calme', 'lumineux', 'vue']);

  // 2. Les photos : les premières de chaque annonce, telles quelles puis réduites.
  const refused = {};
  const loaded = [];
  await inPool(listings, async (listing) => {
    const photos = [];
    for (const url of listing.photos.slice(0, PHOTOS_PER_LISTING)) {
      const photo = await fetchPhoto(url, sharp);
      if (photo.refused) refused[photo.refused] = (refused[photo.refused] ?? 0) + 1;
      else photos.push(photo);
    }
    loaded.push({ listing, photos });
  });

  const photoPass = async (name, variant) => {
    const calls = [];
    const started = Date.now();
    await inPool(
      loaded.filter((entry) => entry.photos.length > 0),
      async ({ listing, photos }) => {
        const at = Date.now();
        const answer = await callStructured({
          system: photoInstructions(PHOTO_CRITERIA),
          content: photoContent(photos, variant),
          schema: photoSchema(PHOTO_CRITERIA),
          maxTokens: 1200,
          model: MODEL,
        });
        calls.push({
          key: listing.key,
          photos: photos.length,
          bytes: photos.reduce((sum, photo) => sum + photo[variant].bytes, 0),
          ok: answer.ok,
          cause: answer.ok ? null : answer.cause,
          usage: answer.usage,
          ms: Date.now() - at,
          verdicts: answer.ok
            ? Object.fromEntries(
                (answer.json.jugements ?? []).map((j) => [
                  j.critere,
                  { verdict: j.verdict, photos: j.photos },
                ]),
              )
            : null,
        });
      },
    );
    const done = calls.filter((call) => call.usage);
    const usage = done.reduce(
      (sum, call) => ({
        input_tokens: sum.input_tokens + call.usage.input_tokens,
        output_tokens: sum.output_tokens + call.usage.output_tokens,
      }),
      { input_tokens: 0, output_tokens: 0 },
    );
    const cost = costMillicents(MODEL, usage) ?? 0;
    const photoCount = done.reduce((sum, call) => sum + call.photos, 0);
    raw.photos[name] = { calls, usage, cost, wallMs: Date.now() - started };
    say(
      `| Photos ${name} | ${done.length} annonces, ${photoCount} photos (${round(mean(done.map((c) => c.bytes)) / 1024)} Ko par annonce) | ${usage.input_tokens} | ${usage.output_tokens} | ${euros(cost)} € | ${euros(cost / (done.length || 1))} € | ${round(mean(done.map((c) => c.ms)) / 100) / 10} s par annonce |`,
    );
    return { calls, cost, photoCount, usage };
  };
  const asIs = await photoPass('telles quelles', 'asIs');
  const small = await photoPass(`réduites à ${SMALL_EDGE} px`, 'small');

  say();
  const sizes = loaded.flatMap((entry) => entry.photos.map((photo) => photo.size));
  const sizeCount = {};
  for (const size of sizes) sizeCount[size] = (sizeCount[size] ?? 0) + 1;
  say(
    `Photos chargées : ${sizes.length} sur ${listings.length * PHOTOS_PER_LISTING} demandées ; refusées : ${JSON.stringify(refused)}. Tailles servies : ${Object.entries(
      sizeCount,
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([size, count]) => `${size} (${count})`)
      .join(', ')}.`,
  );
  say(
    `Jetons par photo : ${round(asIs.usage.input_tokens / (asIs.photoCount || 1))} telle quelle, ${round(small.usage.input_tokens / (small.photoCount || 1))} réduite (la consigne comprise).`,
  );
  const failures = [...asIs.calls, ...small.calls].filter((call) => !call.ok);
  say(`Appels en échec : ${failures.length} (${failures.map((call) => call.cause).join(', ') || 'aucun'}).`);

  // 3. Les deux tailles disent-elles la même chose ? Et qu'apportent les photos au texte ?
  let same = 0;
  let compared = 0;
  const tally = { montre: 0, contraire: 0, ne_se_voit_pas: 0 };
  let adds = 0;
  let contradicts = 0;
  const TEXT_SAYS = { clairement: 'montre', reserve: 'montre', contraire: 'contraire' };
  for (const big of asIs.calls) {
    const little = small.calls.find((call) => call.key === big.key);
    if (!big.verdicts || !little?.verdicts) continue;
    for (const key of PHOTO_CRITERIA) {
      const a = big.verdicts[key]?.verdict;
      const b = little.verdicts[key]?.verdict;
      if (!a || !b) continue;
      compared += 1;
      if (a === b) same += 1;
      tally[b] += 1;
      const text = textVerdicts[big.key]?.[key];
      if ((text === 'rien' || text === undefined) && b !== 'ne_se_voit_pas') adds += 1;
      if (TEXT_SAYS[text] && b !== 'ne_se_voit_pas' && TEXT_SAYS[text] !== b) contradicts += 1;
    }
  }
  say(
    `Même verdict aux deux tailles : ${same} sur ${compared} (${round((same / (compared || 1)) * 100)} %). Verdicts des photos réduites : ${tally.montre} « montre », ${tally.contraire} « contraire », ${tally.ne_se_voit_pas} « ne se voit pas ».`,
  );
  say(
    `Là où le texte ne disait rien, les photos réduites disent quelque chose ${adds} fois sur ${compared} ; elles contredisent le texte ${contradicts} fois.`,
  );

  writeFileSync(join(out, 'resultats.json'), JSON.stringify(raw, null, 1));
  writeFileSync(join(out, 'bilan.md'), `${lines.join('\n')}\n`);
}, 1_500_000);

// La rafale (L9_RAFALE=1) : soixante annonces — les vingt, trois fois — avec les dix critères, tous
// les lots lancés ensemble. Dit si le fournisseur étrangle huit appels à la fois, et le temps que
// prend le texte d'une recherche entière (le délai de la production est de 30 s).
test.runIf(process.env.L9_RAFALE === '1')(
  'rafale : soixante annonces, tous les lots ensemble',
  async () => {
    const source = process.env.L9_ANNONCES;
    const out = process.env.L9_SORTIE;
    if (!source || !out) throw new Error('L9_ANNONCES et L9_SORTIE sont exigés (hors du dépôt)');
    loadKeys();
    const rows = JSON.parse(readFileSync(source, 'utf8'));
    const listings = [0, 1, 2].flatMap((round) =>
      rows.map((row, index) => ({
        key: `a${round * rows.length + index + 1}`,
        text: row.text,
        tags: [],
      })),
    );
    const criteria = [...BUYER_SOFT_CRITERIA];
    const batches = [];
    for (let i = 0; i < listings.length; i += RANKING_BATCH)
      batches.push(
        listings.slice(i, i + RANKING_BATCH).map((listing) => ({ id: listing.key, listing })),
      );
    const started = Date.now();
    const calls = await Promise.all(
      batches.map(async (batch) => {
        const at = Date.now();
        const answer = await callStructured({
          system: rankingInstructions(criteria),
          content: [{ type: 'text', text: rankingBatchText(batch) }],
          schema: rankingSchema(criteria),
          maxTokens: RANKING_MAX_OUTPUT_TOKENS,
          model: MODEL,
          timeoutMs: 60_000,
        });
        return {
          listings: batch.length,
          ok: answer.ok,
          cause: answer.ok ? null : answer.cause,
          judged: answer.ok ? (answer.json.annonces ?? []).length : 0,
          usage: answer.usage,
          ms: Date.now() - at,
        };
      }),
    );
    const usage = calls.reduce(
      (sum, call) => ({
        input_tokens: sum.input_tokens + (call.usage?.input_tokens ?? 0),
        output_tokens: sum.output_tokens + (call.usage?.output_tokens ?? 0),
      }),
      { input_tokens: 0, output_tokens: 0 },
    );
    const line = `Rafale : ${listings.length} annonces, ${calls.length} appels ensemble, ${calls.filter((c) => !c.ok).length} en échec (${calls.filter((c) => !c.ok).map((c) => c.cause).join(', ') || 'aucun'}), ${calls.reduce((sum, c) => sum + c.judged, 0)} annonces jugées, ${round((Date.now() - started) / 100) / 10} s en tout (appels de ${calls.map((c) => round(c.ms / 100) / 10).join(', ')} s), ${euros(costMillicents(MODEL, usage) ?? 0)} €.`;
    console.log(line);
    writeFileSync(join(out, 'rafale.md'), `${line}\n`);
  },
  300_000,
);

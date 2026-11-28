// Lot B4 — mesure de « Comment finance-t-il ? » lu dans les notes (INVENTÉ), contre les corrigés
// écrits AVANT (`corriges.json`, commité avant l'appel). La demande est celle de la production,
// importée telle quelle (`model-request.ts`), et la réponse passe par la garde du serveur
// (`guard-proposal.ts`). Outil de mesure, pas du code produit : il n'entre ni dans `src/` ni dans
// `npm test`.
//
//   LB4_SORTIE=<dossier hors du dépôt> \
//   npx vitest run --config missions/LB4-essais/vitest.mesure.config.mjs
//
// Variables : LB4_MODELE (défaut : le modèle de la production, Sonnet 4.6 par son profil « EU »),
// LB4_PASSES (défaut 2), LB4_CAS (seulement ces cas). Plafond : 0,50 € en tout ; au-delà, plus aucun appel ne part. La clé AWS
// est lue dans `.env.local`, jamais affichée. Seul le bilan entre dans le dépôt
// (`missions/LB4-mesure.md`) ; les réponses brutes restent dans LB4_SORTIE.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { test } from 'vitest';

import {
  NOTE_MAX_OUTPUT_TOKENS,
  NOTE_OUTPUT_SCHEMA,
  NOTE_READING_INSTRUCTIONS,
} from '@/features/buyer-notes/model-request';
import { guardProposal } from '@/features/buyer-notes/services/guard-proposal';
import { callStructured } from '@/lib/ai/bedrock';
import { AI_DEFAULT_MODEL, costMillicents } from '@/lib/ai/models';

const here = dirname(fileURLToPath(import.meta.url));
const MODEL = process.env.LB4_MODELE ?? AI_DEFAULT_MODEL;
const PASSES = Number(process.env.LB4_PASSES ?? 2);
const CAP_MILLICENTS = 50_000; // 0,50 €
const ONE_CALL_WORST = 6_000; // 0,06 € : un appel ne part pas s'il pouvait franchir le plafond
const POOL = 3;

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

const fold = (value) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
const wordAt = (word) =>
  new RegExp(`(^|[^a-z0-9])${fold(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);

async function inPool(items, run) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.min(POOL, queue.length) }, async () => {
      for (let item = queue.shift(); item !== undefined; item = queue.shift()) await run(item);
    }),
  );
}

test('lot B4 — comment il finance, lu dans les notes', async () => {
  loadKeys();
  const out = process.env.LB4_SORTIE;
  if (!out) throw new Error('LB4_SORTIE manque : un dossier hors du dépôt');
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const dir = join(out, `lb4-${stamp}`);
  mkdirSync(dir, { recursive: true });

  const { cas } = JSON.parse(readFileSync(join(here, 'corriges.json'), 'utf8'));
  const runs = [];
  // LB4_CAS=N8,C5 : seulement ces cas (pour rejouer un appel retenu par le plafond).
  const only = process.env.LB4_CAS?.split(',').filter(Boolean) ?? null;
  for (const [id, expected] of Object.entries(cas)) {
    if (only && !only.includes(id)) continue;
    const text = readFileSync(join(here, expected.source), 'utf8');
    for (let pass = 1; pass <= PASSES; pass += 1) runs.push({ id, pass, expected, text });
  }

  let spent = 0;
  const results = [];
  await inPool(runs, async (run) => {
    if (spent + ONE_CALL_WORST > CAP_MILLICENTS) {
      results.push({ ...run, skipped: 'plafond' });
      return;
    }
    spent += ONE_CALL_WORST; // réservé, réglé au coût réel après
    const answer = await callStructured({
      system: NOTE_READING_INSTRUCTIONS,
      content: [{ type: 'text', text: run.text }],
      schema: NOTE_OUTPUT_SCHEMA,
      maxTokens: NOTE_MAX_OUTPUT_TOKENS,
      model: MODEL,
    });
    const cost = answer.usage ? (costMillicents(MODEL, answer.usage) ?? ONE_CALL_WORST) : ONE_CALL_WORST;
    spent += cost - ONE_CALL_WORST;
    writeFileSync(
      join(dir, `${run.id}-passe${run.pass}.json`),
      JSON.stringify({ ok: answer.ok, cause: answer.ok ? null : answer.cause, usage: answer.usage, json: answer.ok ? answer.json : null }, null, 2),
    );
    if (!answer.ok) {
      results.push({ ...run, failed: answer.cause, cost });
      return;
    }
    const raw = answer.json ?? {};
    const rawSource = (Array.isArray(raw.sources) ? raw.sources : []).find(
      (s) => s && s.field === 'financing_mode',
    )?.quote ?? null;
    const guarded = guardProposal(raw);
    results.push({
      ...run,
      cost,
      rawMode: raw.financing_mode ?? null,
      rawSource,
      mode: guarded.financingMode,
      modeSource: guarded.financingModeSource,
      state: guarded.financing,
      stateSource: guarded.financingSource,
    });
  });

  // --- notation ---------------------------------------------------------------------------------
  const order = Object.keys(cas);
  results.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id) || a.pass - b.pass);
  const rows = [];
  let modeOk = 0;
  let stateOk = 0;
  let invented = 0;
  let missed = 0;
  let refusedByGuard = 0;
  let sourceLeaks = 0;
  let done = 0;
  for (const r of results) {
    if (r.skipped || r.failed) {
      rows.push(`| ${r.id} | ${r.pass} | ${r.skipped ? 'non appelé (plafond)' : `échec : ${r.failed}`} | | | | |`);
      continue;
    }
    done += 1;
    const e = r.expected;
    const goodMode = r.mode === e.mode;
    const goodState = r.state === e.etat || (e.accepte_etat ?? []).includes(r.state);
    if (goodMode) modeOk += 1;
    if (goodState) stateOk += 1;
    if (r.mode && !e.mode) invented += 1;
    if (!r.mode && e.mode) missed += 1;
    if (r.rawMode && r.rawMode !== 'not_said' && !r.mode) refusedByGuard += 1;
    const shown = fold(`${r.modeSource ?? ''} ${r.stateSource ?? ''}`);
    const leaks = (e.jamais ?? []).filter((w) => wordAt(w).test(shown));
    if (leaks.length) sourceLeaks += 1;
    rows.push(
      `| ${r.id} | ${r.pass} | ${e.mode ?? '—'} → **${r.mode ?? '—'}** ${goodMode ? '✓' : '✗'} (modèle : ${r.rawMode ?? '—'}) | ${e.etat ?? '—'} → ${r.state ?? '—'} ${goodState ? '✓' : '✗'} | ${r.modeSource ?? (r.rawSource ? `refusée : « ${r.rawSource} »` : '—')} | ${leaks.length ? leaks.join(', ') : '—'} | ${(r.cost / 100_000).toFixed(4)} € |`,
    );
  }
  const bilan = [
    `# Lot B4 — mesure du ${stamp}`,
    '',
    `Modèle : ${MODEL} · ${PASSES} passes · ${done} appels sur ${runs.length} · coût réel ${(spent / 100_000).toFixed(2)} €`,
    '',
    `Mode juste : ${modeOk}/${done} · état juste : ${stateOk}/${done} · mode inventé : ${invented} · mode manqué : ${missed} · refusé par la garde : ${refusedByGuard} · mot de M151 dans une source montrée : ${sourceLeaks}`,
    '',
    '| Cas | Passe | Mode attendu → gardé | État attendu → gardé | Ligne montrée au conseiller | Mot « jamais » dans la ligne | Coût |',
    '|---|---|---|---|---|---|---|',
    ...rows,
    '',
  ].join('\n');
  writeFileSync(join(dir, 'bilan.md'), bilan);
  console.log(bilan);
});

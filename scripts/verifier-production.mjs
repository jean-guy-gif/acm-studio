// Mission 100 — `npm run verifier:production` : attend que la production serve le dernier commit
// de `main` (celui d'origin), et le dit. Échoue au bout de 10 minutes. Lecture seule : elle
// interroge /api/version, qui ne renvoie que le commit déployé.
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const PRODUCTION_URL = (
  process.env.ACM_PRODUCTION_URL ?? 'https://acm-studio-henna.vercel.app'
).replace(/\/$/, '');
const TIMEOUT_MS = 10 * 60_000;
const EVERY_MS = 15_000;

const git = (...args) =>
  execFileSync('git', args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

try {
  git('fetch', '--quiet', 'origin', 'main');
} catch {
  console.error('✖ `git fetch origin main` a échoué : impossible de connaître le commit attendu.');
  process.exit(1);
}
const expected = git('rev-parse', 'origin/main');
const short = (sha) => (typeof sha === 'string' && sha !== '' ? sha.slice(0, 7) : 'inconnu');

async function deployed() {
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/version`, {
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status !== 200) return { commit: null, note: `réponse ${response.status}` };
    const body = await response.json();
    return { commit: typeof body?.commit === 'string' ? body.commit : null, note: null };
  } catch (error) {
    return { commit: null, note: error instanceof Error ? error.message : 'injoignable' };
  }
}

console.log(`Attendu : le commit ${short(expected)} de main, sur ${PRODUCTION_URL}`);
const start = Date.now();
let last = { commit: null, note: null };
for (;;) {
  last = await deployed();
  if (last.commit === expected) {
    console.log(`✔ production à jour (${short(expected)})`);
    process.exit(0);
  }
  if (Date.now() - start >= TIMEOUT_MS) break;
  const seen = last.commit
    ? `sert encore ${short(last.commit)}`
    : `ne dit pas son commit (${last.note ?? 'aucun'})`;
  console.log(`  … ${Math.round((Date.now() - start) / 1000)} s — la production ${seen}`);
  await new Promise((done) => setTimeout(done, EVERY_MS));
}
console.error(
  `✖ Après 10 minutes, la production ne sert pas ${short(expected)} (${
    last.commit ? `elle sert ${short(last.commit)}` : (last.note ?? 'commit non publié')
  }). Regardez le déploiement sur Vercel.`,
);
process.exit(1);

// Mission 126 — les trois cartes : Base, Essai, Production. Chaque lecture parse la sortie d'une
// commande ou d'une adresse et n'en garde que des faits nommés : jamais une sortie brute, jamais un
// secret (le jeton de contournement de l'essai est lu dans `.env.e2e.local` et ne sort jamais).
import { execFile } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const PRODUCTION_URL = (
  process.env.ACM_PRODUCTION_URL ?? 'https://acm-studio-henna.vercel.app'
).replace(/\/$/, '');

// Les variables de `.env.e2e.local` qui servent : l'adresse de l'essai et son jeton. Le jeton reste ici.
export function lireEnvE2e(dossier) {
  const chemin = join(dossier, '.env.e2e.local');
  const valeurs = {};
  if (!existsSync(chemin)) return valeurs;
  for (const ligne of readFileSync(chemin, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(ligne);
    if (m) valeurs[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return valeurs;
}

// « migration en attente » = un fichier de `supabase/migrations/` sur la branche qui n'est pas dans
// `migration list --linked` (décision de Jean-Guy du 29/10 : c'est lui qui l'applique, en orange).
export function migrationsLocales(dossier) {
  const chemin = join(dossier, 'supabase', 'migrations');
  if (!existsSync(chemin)) return [];
  return readdirSync(chemin)
    .filter((f) => /^\d{14}_.+\.sql$/.test(f))
    .map((f) => ({ version: f.slice(0, 14), nom: f.slice(15, -4) }))
    .sort((a, b) => a.version.localeCompare(b.version));
}

export function lireListeMigrations(sortie) {
  try {
    const lu = JSON.parse(sortie);
    return (lu.migrations ?? []).map((m) => ({ local: m.local ?? '', remote: m.remote ?? '' }));
  } catch {
    // La forme tableau de la CLI (TTY) : « 20261116090000 | 20261116090000 | 2026-11-16 09:00:00 ».
    return String(sortie)
      .split('\n')
      .map((l) => l.split('|').map((c) => c.trim()))
      .filter((c) => c.length >= 2 && /^\d{14}$/.test(c[0] || c[1]))
      .map(([local, remote]) => ({ local, remote }));
  }
}

export function carteBase(liste, locales) {
  const appliquees = new Set(liste.filter((m) => m.remote).map((m) => m.remote));
  const derniere = [...appliquees].sort().at(-1) ?? null;
  const enAttente = locales.filter((m) => !appliquees.has(m.version));
  return {
    derniereAppliquee: derniere
      ? { version: derniere, nom: locales.find((m) => m.version === derniere)?.nom ?? '' }
      : null,
    enAttente,
    lueA: new Date().toISOString(),
    erreur: null,
  };
}

export async function lireBase(dossiers) {
  try {
    const { stdout } = await run('npx', ['supabase', 'migration', 'list', '--linked'], {
      cwd: dossiers[0],
      timeout: 60_000,
      env: { ...process.env, CI: '1' },
    });
    const liste = lireListeMigrations(stdout);
    const locales = dossiers.flatMap(migrationsLocales);
    const vues = new Map(locales.map((m) => [m.version, m]));
    return carteBase(
      liste,
      [...vues.values()].sort((a, b) => a.version.localeCompare(b.version)),
    );
  } catch {
    return {
      derniereAppliquee: null,
      enAttente: [],
      lueA: new Date().toISOString(),
      erreur: 'Base illisible',
    };
  }
}

async function commitServi(url, entetes = {}) {
  try {
    const reponse = await fetch(`${url}/api/version`, { headers: entetes, redirect: 'manual' });
    if (!reponse.ok) return { commit: null, erreur: `Réponse ${reponse.status}` };
    const lu = await reponse.json();
    return { commit: typeof lu.commit === 'string' ? lu.commit.slice(0, 7) : null, erreur: null };
  } catch {
    return { commit: null, erreur: 'Injoignable' };
  }
}

export function lireCi(sortie) {
  try {
    const course = JSON.parse(sortie)[0];
    if (!course) return { commit: null, etat: 'aucune', verte: null };
    return {
      commit: String(course.headSha ?? '').slice(0, 7),
      etat:
        course.status !== 'completed'
          ? 'en cours'
          : course.conclusion === 'success'
            ? 'verte'
            : course.conclusion === 'failure'
              ? 'rouge'
              : String(course.conclusion ?? 'inconnue'),
      verte: course.status === 'completed' ? course.conclusion === 'success' : null,
    };
  } catch {
    return { commit: null, etat: 'illisible', verte: null };
  }
}

export function budgetE2e(dossier) {
  try {
    const config = readFileSync(join(dossier, 'playwright.config.ts'), 'utf8');
    const m = /timeout:\s*(\d+)\s*\*\s*60_?000/.exec(config);
    return m ? Number(m[1]) * 60 : null;
  } catch {
    return null;
  }
}

export async function lireEssai(dossier, branche) {
  const env = lireEnvE2e(dossier);
  const url = (env.E2E_BASE_URL ?? 'https://acm-studio-essai.vercel.app').replace(/\/$/, '');
  const entetes = env.E2E_VERCEL_BYPASS
    ? { 'x-vercel-protection-bypass': env.E2E_VERCEL_BYPASS }
    : {};
  const [servi, ci] = await Promise.all([
    commitServi(url, entetes),
    branche
      ? run(
          'gh',
          ['run', 'list', '--branch', branche, '-L', '1', '--json', 'headSha,status,conclusion'],
          {
            cwd: dossier,
            timeout: 30_000,
          },
        )
          .then(({ stdout }) => lireCi(stdout))
          .catch(() => ({ commit: null, etat: 'illisible', verte: null }))
      : Promise.resolve({ commit: null, etat: 'aucune', verte: null }),
  ]);
  return { ...servi, ci, budgetE2e: budgetE2e(dossier), lueA: new Date().toISOString() };
}

// La dernière fusion dans `main` : son sujet et sa date, lus dans le dépôt (origin/main).
export async function derniereFusion(dossier) {
  try {
    const { stdout } = await run('git', ['log', '-1', '--format=%s%n%cI', 'origin/main'], {
      cwd: dossier,
      timeout: 10_000,
    });
    const [sujet, date] = stdout.trim().split('\n');
    return { sujet: (sujet ?? '').slice(0, 120), date: date ?? null };
  } catch {
    return { sujet: '', date: null };
  }
}

export async function lireProduction(dossier) {
  const [servi, fusion] = await Promise.all([commitServi(PRODUCTION_URL), derniereFusion(dossier)]);
  return { ...servi, fusion, lueA: new Date().toISOString() };
}

// Le titre d'une mission, lu dans `missions/MISSION_<NN>_*.md` (« # MISSION 120 — « … » »).
export function titreDeMission(dossier, mission) {
  try {
    const chemin = join(dossier, 'missions');
    const fichier = readdirSync(chemin).find((f) =>
      new RegExp(`^MISSION_${mission}_.*\\.md$`, 'i').test(f),
    );
    if (!fichier) return null;
    const premiere = readFileSync(join(chemin, fichier), 'utf8').split('\n')[0] ?? '';
    const m = /^#\s*MISSION\s+\S+\s*[—–-]\s*(.+)$/.exec(premiere.trim());
    return m ? m[1].trim().slice(0, 120) : null;
  } catch {
    return null;
  }
}

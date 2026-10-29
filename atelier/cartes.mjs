// Mission 126 — les trois cartes : Base, Essai, Production. Chaque lecture parse la sortie d'une
// commande ou d'une adresse et n'en garde que des faits nommés : jamais une sortie brute, jamais un
// secret (le jeton de contournement de l'essai est lu dans `.env.e2e.local` et ne sort jamais).
// Chaque lecture a son délai et rend son erreur dans sa carte : aucune ne bloque ni ne fait tomber
// le serveur (constat A de Jean-Guy, 29/10).
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { masquerSecrets } from './secrets.mjs';

const PRODUCTION_URL = (
  process.env.ACM_PRODUCTION_URL ?? 'https://acm-studio-henna.vercel.app'
).replace(/\/$/, '');
export const DELAI_ADRESSE_MS = 15_000;

// Une commande, bornée : l'entrée fermée (une invite de mot de passe n'attend pas), le groupe de
// processus tué au délai (`npx` lance un enfant qui, sinon, garde la sortie ouverte).
export function commande(programme, args, { cwd, delai, env } = {}) {
  return new Promise((resoudre, rejeter) => {
    let sortie = '';
    let erreur = '';
    let fini = false;
    const enfant = spawn(programme, args, {
      cwd,
      env: env ?? process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
    });
    const minuterie = setTimeout(() => {
      if (fini) return;
      fini = true;
      try {
        process.kill(-enfant.pid, 'SIGKILL');
      } catch {
        enfant.kill('SIGKILL');
      }
      rejeter(new Error(`délai dépassé (${Math.round((delai ?? 0) / 1000)} s)`));
    }, delai ?? 30_000);
    enfant.stdout.on('data', (d) => {
      sortie += d;
    });
    enfant.stderr.on('data', (d) => {
      erreur += d;
    });
    enfant.on('error', (e) => {
      if (fini) return;
      fini = true;
      clearTimeout(minuterie);
      rejeter(e);
    });
    enfant.on('close', (code) => {
      if (fini) return;
      fini = true;
      clearTimeout(minuterie);
      if (code === 0) resoudre({ stdout: sortie, stderr: erreur });
      else rejeter(new Error(premiereLigne(erreur) || `sortie ${code}`));
    });
  });
}

function premiereLigne(texte) {
  const ligne = String(texte ?? '')
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l !== '');
  return ligne ? masquerSecrets(ligne).slice(0, 80) : '';
}

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

// « 20261118090000 » → « 18/11/2026 » : la date d'une migration, lue dans sa version.
export function dateDeVersion(version) {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(String(version ?? ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : null;
}

// « migration en attente » = un fichier de `supabase/migrations/` sur la branche qui n'est pas dans
// `migration list --linked` (décision de Jean-Guy du 29/10 : c'est lui qui l'applique, en orange).
export function migrationsLocales(dossier) {
  const chemin = join(dossier, 'supabase', 'migrations');
  if (!existsSync(chemin)) return [];
  return readdirSync(chemin)
    .filter((f) => /^\d{14}_.+\.sql$/.test(f))
    .map((f) => ({ version: f.slice(0, 14), nom: f.slice(15, -4), date: dateDeVersion(f) }))
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
      ? {
          version: derniere,
          nom: locales.find((m) => m.version === derniere)?.nom ?? '',
          date: dateDeVersion(derniere),
        }
      : null,
    enAttente,
    lueA: new Date().toISOString(),
    erreur: null,
  };
}

export async function lireBase(dossiers) {
  try {
    const { stdout } = await commande('npx', ['supabase', 'migration', 'list', '--linked'], {
      cwd: dossiers[0],
      delai: 60_000,
      env: { ...process.env, CI: '1' },
    });
    const liste = lireListeMigrations(stdout);
    // Chaque migration porte le dossier qui la contient : la consigne suit sa mission (relecteur).
    const locales = dossiers.flatMap((d) =>
      migrationsLocales(d).map((m) => ({ ...m, dossier: d })),
    );
    const vues = new Map(locales.map((m) => [m.version, m]));
    return carteBase(
      liste,
      [...vues.values()].sort((a, b) => a.version.localeCompare(b.version)),
    );
  } catch (e) {
    return {
      derniereAppliquee: null,
      enAttente: [],
      lueA: new Date().toISOString(),
      erreur: `Base illisible : ${premiereLigne(e?.message) || 'migration list a échoué'}`,
    };
  }
}

async function commitServi(url, entetes = {}) {
  try {
    const reponse = await fetch(`${url}/api/version`, {
      headers: entetes,
      redirect: 'manual',
      signal: AbortSignal.timeout(DELAI_ADRESSE_MS),
    });
    if (!reponse.ok) return { commit: null, erreur: `Réponse ${reponse.status}` };
    const lu = await reponse.json();
    return { commit: typeof lu.commit === 'string' ? lu.commit.slice(0, 7) : null, erreur: null };
  } catch (e) {
    return {
      commit: null,
      erreur: e?.name === 'TimeoutError' ? 'Pas de réponse en 15 s' : 'Injoignable',
    };
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
      ? commande(
          'gh',
          ['run', 'list', '--branch', branche, '-L', '1', '--json', 'headSha,status,conclusion'],
          { cwd: dossier, delai: 30_000 },
        )
          .then(({ stdout }) => lireCi(stdout))
          .catch(() => ({ commit: null, etat: 'illisible', verte: null }))
      : Promise.resolve({ commit: null, etat: 'aucune', verte: null }),
  ]);
  return {
    ...servi,
    branche: branche || null,
    ci,
    budgetE2e: budgetE2e(dossier),
    lueA: new Date().toISOString(),
  };
}

// La dernière fusion dans `main`, lue par `git ls-remote origin main` — jamais un `fetch` dans le
// dépôt de travail de Jean-Guy (décision du 29/10 : aucune ref locale touchée, pas de `.lock`) —,
// toutes les 5 min au plus ; le sujet et la date se lisent si le commit est déjà dans le dépôt.
const FUSION_CACHE_MS = 5 * 60_000;
const fusions = new Map();
export async function derniereFusion(dossier, maintenant = Date.now()) {
  const gardee = fusions.get(dossier);
  if (gardee && maintenant - gardee.a < FUSION_CACHE_MS) return gardee.fusion;
  let fusion = { commit: null, sujet: '', date: null };
  try {
    const { stdout } = await commande('git', ['ls-remote', 'origin', 'refs/heads/main'], {
      cwd: dossier,
      delai: 20_000,
    });
    const sha = /^([0-9a-f]{40})\s/.exec(stdout.trim())?.[1] ?? null;
    if (sha) {
      fusion = { commit: sha.slice(0, 7), sujet: '', date: null };
      try {
        const lu = await commande('git', ['log', '-1', '--format=%s%n%cI', sha], {
          cwd: dossier,
          delai: 10_000,
        });
        const [sujet, date] = lu.stdout.trim().split('\n');
        fusion = {
          commit: sha.slice(0, 7),
          sujet: masquerSecrets((sujet ?? '').slice(0, 120)),
          date: date ?? null,
        };
      } catch {
        // Le commit n'est pas encore dans le dépôt : son condensat suffit.
      }
    }
  } catch {
    // Le dépôt distant ne répond pas : la carte le dit par l'absence de fusion.
  }
  fusions.set(dossier, { a: maintenant, fusion });
  return fusion;
}

export async function lireProduction(dossier) {
  const [servi, fusion] = await Promise.all([commitServi(PRODUCTION_URL), derniereFusion(dossier)]);
  return { ...servi, fusion, lueA: new Date().toISOString() };
}

// Le titre d'une mission, lu dans `missions/MISSION_<NN>_*.md` (« # MISSION 120 — « … » ») ; une
// partie B (« 120B ») lit la fiche de sa mission (« MISSION_120_… »).
export function titreDeMission(dossier, mission) {
  try {
    const numero = String(mission ?? '').replace(/[A-Z]$/, '');
    if (!/^\d+$/.test(numero)) return null;
    const chemin = join(dossier, 'missions');
    const fichier = readdirSync(chemin).find((f) =>
      new RegExp(`^MISSION_${numero}_.*\\.md$`, 'i').test(f),
    );
    if (!fichier) return null;
    const premiere = readFileSync(join(chemin, fichier), 'utf8').split('\n')[0] ?? '';
    const m = /^#\s*MISSION\s+\S+\s*[—–-]\s*(.+)$/.exec(premiere.trim());
    return m ? masquerSecrets(m[1].trim().slice(0, 120)) : null;
  } catch {
    return null;
  }
}

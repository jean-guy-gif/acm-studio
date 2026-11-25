// La base d'essai séparée (décision de Jean-Guy du 25/11, `missions/BASE_JEUDI_MATIN.md`) : ce
// script la prépare et la compare à la production. Il ne vise QUE la base dont la référence est
// posée dans `.env.e2e.local` (`E2E_SUPABASE_REF`), et refuse la base de la production. La
// production n'est que LUE (un comptage de sa structure, sans aucune donnée).
//
//   npm run essai:preparer                   compare la structure des deux bases, et dit où en
//                                            sont les deux comptes de test (ne touche à rien)
//   npm run essai:preparer -- --structure    construit la structure : toutes les migrations du
//                                            dépôt, dans la base d'essai
//   npm run essai:preparer -- --agences      crée l'agence des tests et l'agence de démonstration
//                                            des tests, avec le profil de leur compte (une fois)
//
// Les deux comptes (E2E_EMAIL, E2E_DEMO_EMAIL) se créent d'abord dans la console de la base
// d'essai, avec les mots de passe de `.env.e2e.local` : ce script ne lit ni n'écrit aucun mot de
// passe.
import { execFileSync, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { linkedProjectRef, readTestEnv, testDatabaseTarget } from './base-des-tests.mjs';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const SUPABASE_CLI = ['--yes', 'supabase@3.0.0'];

// Les deux agences des tests, telles qu'elles existent dans la base commune (25/11) : le nom long
// de l'agence des tests est attendu par l'e2e (M72), celui de la démo ne dit pas « démo » (M114).
const TEST_AGENCY = {
  env: 'E2E_EMAIL',
  name: 'TEST AUTOMATIQUE — ne pas utiliser — agence au nom très long',
  firstName: 'test',
  lastName: 'automatique',
  demo: false,
};
const DEMO_AGENCY = {
  env: 'E2E_DEMO_EMAIL',
  name: 'Agence Horizon Côte d’Azur',
  firstName: 'Test',
  lastName: 'Démo',
  demo: true,
};

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

let essai;
try {
  essai = testDatabaseTarget({
    ref: readTestEnv('E2E_SUPABASE_REF'),
    linkedRef: linkedProjectRef(),
    separateRequired: true,
  });
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

function query(target, sql, { write = false } = {}) {
  let out;
  try {
    out = execFileSync(
      'npx',
      [
        ...SUPABASE_CLI,
        'db',
        'query',
        target,
        ...(write ? ['--yes'] : ['--read-only']),
        '--output-format',
        'json',
        '--agent',
        'no',
        sql,
      ],
      { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
  } catch (error) {
    const detail =
      error && typeof error === 'object' && 'stderr' in error ? String(error.stderr) : '';
    fail(`La base n’a pas répondu (${target}). ${detail.split('\n').find(Boolean) ?? ''}`);
  }
  const start = out.search(/[[{]/);
  if (start < 0) return [];
  const json = JSON.parse(
    out.slice(start, Math.max(out.lastIndexOf(']'), out.lastIndexOf('}')) + 1),
  );
  return Array.isArray(json) ? json : (json.rows ?? []);
}

// La structure, comptée : ce que la production a, la base d'essai doit l'avoir.
const STRUCTURE = `
select
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE') as "tables",
  (select count(*) from pg_policies where schemaname = 'public') as "politiques",
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public') as "fonctions",
  (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and not t.tgisinternal) as "déclencheurs",
  (select count(*) from pg_indexes where schemaname = 'public') as "index",
  (select count(*) from storage.buckets) as "espaces de fichiers",
  (select count(*) from cron.job) as "tâches de nuit",
  (select count(*) from supabase_migrations.schema_migrations) as "migrations"`;

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;

function accountState(agency) {
  const email = readTestEnv(agency.env);
  if (!email) fail(`${agency.env} manque dans .env.e2e.local.`);
  const [row] = query(
    essai.arg,
    `select
       (select count(*) from auth.users where lower(email) = lower(${quote(email)})) as compte,
       (select count(*) from public.profiles p join auth.users u on u.id = p.id
         where lower(u.email) = lower(${quote(email)})) as profil,
       (select a.name from public.agencies a join public.profiles p on p.agency_id = a.id
         join auth.users u on u.id = p.id where lower(u.email) = lower(${quote(email)})) as agence,
       (select a.is_demo from public.agencies a join public.profiles p on p.agency_id = a.id
         join auth.users u on u.id = p.id where lower(u.email) = lower(${quote(email)})) as demo`,
  );
  return { email, ...row };
}

function createAgency(agency) {
  const state = accountState(agency);
  if (Number(state.compte) === 0) {
    fail(
      `Le compte ${agency.env} n’existe pas dans la base d’essai : créez-le d’abord dans sa console (Authentication, « Create new user », confirmé d’office).`,
    );
  }
  if (Number(state.profil) > 0) {
    console.log(`  ${agency.env} : déjà en place (« ${state.agence} »).`);
    return;
  }
  query(
    essai.arg,
    `do $$
     declare v_user uuid; v_agency uuid;
     begin
       select id into v_user from auth.users where lower(email) = lower(${quote(state.email)});
       insert into public.agencies (name) values (${quote(agency.name)}) returning id into v_agency;
       insert into public.profiles (id, agency_id, first_name, last_name, email, role)
         select v_user, v_agency, ${quote(agency.firstName)}, ${quote(agency.lastName)}, u.email, 'manager'
         from auth.users u where u.id = v_user;
       ${agency.demo ? 'update public.agencies set is_demo = true where id = v_agency;' : ''}
     end $$;`,
    { write: true },
  );
  console.log(`  ${agency.env} : agence « ${agency.name} » créée, avec son profil.`);
}

const [, , ...flags] = process.argv;
console.log(
  `\nBase d’essai : ${essai.arg.replace('--remote=', '')} (jamais celle de la production).`,
);

if (flags.includes('--structure')) {
  console.log('\nConstruction de la structure (toutes les migrations du dépôt)…\n');
  const pushed = spawnSync('npx', [...SUPABASE_CLI, 'db', 'push', essai.arg, '--yes'], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });
  if (pushed.status !== 0)
    fail('La structure n’a pas pu être construite : lisez le message ci-dessus.');
}

if (flags.includes('--agences')) {
  console.log('\nLes deux agences des tests :');
  createAgency(TEST_AGENCY);
  createAgency(DEMO_AGENCY);
}

console.log('\nStructure, production contre base d’essai :');
const [production] = query('--remote', STRUCTURE);
const [separate] = query(essai.arg, STRUCTURE);
let same = true;
for (const key of Object.keys(production)) {
  const equal = Number(production[key]) === Number(separate[key]);
  same &&= equal;
  console.log(
    `  ${equal ? '✔' : '✖'} ${key.padEnd(20)} production ${String(production[key]).padStart(4)}   essai ${String(separate[key]).padStart(4)}`,
  );
}

console.log('\nLes deux comptes de test, dans la base d’essai :');
let ready = true;
for (const agency of [TEST_AGENCY, DEMO_AGENCY]) {
  const state = accountState(agency);
  const ok =
    Number(state.compte) === 1 &&
    Number(state.profil) === 1 &&
    state.agence === agency.name &&
    Boolean(state.demo) === agency.demo;
  ready &&= ok;
  console.log(
    `  ${ok ? '✔' : '✖'} ${agency.env.padEnd(15)} compte ${state.compte} · profil ${state.profil} · agence ${state.agence ? `« ${state.agence} »` : 'absente'}${agency.demo ? ` · démonstration ${state.demo ? 'oui' : 'non'}` : ''}`,
  );
}

if (same && ready) {
  console.log(
    '\n✔ La base d’essai est prête : même structure que la production, les deux comptes en place.\n',
  );
} else {
  console.log('\n✖ La base d’essai n’est pas encore prête (voir les lignes marquées ✖).\n');
  process.exitCode = 1;
}

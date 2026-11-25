// La base d'essai séparée (décision de Jean-Guy du 25/11, `missions/BASE_JEUDI_MATIN.md`) : ce
// script la prépare et la compare à la production. Il ne vise QUE le projet Supabase nommé
// `acm-studio-essai`, dont la référence est posée dans `.env.e2e.local` (`E2E_SUPABASE_REF`), et
// refuse la base de la production. La production n'est que LUE (sa structure comptée, et les deux
// lignes de configuration des agences des tests : aucune donnée d'un client).
//
//   npm run essai:preparer                   compare la structure et les droits des deux bases, et
//                                            dit où en sont les deux comptes de test (ne touche à
//                                            rien)
//   npm run essai:preparer -- --reference    cherche le projet `acm-studio-essai` et dit sa
//                                            référence, à poser dans `.env.e2e.local`
//   npm run essai:preparer -- --structure    aligne les droits par défaut sur ceux de la
//                                            production, puis construit la structure : toutes les
//                                            migrations du dépôt, dans la base d'essai
//   npm run essai:preparer -- --agences      crée l'agence des tests et l'agence de démonstration
//                                            des tests, avec le profil de leur compte (une fois),
//                                            sous les identifiants qu'elles ont dans la production
//
// Les deux comptes (E2E_EMAIL, E2E_DEMO_EMAIL) se créent d'abord dans la console de la base
// d'essai, avec les mots de passe de `.env.e2e.local` : ce script ne lit ni n'écrit aucun mot de
// passe.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { linkedProjectRef, readTestEnv, testDatabaseTarget } from './base-des-tests.mjs';
import {
  DEFAULT_PRIVILEGES,
  ESSAI_PROJECT_NAME,
  GRANTS,
  STRUCTURE,
  defaultPrivilegeStatements,
  essaiProject,
  firstCause,
  missingDefaultPrivileges,
} from './essai-structure.mjs';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const SUPABASE_CLI = ['--yes', 'supabase@3.0.0'];

// Les deux agences des tests, telles qu'elles existent dans la base commune (25/11) : le nom long
// de l'agence des tests est attendu par l'e2e (M72), celui de la démo ne dit pas « démo » (M114).
const TEST_AGENCY = { env: 'E2E_EMAIL', label: 'l’agence des tests', demo: false };
const DEMO_AGENCY = {
  env: 'E2E_DEMO_EMAIL',
  label: 'l’agence de démonstration des tests',
  demo: true,
};

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

const [, , ...flags] = process.argv;

function cli(args) {
  try {
    return execFileSync('npx', [...SUPABASE_CLI, ...args], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    // La CLI écrit la cause sur sa sortie normale, et « Target: project … » sur l'autre.
    const said = error && typeof error === 'object' ? error : {};
    fail(
      `La commande a échoué (supabase ${args.slice(0, 3).join(' ')}). ${firstCause(said.stdout, said.stderr)}`,
    );
  }
}

// Ce que la CLI rend en JSON, sans ce qu'elle écrit autour.
function parse(out) {
  const start = out.search(/[[{]/);
  if (start < 0) return null;
  return JSON.parse(out.slice(start, Math.max(out.lastIndexOf(']'), out.lastIndexOf('}')) + 1));
}
const listOf = (json, key) => (Array.isArray(json) ? json : (json?.[key] ?? []));

// Les projets du compte : leur référence et leur nom, rien d'autre.
const projects = () =>
  listOf(parse(cli(['projects', 'list', '--output-format', 'json', '--agent', 'no'])), 'projects');

if (flags.includes('--reference')) {
  const found = projects().filter((project) => project.name === ESSAI_PROJECT_NAME);
  if (found.length !== 1) {
    fail(
      found.length === 0
        ? `Aucun projet Supabase ne s’appelle « ${ESSAI_PROJECT_NAME} » : créez-le d’abord (geste 2).`
        : `Plusieurs projets s’appellent « ${ESSAI_PROJECT_NAME} » : gardez-en un seul.`,
    );
  }
  console.log(
    `\nLe projet « ${ESSAI_PROJECT_NAME} » : ${found[0].ref} (${found[0].region}, ${found[0].status}).\nÀ poser dans .env.e2e.local :\n\n  E2E_SUPABASE_REF=${found[0].ref}\n`,
  );
  process.exit(0);
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
const essaiRef = essai.arg.replace('--remote=', '');

// Le projet visé est bien `acm-studio-essai`, et lui seul : ni la production (`acm-studio-staging`,
// malgré son nom), ni un autre projet du compte.
const checked = essaiProject(projects(), essaiRef, linkedProjectRef());
if (!checked.ok) fail(checked.reason);

function query(target, sql, { write = false } = {}) {
  return listOf(
    parse(
      cli([
        'db',
        'query',
        target,
        ...(write ? ['--yes'] : ['--read-only']),
        '--output-format',
        'json',
        '--agent',
        'no',
        sql,
      ]),
    ),
    'rows',
  );
}

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;

// Où en est la base d'essai : ses tables, et les migrations du dépôt déjà jouées.
function essaiState() {
  const [{ tables, history }] = query(
    essai.arg,
    `select
       (select count(*) from information_schema.tables
         where table_schema = 'public' and table_type = 'BASE TABLE') as tables,
       (to_regclass('supabase_migrations.schema_migrations') is not null) as history`,
  );
  const migrations = history
    ? query(essai.arg, 'select count(*) as n from supabase_migrations.schema_migrations')[0].n
    : 0;
  return { tables: Number(tables), migrations: Number(migrations) };
}

function accountState(agency) {
  const email = readTestEnv(agency.env);
  if (!email) fail(`${agency.env} manque dans .env.e2e.local.`);
  const [row] = query(
    essai.arg,
    `select
       (select count(*) from auth.users where lower(email) = lower(${quote(email)})) as compte,
       (select count(*) from public.profiles p join auth.users u on u.id = p.id
         where lower(u.email) = lower(${quote(email)})) as profil,
       (select a.id::text from public.agencies a join public.profiles p on p.agency_id = a.id
         join auth.users u on u.id = p.id where lower(u.email) = lower(${quote(email)})) as identifiant,
       (select a.name from public.agencies a join public.profiles p on p.agency_id = a.id
         join auth.users u on u.id = p.id where lower(u.email) = lower(${quote(email)})) as agence,
       (select a.is_demo from public.agencies a join public.profiles p on p.agency_id = a.id
         join auth.users u on u.id = p.id where lower(u.email) = lower(${quote(email)})) as demo`,
  );
  return { email, ...row };
}

// L'agence et le profil du compte, tels qu'ils sont dans la production : deux lignes de
// configuration des comptes de test, lues en lecture seule. L'identifiant de l'agence est repris
// tel quel : le code reconnaît l'agence des tests par lui (elle reste fermée à l'API réelle
// d'Academia, `ACADEMIA_API_AGENCES_FERMEES`, Jean-Guy, 19/11).
function productionAgency(agency, email) {
  const [row] = query(
    '--remote',
    `select to_jsonb(a) as agency, to_jsonb(p) as profile
       from public.profiles p join public.agencies a on a.id = p.agency_id
      where lower(p.email) = lower(${quote(email)}) and p.removed_at is null`,
  );
  if (!row) {
    fail(
      `Le compte ${agency.env} n’a pas d’agence dans la production : ${agency.label} ne peut pas être reprise sous son identifiant.`,
    );
  }
  if (Boolean(row.agency.is_demo) !== agency.demo) {
    fail(
      `Dans la production, l’agence du compte ${agency.env} ${agency.demo ? 'n’est pas' : 'est'} de démonstration : rien n’est créé.`,
    );
  }
  return row;
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
  const source = productionAgency(agency, state.email);
  query(
    essai.arg,
    `do $$
     declare v_user uuid; v_email text;
     begin
       select id, email into v_user, v_email from auth.users
        where lower(email) = lower(${quote(state.email)});
       insert into public.agencies
         select * from jsonb_populate_record(null::public.agencies, ${quote(JSON.stringify(source.agency))}::jsonb);
       insert into public.profiles
         select * from jsonb_populate_record(
           null::public.profiles,
           ${quote(JSON.stringify(source.profile))}::jsonb
             || jsonb_build_object('id', v_user, 'email', v_email, 'photo_path', null));
     end $$;`,
    { write: true },
  );
  console.log(
    `  ${agency.env} : agence « ${source.agency.name} » créée sous son identifiant de la production, avec son profil.`,
  );
}

console.log(
  `\nBase d’essai : « ${ESSAI_PROJECT_NAME} », ${essaiRef} (jamais celle de la production).`,
);

if (flags.includes('--structure')) {
  // Les droits par défaut d'abord : la production donne d'office, à chaque table, fonction et
  // séquence créée, des droits aux trois rôles de l'API ; les migrations comptent dessus (aucune ne
  // donne un droit de table au rôle du serveur). Un projet neuf peut ne plus les donner : sans
  // eux, l'essai répondrait « permission denied » partout. Ils ne valent que pour ce qui est créé
  // ENSUITE : on les aligne sur une base encore vide, ou on s'arrête.
  const wanted = query('--remote', DEFAULT_PRIVILEGES);
  const missing = missingDefaultPrivileges(wanted, query(essai.arg, DEFAULT_PRIVILEGES));
  const { tables, migrations } = essaiState();
  const empty = tables === 0 && migrations === 0;
  if (missing.length > 0) {
    if (!empty) {
      fail(
        `La base d’essai n’est plus vide (${tables} tables) et ses droits par défaut ne sont pas ceux de la production : ce qui est déjà créé n’a pas ses droits. Supprimez le projet « ${ESSAI_PROJECT_NAME} », recréez-le, et relancez.`,
      );
    }
    console.log(
      `\nDroits par défaut : ${missing.length} à donner, comme dans la production (base encore vide)…`,
    );
    query(essai.arg, defaultPrivilegeStatements(missing).join('\n'), { write: true });
    const still = missingDefaultPrivileges(wanted, query(essai.arg, DEFAULT_PRIVILEGES));
    if (still.length > 0) {
      fail(
        `Les droits par défaut n’ont pas pu être alignés sur ceux de la production (${still.length} manquent encore) : la structure n’est pas construite.`,
      );
    }
    console.log('  ✔ droits par défaut : ceux de la production.');
  } else {
    console.log('\n✔ Droits par défaut : déjà ceux de la production.');
  }
  if (!empty && migrations === 0) {
    fail(
      `La base d’essai contient déjà ${tables} tables qui ne viennent pas des migrations du dépôt : rien n’y est construit.`,
    );
  }
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

if (essaiState().migrations === 0) {
  console.log(
    '\n✖ La base d’essai est vide : aucune migration du dépôt n’y est jouée. Lancez `npm run essai:preparer -- --structure`.\n',
  );
  process.exit(1);
}

let same = true;
function compare(title, sql) {
  console.log(`\n${title}, production contre base d’essai :`);
  const [production] = query('--remote', sql);
  const [separate] = query(essai.arg, sql);
  for (const key of Object.keys(production)) {
    const equal = String(production[key]) === String(separate[key]);
    same &&= equal;
    console.log(
      `  ${equal ? '✔' : '✖'} ${key.padEnd(26)} production ${String(production[key]).padStart(5)}   essai ${String(separate[key]).padStart(5)}`,
    );
  }
}
compare('Structure', STRUCTURE);
// Les droits, pas seulement les objets : une base dont les tables existent mais sans leurs droits
// répondrait « permission denied » à l'application.
compare('Droits des trois rôles de l’API', GRANTS);
const defaultsMissing = missingDefaultPrivileges(
  query('--remote', DEFAULT_PRIVILEGES),
  query(essai.arg, DEFAULT_PRIVILEGES),
);
same &&= defaultsMissing.length === 0;
console.log(
  `  ${defaultsMissing.length === 0 ? '✔' : '✖'} ${'droits par défaut'.padEnd(26)} ${
    defaultsMissing.length === 0
      ? 'ceux de la production'
      : `${defaultsMissing.length} manquent dans la base d’essai`
  }`,
);

// L'agence des tests doit rester fermée à l'API réelle d'Academia : le code la reconnaît par son
// identifiant (« aucun test n'appelle l'API réelle », Jean-Guy, 19/11).
const closedToAcademia =
  /ACADEMIA_API_AGENCES_FERMEES[^=]*=\s*\[([^\]]*)\]/
    .exec(
      readFileSync(
        resolve(REPO_ROOT, 'src/features/academia/services/academia-api-access.ts'),
        'utf8',
      ),
    )?.[1]
    .match(/[0-9a-f]{8}-[0-9a-f-]{27}/g) ?? [];

console.log('\nLes deux comptes de test, dans la base d’essai :');
let ready = true;
for (const agency of [TEST_AGENCY, DEMO_AGENCY]) {
  const state = accountState(agency);
  const closed = agency.demo || closedToAcademia.includes(state.identifiant);
  const ok =
    Number(state.compte) === 1 &&
    Number(state.profil) === 1 &&
    Boolean(state.agence) &&
    Boolean(state.demo) === agency.demo &&
    closed;
  ready &&= ok;
  console.log(
    `  ${ok ? '✔' : '✖'} ${agency.env.padEnd(15)} compte ${state.compte} · profil ${state.profil} · agence ${state.agence ? `« ${state.agence} »` : 'absente'}${
      agency.demo
        ? ` · démonstration ${state.demo ? 'oui' : 'non'}`
        : ` · ${closed ? 'fermée à l’API réelle d’Academia' : 'OUVERTE à l’API réelle d’Academia (identifiant différent de celui de la production)'}`
    }`,
  );
}

if (same && ready) {
  console.log(
    '\n✔ La base d’essai est prête : même structure et mêmes droits que la production, les deux comptes en place.\n',
  );
} else {
  console.log('\n✖ La base d’essai n’est pas encore prête (voir les lignes marquées ✖).\n');
  process.exitCode = 1;
}

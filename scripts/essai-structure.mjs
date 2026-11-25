// La base d'essai séparée (décision de Jean-Guy du 25/11) : ce que `essai-preparer.mjs` lit et
// compare, sans rien exécuter. Pur : les requêtes en lecture seule, et les règles qui décident.

// Le projet Supabase de l'essai. La production s'appelle `acm-studio-staging` (son nom d'origine,
// jamais changé) : le script ne construit rien ailleurs que dans le projet de ce nom.
export const ESSAI_PROJECT_NAME = 'acm-studio-essai';

// Le projet visé est-il bien celui de l'essai ? `projects` : la liste rendue par la CLI.
export function essaiProject(projects, ref, linkedRef) {
  const project = (Array.isArray(projects) ? projects : []).find((entry) => entry?.ref === ref);
  if (!project) {
    return {
      ok: false,
      reason: `Aucun projet Supabase de ce compte n’a la référence ${ref} : vérifiez E2E_SUPABASE_REF.`,
    };
  }
  if (project.linked === true || ref === linkedRef) {
    return {
      ok: false,
      reason: `Le projet ${ref} (« ${project.name} ») est celui du dépôt, la production : rien n’y est construit.`,
    };
  }
  if (project.name !== ESSAI_PROJECT_NAME) {
    return {
      ok: false,
      reason: `Le projet ${ref} s’appelle « ${project.name} », pas « ${ESSAI_PROJECT_NAME} » : rien n’y est construit.`,
    };
  }
  return { ok: true, project };
}

// La première ligne utile de ce qu'a dit la CLI : elle écrit la cause sur sa sortie normale, et
// « Target: project … » sur l'autre.
export function firstCause(stdout, stderr) {
  const lines = [stdout, stderr]
    .flatMap((text) => String(text ?? '').split(/\r?\n/))
    .map((line) => line.trim())
    .filter((line) => line !== '' && !/^Target:/i.test(line));
  return (lines[0] ?? 'Aucun message.').slice(0, 300);
}

const API_ROLES = "('anon', 'authenticated', 'service_role')";

// Une fonction que Supabase pose lui-même dans `public` quand l'option « RLS automatique » d'un
// projet est allumée (sa documentation, lue le 25/11) : elle n'est pas du dépôt, la production ne
// l'a pas, et elle ne se compte pas. Sans effet sur nos tables : toutes ont déjà la RLS (53 sur 53
// dans la production le 25/11), et la comparaison le vérifie (« tables avec la RLS »).
export const AUTO_RLS_FUNCTION = 'rls_auto_enable';
const OURS = `p.proname <> '${AUTO_RLS_FUNCTION}'`;
export const AUTO_RLS = `
select count(*) as n from pg_proc p join pg_namespace s on s.oid = p.pronamespace
 where s.nspname = 'public' and p.proname = '${AUTO_RLS_FUNCTION}'`;

// La structure, comptée : ce que la production a, la base d'essai doit l'avoir.
export const STRUCTURE = `
select
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE') as "tables",
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relrowsecurity) as "tables avec la RLS",
  (select count(*) from pg_policies where schemaname = 'public') as "politiques",
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and ${OURS}) as "fonctions",
  (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and not t.tgisinternal) as "déclencheurs",
  (select count(*) from pg_indexes where schemaname = 'public') as "index",
  (select count(*) from storage.buckets) as "espaces de fichiers",
  (select count(*) from pg_policies where schemaname = 'storage') as "règles des fichiers",
  (select count(*) from cron.job) as "tâches de nuit",
  (select count(*) from supabase_migrations.schema_migrations) as "migrations",
  (select current_setting('server_version_num')::int / 10000) as "version de Postgres"`;

// Les droits des trois rôles de l'API, comptés dans le catalogue (lisible en lecture seule) : sur
// les tables, sur des colonnes, sur les fonctions, sur les séquences.
export const GRANTS = `
select
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace,
     aclexplode(c.relacl) a
    where n.nspname = 'public' and c.relkind in ('r', 'v', 'm', 'p')
      and a.grantee::regrole::text in ${API_ROLES}) as "droits sur les tables",
  (select count(*) from pg_attribute t join pg_class c on c.oid = t.attrelid
     join pg_namespace n on n.oid = c.relnamespace, aclexplode(t.attacl) a
    where n.nspname = 'public' and a.grantee::regrole::text in ${API_ROLES}) as "droits sur des colonnes",
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace,
     aclexplode(p.proacl) a
    where n.nspname = 'public' and ${OURS}
      and a.grantee::regrole::text in ${API_ROLES}) as "droits sur les fonctions",
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace,
     aclexplode(c.relacl) a
    where n.nspname = 'public' and c.relkind = 'S'
      and a.grantee::regrole::text in ${API_ROLES}) as "droits sur les séquences",
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and ${OURS}
      and has_function_privilege('public', p.oid, 'execute')) as "fonctions ouvertes à tous",
  (select count(*) from unnest(array['anon', 'authenticated', 'service_role']) as role
    where has_schema_privilege(role, 'public', 'usage')) as "rôles admis dans le schéma",
  (select count(*) from pg_default_acl d
    where d.defaclnamespace = 0 and d.defaclrole::regrole::text = 'postgres') as "droits par défaut globaux"`;

// Les droits donnés d'office à ce que crée `postgres` (le rôle des migrations) dans `public`.
export const DEFAULT_PRIVILEGES = `
select d.defaclobjtype::text as kind, a.grantee::regrole::text as grantee, a.privilege_type as privilege
  from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace,
       aclexplode(d.defaclacl) a
 where n.nspname = 'public' and d.defaclrole::regrole::text = 'postgres'
   and a.grantee::regrole::text in ${API_ROLES}
 order by 1, 2, 3`;

// Postgres donne d'office à tous (« PUBLIC ») le droit d'exécuter une fonction neuve. La production
// a été construite ainsi : 18 fonctions ouvertes à tous, aucun droit par défaut global (25/11). Un
// projet neuf peut l'avoir retiré pour tout ce que crée `postgres` (documentation de Supabase,
// « Securing your API », lue le 25/11 : « revoke execute on functions from public », sans schéma).
// Ce compte dit s'il l'est : 0 = le défaut de Postgres est en place.
export const PUBLIC_EXECUTE_REVOKED = `
select count(*) as n from pg_default_acl d
 where d.defaclnamespace = 0 and d.defaclrole::regrole::text = 'postgres' and d.defaclobjtype = 'f'
   and not exists (select 1 from aclexplode(d.defaclacl) a
                    where a.grantee = 0 and a.privilege_type = 'EXECUTE')`;
// L'ordre qui le rend, et rien d'autre : le défaut de Postgres. Il ne vaut que pour ce qui est créé
// ensuite, comme les autres droits par défaut.
export const PUBLIC_EXECUTE_STATEMENT =
  'alter default privileges for role postgres grant execute on functions to public;';

const KINDS = { r: 'tables', f: 'functions', S: 'sequences' };
const ROLES = ['anon', 'authenticated', 'service_role'];

// Les droits par défaut avec lesquels la production a été construite, relevés le 25/11 dans son
// catalogue : 36, les mêmes pour les trois rôles de l'application. C'est la référence de la base
// d'essai — une liste fixe, pas « ceux de la production au moment du lancement » : Supabase a
// annoncé leur retrait sur les projets existants (30/10/2026, pas encore appliqué le 25/11) ; le
// jour où il s'applique, la production n'en donnera plus, et la base d'essai doit quand même
// recevoir ceux dont dépendent les migrations du dépôt.
const EXPECTED = {
  r: ['DELETE', 'INSERT', 'MAINTAIN', 'REFERENCES', 'SELECT', 'TRIGGER', 'TRUNCATE', 'UPDATE'],
  f: ['EXECUTE'],
  S: ['SELECT', 'UPDATE', 'USAGE'],
};
export const EXPECTED_DEFAULT_PRIVILEGES = Object.entries(EXPECTED).flatMap(([kind, privileges]) =>
  ROLES.flatMap((grantee) => privileges.map((privilege) => ({ kind, grantee, privilege }))),
);
const PRIVILEGES = [
  'SELECT',
  'INSERT',
  'UPDATE',
  'DELETE',
  'TRUNCATE',
  'REFERENCES',
  'TRIGGER',
  'MAINTAIN',
  'EXECUTE',
  'USAGE',
];
const keyOf = (row) => `${row.kind}:${row.grantee}:${row.privilege}`;

// Ce que la production donne d'office et que la base d'essai ne donne pas.
export function missingDefaultPrivileges(wanted, have) {
  const known = new Set((have ?? []).map(keyOf));
  return (wanted ?? []).filter((row) => !known.has(keyOf(row)));
}

// Les ordres qui les donnent, un par genre d'objet et par rôle. Rien n'est écrit dans un ordre qui
// ne soit dans les listes ci-dessus : une valeur inattendue arrête tout.
export function defaultPrivilegeStatements(missing) {
  const groups = new Map();
  for (const row of missing) {
    if (
      !(row.kind in KINDS) ||
      !ROLES.includes(row.grantee) ||
      !PRIVILEGES.includes(row.privilege)
    ) {
      throw new Error(`Droit par défaut inattendu : ${keyOf(row)}.`);
    }
    const group = `${row.kind}:${row.grantee}`;
    groups.set(group, [...(groups.get(group) ?? []), row.privilege]);
  }
  return [...groups.entries()].map(([group, privileges]) => {
    const [kind, grantee] = group.split(':');
    return `alter default privileges for role postgres in schema public grant ${privileges.join(', ')} on ${KINDS[kind]} to ${grantee};`;
  });
}

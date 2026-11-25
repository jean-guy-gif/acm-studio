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

// La structure, comptée : ce que la production a, la base d'essai doit l'avoir.
export const STRUCTURE = `
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
  (select count(*) from pg_policies where schemaname = 'storage') as "règles des fichiers",
  (select count(*) from cron.job) as "tâches de nuit",
  (select count(*) from supabase_migrations.schema_migrations) as "migrations"`;

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
    where n.nspname = 'public' and a.grantee::regrole::text in ${API_ROLES}) as "droits sur les fonctions",
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace,
     aclexplode(c.relacl) a
    where n.nspname = 'public' and c.relkind = 'S'
      and a.grantee::regrole::text in ${API_ROLES}) as "droits sur les séquences",
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and has_function_privilege('public', p.oid, 'execute')) as "fonctions ouvertes à tous",
  (select count(*) from unnest(array['anon', 'authenticated', 'service_role']) as role
    where has_schema_privilege(role, 'public', 'usage')) as "rôles admis dans le schéma"`;

// Les droits donnés d'office à ce que crée `postgres` (le rôle des migrations) dans `public`.
export const DEFAULT_PRIVILEGES = `
select d.defaclobjtype::text as kind, a.grantee::regrole::text as grantee, a.privilege_type as privilege
  from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace,
       aclexplode(d.defaclacl) a
 where n.nspname = 'public' and d.defaclrole::regrole::text = 'postgres'
   and a.grantee::regrole::text in ${API_ROLES}
 order by 1, 2, 3`;

const KINDS = { r: 'tables', f: 'functions', S: 'sequences' };
const ROLES = ['anon', 'authenticated', 'service_role'];
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

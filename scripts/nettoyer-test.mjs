// Mission 100 — `npm run nettoyer:test` : une base propre. Supprime ce que les passages de l'e2e
// ont laissé dans l'agence « TEST AUTOMATIQUE », et NULLE PART AILLEURS.
//
//   npm run nettoyer:test                  compte, table par table, et ne touche à rien
//   npm run nettoyer:test -- --supprimer   compte, supprime, puis recompte
//
// L'agence visée est celle du compte de test (E2E_EMAIL, lu dans `.env.e2e.local`, jamais
// affiché). Le script REFUSE de tourner si son nom ne commence pas par « TEST AUTOMATIQUE », et
// la suppression revérifie ce nom dans la base, dans la même transaction. Les lignes sont
// réellement supprimées (pas archivées) : dossiers, biens vendeurs, concurrents, réponses du Live,
// conclusions, relances, courriers, observations d'annonces, oppositions. Restent : l'agence, ses
// comptes, son identité, ses invitations, sa consommation de recherche et son journal d'erreurs.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const TEST_AGENCY_PREFIX = 'TEST AUTOMATIQUE';

// Ce que le nettoyage supprime, et ce qu'il garde. Une table à `agency_id` qui n'est dans aucune
// des deux listes arrête le script : on décide, on ne devine pas.
const CLEANED = [
  // Mission 118 — les sélections de biens idéaux, puis les fiches acquéreur de l'agence de test.
  // Mission 119 — les liens du dossier acquéreur, les demandes de visite.
  // Mission 122 — les réponses de l'acquéreur à chaque bien.
  // Mission 120 — les origines « Recherche acquéreur » et les biens démarchés.
  // Mission 134 — les biens proposés aux acquéreurs.
  'buyer_proposals',
  'buyer_prospect_origins',
  'buyer_prospects',
  'buyer_item_responses',
  'buyer_dossier_links',
  'buyer_visit_requests',
  'buyer_selection_items',
  'buyer_selections',
  'buyers',
  'comparables',
  'competitor_decisions',
  'competitor_prospecting_files',
  'follow_up_contacts',
  'listing_observations',
  'live_reopenings',
  'stream_estate_results',
  'live_seller_responses',
  'live_seller_summary',
  'pending_competitor_imports',
  'project_meeting_conclusions',
  'project_price_positionings',
  'projects',
  'prospecting_oppositions',
  // Mission 110 — les recherches nommées des comptes de test.
  'saved_searches',
  // Mission 110 — les liens de la synthèse au vendeur partent avec leurs dossiers.
  'project_market_update_links',
  'market_study_links',
  'project_market_updates',
  'seller_synthesis_links',
  'subject_properties',
  'subject_property_condominiums',
  'subject_property_diagnostics',
];
const KEPT = [
  'agency_branding',
  'agency_invitations',
  'agency_search_budgets',
  'app_errors',
  'profiles',
  'stream_estate_usage',
];

function fail(message) {
  console.error(`\n✖ ${message}`);
  process.exit(1);
}

function testEmail() {
  if (process.env.E2E_EMAIL) return process.env.E2E_EMAIL;
  const file = resolve(REPO_ROOT, '.env.e2e.local');
  if (!existsSync(file)) return null;
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^\s*E2E_EMAIL\s*=\s*(.*)$/.exec(raw);
    if (match) return match[1].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
  return null;
}

// La CLI Supabase épinglée, comme pour la sauvegarde (`scripts/sauvegarde-commun.mjs`, 05/11) :
// `--remote` sur le projet lié, une sortie JSON — un tableau (`--agent no`), ou un objet `{ rows }`
// en mode agent. La sortie n'est jamais affichée telle quelle. Lecture seule, sauf `write`.
const SUPABASE_CLI = ['--yes', 'supabase@3.0.0'];
function query(sql, { write = false } = {}) {
  let out;
  try {
    out = execFileSync(
      'npx',
      [
        ...SUPABASE_CLI,
        'db',
        'query',
        '--remote',
        ...(write ? ['--yes'] : ['--read-only']),
        '--output-format',
        'json',
        '--agent',
        'no',
        sql,
      ],
      { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
  } catch {
    fail('`supabase db query --remote` a échoué (CLI absente, non connectée, ou dépôt non lié).');
  }
  const start = out.search(/[[{]/);
  if (start < 0) return [];
  const json = JSON.parse(
    out.slice(start, Math.max(out.lastIndexOf(']'), out.lastIndexOf('}')) + 1),
  );
  return (Array.isArray(json) ? json : json.rows) ?? [];
}

function isTestAgency(name) {
  return String(name ?? '')
    .trim()
    .toUpperCase()
    .startsWith(TEST_AGENCY_PREFIX);
}

function countByTable(agencyId) {
  const rows = query(`
    select c.table_name as t,
           (xpath('/row/c/text()', query_to_xml(
              format('select count(*) as c from public.%I where agency_id = %L',
                     c.table_name, '${agencyId}'),
              false, true, '')))[1]::text::bigint as n
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public' and c.column_name = 'agency_id'
      and t.table_type = 'BASE TABLE'
    order by 1`);
  return new Map(rows.map((row) => [row.t, Number(row.n)]));
}

function print(counts, before = null) {
  const names = [...counts.keys()];
  const width = Math.max(...names.map((name) => name.length), 5);
  console.log(`  ${'table'.padEnd(width)}  ${before ? 'avant   après' : 'lignes'}   nettoyage`);
  for (const name of names) {
    const now = String(counts.get(name)).padStart(6);
    const cell = before ? `${String(before.get(name) ?? 0).padStart(5)}  ${now}` : now;
    console.log(
      `  ${name.padEnd(width)}  ${cell}   ${CLEANED.includes(name) ? 'supprimé' : 'gardé'}`,
    );
  }
}

const remove = process.argv.includes('--supprimer');
const unknownArgs = process.argv.slice(2).filter((arg) => arg !== '--supprimer');
if (unknownArgs.length > 0) fail(`Option inconnue : ${unknownArgs.join(' ')}`);

const email = testEmail();
if (!email) fail('E2E_EMAIL manquant : renseignez-le dans .env.e2e.local (ignoré par git).');

const agencies = query(`
  select a.id, a.name
  from public.profiles p join public.agencies a on a.id = p.agency_id
  where lower(p.email) = lower('${email.replace(/'/g, "''")}')`);
if (agencies.length !== 1)
  fail('Le compte de test n’a pas d’agence (ou en a plusieurs) : rien n’est touché.');
const agency = agencies[0];
if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(String(agency.id))) {
  fail('Identifiant d’agence inattendu : rien n’est touché.');
}
if (!isTestAgency(agency.name)) {
  fail(
    `L’agence du compte de test ne s’appelle pas « ${TEST_AGENCY_PREFIX}… » : ce n’est pas l’agence de test, rien n’est touché.`,
  );
}

console.log(`Agence de test : « ${agency.name} »`);
const before = countByTable(agency.id);
const unclassified = [...before.keys()].filter(
  (name) => !CLEANED.includes(name) && !KEPT.includes(name),
);
if (unclassified.length > 0) {
  fail(
    `Table(s) à agency_id non classée(s) dans scripts/nettoyer-test.mjs : ${unclassified.join(', ')}. Dites si le nettoyage les supprime ou les garde.`,
  );
}

if (!remove) {
  console.log('\nComptage (rien n’est supprimé) :');
  print(before);
  const total = CLEANED.reduce((sum, name) => sum + (before.get(name) ?? 0), 0);
  console.log(
    `\n${total} ligne(s) à supprimer. Pour supprimer : npm run nettoyer:test -- --supprimer`,
  );
  process.exit(0);
}

// Une seule transaction (un bloc DO). Le nom de l'agence est REVÉRIFIÉ dans la base : si ce n'est
// pas l'agence de test, le bloc lève et rien n'est supprimé. L'ordre suit les clés étrangères :
// concurrents et biens d'abord (les dossiers ne les emportent pas), puis les dossiers (qui
// emportent réponses, conclusions, relances, décisions, courriers), puis ce qui tient à l'agence.
query(
  `do $$
declare
  v_agency constant uuid := '${agency.id}';
begin
  if not exists (
    select 1 from public.agencies
    where id = v_agency and upper(btrim(name)) like '${TEST_AGENCY_PREFIX}%'
  ) then
    raise exception 'Agence de test introuvable : rien n''est supprime.';
  end if;
  -- Mission 104 — la trace des réouvertures part avec ses dossiers.
  delete from public.live_reopenings where agency_id = v_agency;
  -- Mission 105 — le dernier résultat payé d'une recherche part avec ses dossiers.
  delete from public.stream_estate_results where agency_id = v_agency;
  delete from public.comparables where agency_id = v_agency;
  delete from public.subject_properties where agency_id = v_agency;
  delete from public.projects where agency_id = v_agency;
  delete from public.listing_observations where agency_id = v_agency;
  delete from public.prospecting_oppositions where agency_id = v_agency;
  -- Mission 110 — les recherches nommées des comptes de test (les comptes restent).
  delete from public.saved_searches where agency_id = v_agency;
  -- Mission 117 — les fiches acquéreur de l'agence de test, archivées comprises ; mission 118 —
  -- leurs sélections partent avec elles (cascade), supprimées ici explicitement.
  -- Mission 120 — les origines « Recherche acquéreur », puis les biens démarchés.
  -- Mission 134 — les biens proposés aux acquéreurs.
  delete from public.buyer_proposals where agency_id = v_agency;
  delete from public.buyer_prospect_origins where agency_id = v_agency;
  delete from public.buyer_prospects where agency_id = v_agency;
  delete from public.buyer_item_responses where agency_id = v_agency;
  delete from public.buyer_dossier_links where agency_id = v_agency;
  delete from public.project_market_update_links where agency_id = v_agency;
  delete from public.market_study_links where agency_id = v_agency;
  delete from public.project_market_updates where agency_id = v_agency;
  delete from public.buyer_visit_requests where agency_id = v_agency;
  delete from public.buyer_selection_items where agency_id = v_agency;
  delete from public.buyer_selections where agency_id = v_agency;
  delete from public.buyers where agency_id = v_agency;
end $$`,
  { write: true },
);

const after = countByTable(agency.id);
console.log('\nAvant et après le nettoyage :');
print(after, before);
const left = CLEANED.filter((name) => (after.get(name) ?? 0) > 0);
if (left.length > 0) fail(`Il reste des lignes dans : ${left.join(', ')}.`);
const changedKept = KEPT.filter((name) => (after.get(name) ?? 0) !== (before.get(name) ?? 0));
if (changedKept.length > 0) fail(`Une table à garder a changé : ${changedKept.join(', ')}.`);
console.log('\n✔ Agence de test propre : zéro dossier restant.');

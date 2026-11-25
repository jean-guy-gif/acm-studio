import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  AUTO_RLS,
  AUTO_RLS_FUNCTION,
  DEFAULT_PRIVILEGES,
  ESSAI_PROJECT_NAME,
  EXPECTED_DEFAULT_PRIVILEGES,
  GRANTS,
  PUBLIC_EXECUTE_REVOKED,
  PUBLIC_EXECUTE_STATEMENT,
  STRUCTURE,
  defaultPrivilegeStatements,
  essaiProject,
  firstCause,
  missingDefaultPrivileges,
} from '../../scripts/essai-structure.mjs';

// La base d'essai séparée (décision de Jean-Guy du 25/11) — ce que le script de préparation décide
// avant de construire quoi que ce soit : le projet visé, et les droits par défaut.
const PRODUCTION = 'aaaaaaaaaaaaaaaaaaaa';
const ESSAI = 'bbbbbbbbbbbbbbbbbbbb';
const AUTRE = 'cccccccccccccccccccc';
const projects = [
  { ref: PRODUCTION, name: 'acm-studio-staging', linked: true },
  { ref: ESSAI, name: ESSAI_PROJECT_NAME, linked: false },
  { ref: AUTRE, name: 'NXT-perf', linked: false },
];

describe('le projet où la structure se construit', () => {
  it('le projet nommé « acm-studio-essai », et lui seul', () => {
    expect(essaiProject(projects, ESSAI, PRODUCTION)).toMatchObject({ ok: true });
  });

  it('jamais la production, même sous son nom de « staging »', () => {
    const refused = essaiProject(projects, PRODUCTION, PRODUCTION);
    expect(refused.ok).toBe(false);
    expect(refused.reason).toContain('la production');
    // Même si le poste n'était plus lié : le nom ne trompe pas.
    expect(essaiProject(projects, PRODUCTION, null).ok).toBe(false);
  });

  it('ni un autre projet du compte, ni une référence inconnue', () => {
    const other = essaiProject(projects, AUTRE, PRODUCTION);
    expect(other.ok).toBe(false);
    expect(other.reason).toContain('« NXT-perf »');
    expect(essaiProject(projects, 'dddddddddddddddddddd', PRODUCTION).ok).toBe(false);
    expect(essaiProject(null, ESSAI, PRODUCTION).ok).toBe(false);
  });
});

describe('les droits par défaut, alignés sur ceux de la production', () => {
  const wanted = [
    { kind: 'r', grantee: 'service_role', privilege: 'SELECT' },
    { kind: 'r', grantee: 'service_role', privilege: 'INSERT' },
    { kind: 'r', grantee: 'authenticated', privilege: 'SELECT' },
    { kind: 'f', grantee: 'anon', privilege: 'EXECUTE' },
    { kind: 'S', grantee: 'authenticated', privilege: 'USAGE' },
  ];

  it('ce que la production donne d’office et que la base d’essai ne donne pas', () => {
    expect(missingDefaultPrivileges(wanted, wanted)).toEqual([]);
    expect(missingDefaultPrivileges(wanted, [])).toEqual(wanted);
    expect(missingDefaultPrivileges(wanted, wanted.slice(0, 3))).toEqual(wanted.slice(3));
    // Un droit de plus dans la base d'essai ne manque à personne.
    expect(
      missingDefaultPrivileges(wanted, [
        ...wanted,
        { kind: 'r', grantee: 'anon', privilege: 'SELECT' },
      ]),
    ).toEqual([]);
  });

  it('un ordre par genre d’objet et par rôle, pour le rôle des migrations, dans « public »', () => {
    expect(defaultPrivilegeStatements(wanted)).toEqual([
      'alter default privileges for role postgres in schema public grant SELECT, INSERT on tables to service_role;',
      'alter default privileges for role postgres in schema public grant SELECT on tables to authenticated;',
      'alter default privileges for role postgres in schema public grant EXECUTE on functions to anon;',
      'alter default privileges for role postgres in schema public grant USAGE on sequences to authenticated;',
    ]);
    expect(defaultPrivilegeStatements([])).toEqual([]);
  });

  it('la référence est une liste fixe : les 36 droits avec lesquels la production a été construite', () => {
    expect(EXPECTED_DEFAULT_PRIVILEGES).toHaveLength(36);
    // Les mêmes pour les trois rôles : 8 sur les tables, 1 sur les fonctions, 3 sur les séquences.
    for (const grantee of ['anon', 'authenticated', 'service_role']) {
      const mine = EXPECTED_DEFAULT_PRIVILEGES.filter((row) => row.grantee === grantee);
      expect(mine.filter((row) => row.kind === 'r')).toHaveLength(8);
      expect(mine.filter((row) => row.kind === 'f')).toHaveLength(1);
      expect(mine.filter((row) => row.kind === 'S')).toHaveLength(3);
    }
    // Sur une base neuve qui n'en donne aucun : neuf ordres, tous valides.
    const statements = defaultPrivilegeStatements(
      missingDefaultPrivileges(EXPECTED_DEFAULT_PRIVILEGES, []),
    );
    expect(statements).toHaveLength(9);
    expect(statements[0]).toBe(
      'alter default privileges for role postgres in schema public grant DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on tables to anon;',
    );
  });

  it('le jour où la production ne les donne plus, la base d’essai les reçoit quand même', () => {
    // La production après le retrait annoncé par Supabase : plus aucun droit par défaut.
    const production: typeof EXPECTED_DEFAULT_PRIVILEGES = [];
    expect(missingDefaultPrivileges(EXPECTED_DEFAULT_PRIVILEGES, production)).toHaveLength(36);
    // La base d'essai se juge sur la liste fixe, pas sur la production : 36 à donner, pas 0.
    expect(missingDefaultPrivileges(EXPECTED_DEFAULT_PRIVILEGES, [])).toHaveLength(36);
    expect(
      missingDefaultPrivileges(EXPECTED_DEFAULT_PRIVILEGES, EXPECTED_DEFAULT_PRIVILEGES),
    ).toEqual([]);
  });

  it('rien d’inattendu ne s’écrit dans un ordre : un rôle, un genre ou un droit inconnu arrête tout', () => {
    for (const row of [
      { kind: 'r', grantee: 'postgres; drop table x', privilege: 'SELECT' },
      { kind: 'x', grantee: 'anon', privilege: 'SELECT' },
      { kind: 'r', grantee: 'anon', privilege: 'ALL; --' },
    ]) {
      expect(() => defaultPrivilegeStatements([row]), JSON.stringify(row)).toThrow(
        'Droit par défaut inattendu',
      );
    }
  });
});

describe('le droit d’exécuter une fonction, donné d’office à tous', () => {
  const script = readFileSync(resolve(process.cwd(), 'scripts/essai-preparer.mjs'), 'utf8');

  it('un seul ordre : le défaut de Postgres, pour le rôle des migrations', () => {
    expect(PUBLIC_EXECUTE_STATEMENT).toBe(
      'alter default privileges for role postgres grant execute on functions to public;',
    );
  });

  it('il se rend avant la première migration, et la comparaison le relit après', () => {
    const given = script.indexOf('query(essai.arg, PUBLIC_EXECUTE_STATEMENT, { write: true })');
    const pushed = script.indexOf("'db', 'push'");
    expect(given).toBeGreaterThan(0);
    expect(pushed).toBeGreaterThan(given);
    expect(script.lastIndexOf('PUBLIC_EXECUTE_REVOKED')).toBeGreaterThan(pushed);
  });

  it('un ordre s’affiche avant de partir : refusé, il se colle dans l’éditeur SQL du projet', () => {
    expect(script).toContain('${PUBLIC_EXECUTE_STATEMENT}`');
    expect(script).toContain("statements.map((line) => `    ${line}`).join('\\n')");
  });
});

describe('la RLS automatique de Supabase', () => {
  it('sa fonction n’est pas du dépôt : les trois comptes de fonctions l’écartent', () => {
    expect(AUTO_RLS_FUNCTION).toBe('rls_auto_enable');
    expect(STRUCTURE.match(/proname <> 'rls_auto_enable'/g)).toHaveLength(1);
    expect(GRANTS.match(/proname <> 'rls_auto_enable'/g)).toHaveLength(2);
    expect(AUTO_RLS).toContain("p.proname = 'rls_auto_enable'");
  });

  it('la comparaison vérifie que toutes les tables ont la RLS, des deux côtés', () => {
    expect(STRUCTURE).toContain('tables avec la RLS');
  });
});

describe('ce que le script lit', () => {
  it('ses requêtes ne font que lire', () => {
    for (const sql of [STRUCTURE, GRANTS, DEFAULT_PRIVILEGES, AUTO_RLS, PUBLIC_EXECUTE_REVOKED]) {
      expect(sql.trim().toLowerCase().startsWith('select')).toBe(true);
      expect(sql).not.toMatch(/\b(insert|update|delete|alter|drop|grant|revoke|truncate)\s/i);
    }
  });

  it('les droits se comptent, pas seulement les objets', () => {
    for (const counted of [
      'droits sur les tables',
      'droits sur des colonnes',
      'droits sur les fonctions',
      'fonctions ouvertes à tous',
      'droits par défaut globaux',
    ]) {
      expect(GRANTS).toContain(counted);
    }
    expect(STRUCTURE).toContain('migrations');
    expect(STRUCTURE).toContain('version de Postgres');
  });

  it('la cause d’un échec : la première ligne utile, pas « Target: project … »', () => {
    expect(firstCause('permission denied for table projects\nautre', 'Target: project abc')).toBe(
      'permission denied for table projects',
    );
    expect(firstCause('', 'Target: project abc\nConnexion refusée')).toBe('Connexion refusée');
    expect(firstCause(undefined, undefined)).toBe('Aucun message.');
  });
});

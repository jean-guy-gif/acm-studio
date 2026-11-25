import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PRIVILEGES,
  ESSAI_PROJECT_NAME,
  GRANTS,
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

describe('ce que le script lit', () => {
  it('ses requêtes ne font que lire', () => {
    for (const sql of [STRUCTURE, GRANTS, DEFAULT_PRIVILEGES]) {
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
    ]) {
      expect(GRANTS).toContain(counted);
    }
    expect(STRUCTURE).toContain('migrations');
  });

  it('la cause d’un échec : la première ligne utile, pas « Target: project … »', () => {
    expect(firstCause('permission denied for table projects\nautre', 'Target: project abc')).toBe(
      'permission denied for table projects',
    );
    expect(firstCause('', 'Target: project abc\nConnexion refusée')).toBe('Connexion refusée');
    expect(firstCause(undefined, undefined)).toBe('Aucun message.');
  });
});

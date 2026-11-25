import { describe, expect, it } from 'vitest';

import { sessionsQuery, whoIsConnected } from '../../scripts/base-qui-regle.mjs';
import { downtime } from '../../scripts/base-sonde-regle.mjs';
import { essaiVerdict } from '../../scripts/essai-preuve-regle.mjs';

// Jeudi 26/11 (`missions/BASE_JEUDI_MATIN.md`) — les deux règles qui décident : la preuve que
// l'essai parle à la base d'essai, et la durée d'indisponibilité de la base pendant sa montée en
// taille.
describe('la preuve : l’essai parle à la base d’essai', () => {
  it('une session neuve dans la production : l’essai la lit encore, on s’arrête', () => {
    for (const inEssai of [null, 0, 1]) {
      const verdict = essaiVerdict({ inProduction: 1, inEssai });
      expect(verdict.ok).toBe(false);
      expect(verdict.message).toContain('PRODUCTION');
      expect(verdict.message).toContain('On s’arrête là');
    }
  });

  it('la session neuve dans la base d’essai, rien dans la production : la preuve est faite', () => {
    expect(essaiVerdict({ inProduction: 0, inEssai: 1 })).toMatchObject({ ok: true });
  });

  it('sans référence posée, ou sans session nulle part : pas de preuve, on s’arrête', () => {
    expect(essaiVerdict({ inProduction: 0, inEssai: null }).ok).toBe(false);
    const nowhere = essaiVerdict({ inProduction: 0, inEssai: 0 });
    expect(nowhere.ok).toBe(false);
    expect(nowhere.message).toContain('On s’arrête là');
  });
});

describe('la sonde : la durée d’indisponibilité', () => {
  const at = (seconds: number, ok: boolean) => ({ at: seconds * 1000, ok });

  it('la base répond toujours : aucune indisponibilité', () => {
    expect(downtime([at(0, true), at(5, true), at(10, true)])).toEqual({ outages: [], seconds: 0 });
    expect(downtime([])).toEqual({ outages: [], seconds: 0 });
  });

  it('de la première demande sans réponse à la première réponse qui suit', () => {
    const result = downtime([at(0, true), at(5, false), at(10, false), at(15, true), at(20, true)]);
    expect(result.outages).toEqual([{ from: 5_000, to: 15_000 }]);
    expect(result.seconds).toBe(10);
  });

  it('deux coupures s’additionnent ; une coupure sans retour court jusqu’à la dernière demande', () => {
    const twice = downtime([at(0, false), at(5, true), at(10, false), at(15, false), at(20, true)]);
    expect(twice.outages).toHaveLength(2);
    expect(twice.seconds).toBe(15);
    const open = downtime([at(0, true), at(5, false), at(10, false)]);
    expect(open.outages).toEqual([{ from: 5_000, to: null }]);
    expect(open.seconds).toBe(5);
  });
});

describe('« personne n’est connecté » : avant de changer la taille de la base', () => {
  it('la requête ne fait que lire, écarte les comptes de test, et ne rend ni nom ni adresse', () => {
    const sql = sessionsQuery(['tests@example.com', "d'essai@example.com"]);
    expect(sql.trim().toLowerCase().startsWith('select')).toBe(true);
    expect(sql).not.toMatch(/\b(insert|update|delete|alter|drop|grant|revoke|truncate)\s/i);
    expect(sql).toContain("lower('tests@example.com')");
    // Une apostrophe ne sort pas de la chaîne.
    expect(sql).toContain("lower('d''essai@example.com')");
    // Ce qui sort : l'agence, un nombre de sessions, des minutes.
    expect(sql).toMatch(/select a\.name as agence,\s+count\(s\.id\) as sessions,/);
    expect(sql).not.toMatch(/u\.email\s+as|first_name|last_name|phone/);
    expect(() => sessionsQuery([])).toThrow('manquent');
  });

  it('une activité de session de moins d’une heure : peut-être connecté, Jean-Guy décide', () => {
    const verdict = whoIsConnected([
      { agence: 'Start Academy', sessions: 3, minutes: '12' },
      { agence: 'Agence Horizon Côte d’Azur', sessions: 1, minutes: '240' },
      { agence: 'ACM Studio Pilote', sessions: 0, minutes: null },
    ]);
    expect(verdict.nobody).toBe(false);
    expect(verdict.active).toEqual([{ agence: 'Start Academy', minutes: 12 }]);
    expect(verdict.lines.join('\n')).toContain('Start Academy — il y a 12 min');
    expect(verdict.lines.join('\n')).toContain('Jean-Guy décide du moment');
  });

  it('rien depuis une heure : personne, et la dernière activité est dite', () => {
    const verdict = whoIsConnected([
      { agence: 'Start Academy', sessions: 3, minutes: 110 },
      { agence: 'ACM Studio Pilote', sessions: 0, minutes: null },
    ]);
    expect(verdict.nobody).toBe(true);
    expect(verdict.lines[0]).toContain('Aucune session d’un vrai compte active depuis 60 minutes');
    expect(verdict.lines[1]).toContain('Start Academy, il y a 1 h 50');
    expect(whoIsConnected([]).nobody).toBe(true);
    expect(whoIsConnected(null).lines[1]).toContain('Aucune session de vrai compte');
  });
});

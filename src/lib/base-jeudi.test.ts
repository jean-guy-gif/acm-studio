import { describe, expect, it } from 'vitest';

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

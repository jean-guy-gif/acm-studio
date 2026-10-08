import { describe, expect, it } from 'vitest';

import {
  countDpe,
  dpeClass,
  dpeCountLabel,
  dpeGapLabel,
  dpeMarket,
  dpeMatchPoints,
  dpeMedian,
} from '@/features/dpe/services/dpe';

describe('Mission 80 — la classe DPE', () => {
  it('ne reconnaît que les lettres A à G, quelle que soit la casse', () => {
    expect(dpeClass(' d ')).toBe('D');
    expect(dpeClass('G')).toBe('G');
    expect(dpeClass('H')).toBeNull();
    expect(dpeClass('vierge')).toBeNull();
    expect(dpeClass('')).toBeNull();
    expect(dpeClass(null)).toBeNull();
  });

  it('dit l’écart sur la carte, et la lettre seule sans classe côté vendeur', () => {
    expect(dpeGapLabel('D', 'D')).toBe('DPE D, comme le vôtre');
    expect(dpeGapLabel('F', 'D')).toBe('DPE F, deux classes de moins');
    expect(dpeGapLabel('E', 'D')).toBe('DPE E, une classe de moins');
    expect(dpeGapLabel('B', 'D')).toBe('DPE B, deux classes de mieux');
    expect(dpeGapLabel('D', null)).toBe('DPE D');
  });

  it('compte 10 points pour la même classe, 5 à une classe, 0 au-delà', () => {
    expect(dpeMatchPoints('D', 'D')).toBe(10);
    expect(dpeMatchPoints('C', 'D')).toBe(5);
    expect(dpeMatchPoints('E', 'D')).toBe(5);
    expect(dpeMatchPoints('F', 'D')).toBe(0);
  });

  it('sort du calcul dès qu’une classe est inconnue', () => {
    expect(dpeMatchPoints(null, 'D')).toBeNull();
    expect(dpeMatchPoints('D', null)).toBeNull();
  });
});

describe('Mission 80 — le décompte en Préparation', () => {
  it('« 2 C, 4 D, 1 E, 3 non indiqués »', () => {
    const ratings = ['D', 'C', 'D', null, 'E', 'D', '', 'C', 'D', 'vierge'];
    expect(dpeCountLabel(countDpe(ratings))).toBe('2 C, 4 D, 1 E, 3 non indiqués');
  });

  it('accorde le singulier, et ne dit rien sans concurrent', () => {
    expect(dpeCountLabel(countDpe(['A', null]))).toBe('1 A, 1 non indiqué');
    expect(dpeCountLabel(countDpe([]))).toBeNull();
  });
});

describe('Mission 80 — le repère : la lettre médiane des concurrents qui en affichent une', () => {
  it('ignore les concurrents sans classe', () => {
    expect(dpeMedian(['C', null, 'D', 'E', ''])).toBe('D');
  });

  it('nombre pair : la moins bonne des deux lettres du milieu', () => {
    expect(dpeMedian(['C', 'D'])).toBe('D');
    expect(dpeMedian(['B', 'C', 'D', 'G'])).toBe('D');
  });

  it('aucune classe : pas de repère', () => {
    expect(dpeMedian([null, '', 'vierge'])).toBeNull();
  });
});

describe('Mission 80 — « Le DPE face au marché »', () => {
  const competitors = ['C', 'D', 'D', 'E', null];

  it('meilleur que le repère : un atout', () => {
    expect(dpeMarket('A', competitors)).toMatchObject({
      reference: 'D',
      verdict: 'better',
      message: 'Votre DPE est un atout face à vos concurrents.',
    });
  });

  it('égal au repère : dans la moyenne', () => {
    expect(dpeMarket('D', competitors)?.message).toBe(
      'Votre DPE est dans la moyenne de vos concurrents.',
    );
  });

  it('moins bon que le repère', () => {
    expect(dpeMarket('G', competitors)?.message).toBe(
      'Votre DPE est moins bon que celui de la plupart de vos concurrents : les acheteurs compareront. À intégrer dans la stratégie de prix.',
    );
  });

  it('inconnu : la classe à viser après le passage du diagnostiqueur', () => {
    expect(dpeMarket(null, competitors)).toMatchObject({
      verdict: 'unknown',
      message:
        'Vos concurrents affichent surtout D. Après le passage du diagnostiqueur, votre bien devra être en D ou mieux pour rester dans la course ; au-delà, il faudra peut-être ajuster la stratégie de prix.',
    });
    expect(dpeMarket('', ['A', 'A'])?.message).toContain('devra être en A pour rester');
  });

  it('aucun concurrent avec DPE : pas d’écran', () => {
    expect(dpeMarket('D', [null, null])).toBeNull();
    expect(dpeMarket(null, [])).toBeNull();
  });

  it('ne porte jamais de montant ni de chiffre, quel que soit le cas', () => {
    for (const subject of [null, 'A', 'B', 'C', 'D', 'E', 'F', 'G']) {
      for (const reference of ['A', 'D', 'G']) {
        const message = dpeMarket(subject, [reference])!.message;
        expect(message).not.toMatch(/\d|€|%|euro/i);
      }
    }
  });
});

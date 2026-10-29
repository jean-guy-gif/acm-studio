import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { etatDeLaPage } from './etat.mjs';
import { lireJournal } from './journal.mjs';

// Mission 126 — ce que la page montre, lu sur les trois journaux d'exemple.
const exemple = (nom) =>
  lireJournal(resolve(import.meta.dirname, 'exemples', nom, 'journal.jsonl'));

describe('l’état de la page', () => {
  it('mission en cours : architecte terminé, designer en cours, l’étape active en couleur', () => {
    const { missions } = etatDeLaPage(exemple('mission-en-cours'));
    expect(missions).toHaveLength(1);
    const m = missions[0];
    expect(m.mission).toBe('120B');
    expect(m.branche).toBe('mission-120B-confrere');
    expect(m.agents.find((a) => a.nom === 'architecte')).toMatchObject({ etat: 'terminé' });
    expect(m.agents.find((a) => a.nom === 'designer')).toMatchObject({
      etat: 'en cours',
      phrase: 'Lancé',
    });
    expect(m.agents.find((a) => a.nom === 'Jean-Guy')).toMatchObject({ etat: 'à venir' });
    expect(m.etapes.map((e) => `${e.cle}:${e.etat}`)).toEqual([
      'architecte:faite',
      'designer:active',
      'questions:à venir',
      'code:à venir',
      'gardien-sql:à venir',
      'accord:à venir',
      'relecteur:à venir',
      'push:à venir',
      'testeur:à venir',
      'parcoureur:à venir',
      'rendus:à venir',
      'rapport:à venir',
    ]);
  });

  it('migration en attente : le chef et Jean-Guy en « attend Jean-Guy », l’étape Accord active', () => {
    const { missions } = etatDeLaPage(exemple('migration-en-attente'));
    const m = missions[0];
    expect(m.chef.etat).toBe('attend Jean-Guy');
    expect(m.agents.find((a) => a.nom === 'Jean-Guy')).toMatchObject({
      etat: 'attend Jean-Guy',
      phrase: 'Au repos : attend Jean-Guy',
    });
    expect(m.etapes.find((e) => e.cle === 'gardien-sql')?.etat).toBe('faite');
    expect(m.etapes.find((e) => e.cle === 'accord')?.etat).toBe('active');
  });

  it('deux missions en parallèle : une colonne chacune, la plus récente en premier, les durées e2e', () => {
    const { missions, fil, cartes } = etatDeLaPage(exemple('deux-missions'), {
      base: { enAttente: [] },
    });
    expect(missions.map((m) => m.mission)).toEqual(['120B', '126']);
    const [m120, m126] = missions;
    expect(m120.dossier).not.toBe(m126.dossier);
    expect(m120.dureesE2e).toEqual([
      { suite: 'demo', secondes: 426 },
      { suite: 'parcours', secondes: 354 },
      { suite: 'bienvenue', secondes: 40 },
    ]);
    expect(m126.chef.etat).toBe('attend Jean-Guy');
    expect(m126.etapes.find((e) => e.cle === 'questions')?.etat).toBe('active');
    // Le designer n'a pas été lancé sur la 126 avant les questions : « sans objet ».
    expect(m126.etapes.find((e) => e.cle === 'designer')?.etat).toBe('sans objet');
    expect(m126.ouverteA).toBe('2026-10-30T11:30:40.000Z');
    expect(fil.length).toBeLessThanOrEqual(50);
    expect(fil[0].heure >= fil.at(-1).heure).toBe(true);
    expect(cartes.base.enAttente).toEqual([]);
  });

  it('sans journal : aucune mission, un fil vide, des cartes vides', () => {
    expect(etatDeLaPage([])).toMatchObject({ missions: [], fil: [], cartes: { base: null } });
  });
});

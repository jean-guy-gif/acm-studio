import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { etatDeLaPage, missionsOuvertes } from './etat.mjs';
import { lireJournal } from './journal.mjs';

// Mission 126 — ce que la page montre, lu sur les trois journaux d'exemple.
const exemple = (nom) =>
  lireJournal(resolve(import.meta.dirname, 'exemples', nom, 'journal.jsonl'));
// Les journaux d'exemple datent du 30/10 : la page se lit juste après leur dernière ligne, jamais à
// l'heure réelle (au-delà de 24 h sans ligne, une mission se ferme et les tests tombaient seuls).
const LU_LE = '2026-10-30T12:30:00.000Z';

describe('l’état de la page', () => {
  it('mission en cours : architecte terminé, designer en cours, l’étape active en couleur', () => {
    const { missions } = etatDeLaPage(exemple('mission-en-cours'), null, LU_LE);
    expect(missions).toHaveLength(1);
    const m = missions[0];
    expect(m.mission).toBe('120B');
    expect(m.branche).toBe('mission-120B-confrere');
    expect(m.agents.find((a) => a.nom === 'architecte')).toMatchObject({ etat: 'terminé' });
    expect(m.agents.find((a) => a.nom === 'designer')).toMatchObject({
      etat: 'en cours',
      phrase: 'Lancé par le chef',
    });
    expect(m.agents.find((a) => a.nom === 'Jean-Guy')).toMatchObject({ etat: 'rien en attente' });
    // Un agent travaille : le chef « attend ses agents », en bleu (règle de Jean-Guy, 29/10).
    expect(m.chef).toMatchObject({ etat: 'en cours', mot: 'attend ses agents : designer' });
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
    const { missions } = etatDeLaPage(exemple('migration-en-attente'), null, LU_LE);
    const m = missions[0];
    expect(m.chef).toMatchObject({ etat: 'attend Jean-Guy', mot: 'attend Jean-Guy' });
    expect(m.agents.find((a) => a.nom === 'Jean-Guy')).toMatchObject({
      etat: 'attend Jean-Guy',
      phrase: "Migration 20261118090000_detachement soumise : j'attends l'accord et le comptage",
    });
    expect(m.etapes.find((e) => e.cle === 'gardien-sql')?.etat).toBe('faite');
    expect(m.etapes.find((e) => e.cle === 'accord')?.etat).toBe('active');
  });

  it('deux missions en parallèle : une colonne chacune, la plus récente en premier, les durées e2e', () => {
    const { missions, fil, cartes } = etatDeLaPage(
      exemple('deux-missions'),
      { base: { enAttente: [] } },
      LU_LE,
    );
    expect(missions.map((m) => m.mission)).toEqual(['120B', '126']);
    const [m120, m126] = missions;
    expect(m120.dossier).not.toBe(m126.dossier);
    expect(m120.dureesE2e).toEqual([
      { suite: 'demo', secondes: 426 },
      { suite: 'parcours', secondes: 354 },
      { suite: 'bienvenue', secondes: 40 },
    ]);
    expect(m126.chef.etat).toBe('attend Jean-Guy');
    // Le testeur de la 120 B tourne : son chef attend ses agents, pas Jean-Guy.
    expect(m120.chef).toMatchObject({ etat: 'en cours', mot: 'attend ses agents : testeur' });
    expect(m126.etapes.find((e) => e.cle === 'questions')?.etat).toBe('active');
    // Le designer n'a pas été lancé sur la 126 avant les questions : « non jouée » (Jean-Guy, 29/10).
    expect(m126.etapes.find((e) => e.cle === 'designer')?.etat).toBe('non jouée');
    expect(m126.ouverteA).toBe('2026-10-30T11:30:40.000Z');
    expect(fil.length).toBeLessThanOrEqual(50);
    expect(fil[0].heure >= fil.at(-1).heure).toBe(true);
    expect(cartes.base.enAttente).toEqual([]);
  });

  it('une mission se ferme à la ligne /valide, ou après 24 h sans ligne', () => {
    const lignes = exemple('mission-en-cours');
    const derniere = lignes.at(-1).heure;
    const plusTard = (h) => new Date(Date.parse(derniere) + h * 3600 * 1000).toISOString();
    expect(etatDeLaPage(lignes, null, plusTard(23)).missions).toHaveLength(1);
    expect(etatDeLaPage(lignes, null, plusTard(25)).missions).toHaveLength(0);
    expect(missionsOuvertes(lignes, plusTard(1))).toEqual([
      { mission: '120B', dossier: lignes.at(-1).dossier, branche: 'mission-120B-confrere' },
    ]);
    const validee = [
      ...lignes,
      {
        ...lignes.at(-1),
        agent: 'chef',
        etat: 'en cours',
        evenement: 'valide',
        phrase: 'Validation',
      },
    ];
    expect(etatDeLaPage(validee, null, plusTard(1)).missions).toHaveLength(0);
    // Ses lignes restent dans le fil.
    expect(etatDeLaPage(validee, null, plusTard(1)).fil.length).toBe(validee.length);
  });

  it('sans journal : aucune mission, un fil vide, des cartes vides', () => {
    expect(etatDeLaPage([])).toMatchObject({ missions: [], fil: [], cartes: { base: null } });
  });
});

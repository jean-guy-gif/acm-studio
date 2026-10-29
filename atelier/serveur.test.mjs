import { spawn } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { carteBase, lireCi, lireListeMigrations } from './cartes.mjs';
import { contientSecret } from './secrets.mjs';
import { creerAtelier, lireOptions } from './serveur.mjs';

// Mission 126 — le serveur répond, la page lit un journal d'exemple et affiche les états en français,
// aucun secret ne sort ; `npm run atelier` démarre et répond.
const EXEMPLES = resolve(import.meta.dirname, 'exemples');
let atelier;
let port;

beforeAll(async () => {
  atelier = creerAtelier(
    lireOptions(['--port', '0', '--exemple', join(EXEMPLES, 'migration-en-attente')]),
  );
  port = await atelier.ecouter();
});
afterAll(() => atelier.fermer());

const lire = (chemin) => fetch(`http://127.0.0.1:${port}${chemin}`);

describe('le serveur de l’atelier', () => {
  it('sert la page, l’état et la santé ; 404 ailleurs', async () => {
    expect((await lire('/sante')).status).toBe(200);
    const page = await lire('/');
    expect(page.status).toBe(200);
    expect(page.headers.get('content-type')).toContain('text/html');
    expect(await page.text()).toContain('L’atelier');
    expect((await lire('/autre')).status).toBe(404);
  });

  it('l’état dit la mission, l’orange de la migration en attente, en français sans jargon', async () => {
    const etat = await (await lire('/etat')).json();
    expect(etat.missions[0].mission).toBe('120B');
    expect(etat.cartes.base.enAttente).toEqual([{ version: '20261118090000', nom: 'detachement' }]);
    expect(etat.missions[0].chef.etat).toBe('attend Jean-Guy');
    const texte = JSON.stringify(etat);
    expect(texte).not.toMatch(/\b(blocked|done|pending|running)\b/);
    expect(contientSecret(texte)).toBe(false);
  });

  it('les journaux d’exemple ne portent aucun secret, et disent « attend Jean-Guy »', () => {
    for (const nom of readdirSync(EXEMPLES)) {
      const journal = readFileSync(join(EXEMPLES, nom, 'journal.jsonl'), 'utf8');
      const cartes = readFileSync(join(EXEMPLES, nom, 'cartes.json'), 'utf8');
      expect(contientSecret(journal), nom).toBe(false);
      expect(contientSecret(cartes), nom).toBe(false);
      expect(journal).not.toMatch(/\b(blocked|done|pending)\b/);
    }
    expect(readFileSync(join(EXEMPLES, 'migration-en-attente', 'journal.jsonl'), 'utf8')).toContain(
      'attend Jean-Guy',
    );
  });

  it('« npm run atelier » démarre et répond', async () => {
    const enfant = spawn(
      process.execPath,
      [resolve(import.meta.dirname, 'serveur.mjs'), '--port', '0', '--sans-cartes'],
      {
        env: { ...process.env, ATELIER_HOME: EXEMPLES },
      },
    );
    try {
      const sortie = await new Promise((resoudre, rejeter) => {
        let brut = '';
        enfant.stdout.on('data', (d) => {
          brut += d;
          const m = /http:\/\/127\.0\.0\.1:(\d+)/.exec(brut);
          if (m) resoudre(m[1]);
        });
        enfant.on('exit', (code) => rejeter(new Error(`sorti avec ${code}`)));
        setTimeout(() => rejeter(new Error('pas de réponse')), 10_000);
      });
      expect((await fetch(`http://127.0.0.1:${sortie}/sante`)).status).toBe(200);
    } finally {
      enfant.kill();
    }
  });
});

describe('les cartes, lues sur des sorties factices', () => {
  it('la base : dernière appliquée, en attente = fichier de la branche absent de la liste', () => {
    const liste = lireListeMigrations(
      '{"migrations":[{"local":"20261116090000","remote":"20261116090000"},{"local":"20261117090000","remote":""}]}',
    );
    expect(liste).toEqual([
      { local: '20261116090000', remote: '20261116090000' },
      { local: '20261117090000', remote: '' },
    ]);
    const carte = carteBase(liste, [
      { version: '20261116090000', nom: 'acquereur_pour_votre_bien' },
      { version: '20261117090000', nom: 'une_carte_par_bien' },
    ]);
    expect(carte.derniereAppliquee).toEqual({
      version: '20261116090000',
      nom: 'acquereur_pour_votre_bien',
    });
    expect(carte.enAttente).toEqual([{ version: '20261117090000', nom: 'une_carte_par_bien' }]);
    expect(lireListeMigrations('20261116090000 | 20261116090000 | 2026-11-16 09:00:00')).toEqual([
      { local: '20261116090000', remote: '20261116090000' },
    ]);
  });

  it('la CI : verte, rouge, en cours, aucune', () => {
    expect(
      lireCi('[{"headSha":"7767501abc","status":"completed","conclusion":"success"}]'),
    ).toEqual({
      commit: '7767501',
      etat: 'verte',
      verte: true,
    });
    expect(lireCi('[{"headSha":"x","status":"in_progress","conclusion":""}]').etat).toBe(
      'en cours',
    );
    expect(lireCi('[]').etat).toBe('aucune');
    expect(lireCi('pas du json').etat).toBe('illisible');
  });
});

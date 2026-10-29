#!/usr/bin/env node
// Mission 126 — le serveur de l'atelier : `node atelier/serveur.mjs` (port 4871), sans dépendance.
//   /          la page
//   /etat      ce que la page montre (missions, agents, étapes, cartes, fil), en JSON
//   /sante     « ok »
// Options : --port N (0 = libre, affiché au démarrage), --ouvrir (ouvre le navigateur, macOS),
// --exemple <dossier> (un journal d'exemple et ses cartes, aucune commande ni adresse lue),
// --sans-cartes (aucune lecture de la base, de l'essai ni de la production).
// Les cartes se lisent toutes les 5 min (base) et toutes les 60 s (essai, production).
import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { lireBase, lireEssai, lireProduction, titreDeMission } from './cartes.mjs';
import { etatDeLaPage } from './etat.mjs';
import { cheminJournal, lireJournal, missionDeBranche } from './journal.mjs';
import { contientSecret } from './secrets.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const DOSSIER_PROJET = resolve(ICI, '..');

export function lireOptions(argv) {
  const options = { port: 4871, ouvrir: false, exemple: null, sansCartes: false, journal: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--port') options.port = Number(argv[++i] ?? 4871);
    else if (a === '--ouvrir') options.ouvrir = true;
    else if (a === '--exemple') options.exemple = resolve(argv[++i] ?? '');
    else if (a === '--sans-cartes') options.sansCartes = true;
    else if (a === '--journal') options.journal = resolve(argv[++i] ?? '');
  }
  return options;
}

export function creerAtelier(options) {
  const journal = options.exemple
    ? join(options.exemple, 'journal.jsonl')
    : (options.journal ?? cheminJournal());
  let cartes = { base: null, essai: null, production: null };
  if (options.exemple) {
    const chemin = join(options.exemple, 'cartes.json');
    cartes = existsSync(chemin) ? JSON.parse(readFileSync(chemin, 'utf8')) : cartes;
  }
  const minuteries = [];

  // Les dossiers et branches des missions vivantes, pour les cartes (une mission en parallèle a son
  // propre dossier et sa propre branche).
  const missionsVivantes = () => {
    const lignes = lireJournal(journal);
    const parDossier = new Map();
    for (const l of lignes) {
      if (l.dossier && missionDeBranche(l.branche)) parDossier.set(l.dossier, l.branche);
    }
    if (parDossier.size === 0) parDossier.set(DOSSIER_PROJET, '');
    return [...parDossier];
  };

  const rafraichirBase = async () => {
    cartes.base = await lireBase(missionsVivantes().map(([dossier]) => dossier));
  };
  const rafraichirDeploiements = async () => {
    const [dossier, branche] = missionsVivantes()[0];
    const [essai, production] = await Promise.all([
      lireEssai(dossier, branche),
      lireProduction(dossier),
    ]);
    cartes.essai = essai;
    cartes.production = production;
  };
  if (!options.exemple && !options.sansCartes) {
    rafraichirBase().catch(() => undefined);
    rafraichirDeploiements().catch(() => undefined);
    minuteries.push(setInterval(() => rafraichirBase().catch(() => undefined), 5 * 60_000));
    minuteries.push(setInterval(() => rafraichirDeploiements().catch(() => undefined), 60_000));
  }

  const page = () => readFileSync(join(ICI, 'index.html'), 'utf8');
  const etat = () => {
    const page = etatDeLaPage(lireJournal(journal), cartes);
    // Le titre de chaque mission, lu dans sa fiche (le dossier de la mission, sinon celui-ci).
    for (const m of page.missions) {
      m.titreFiche = options.exemple
        ? (cartes.titres?.[m.mission] ?? null)
        : (titreDeMission(m.dossier || DOSSIER_PROJET, m.mission) ??
          titreDeMission(DOSSIER_PROJET, m.mission));
    }
    const corps = JSON.stringify(page);
    // Seconde parade : rien qui ressemble à un secret ne quitte le serveur.
    return contientSecret(corps)
      ? JSON.stringify({ erreur: 'Le journal porte un secret : page retenue.' })
      : corps;
  };

  const serveur = createServer((requete, reponse) => {
    const chemin = new URL(requete.url ?? '/', 'http://127.0.0.1').pathname;
    const entetes = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
    if (chemin === '/sante') {
      reponse.writeHead(200, { ...entetes, 'Content-Type': 'text/plain; charset=utf-8' });
      reponse.end('ok');
    } else if (chemin === '/etat') {
      reponse.writeHead(200, { ...entetes, 'Content-Type': 'application/json; charset=utf-8' });
      reponse.end(etat());
    } else if (chemin === '/') {
      reponse.writeHead(200, { ...entetes, 'Content-Type': 'text/html; charset=utf-8' });
      reponse.end(page());
    } else {
      reponse.writeHead(404, { ...entetes, 'Content-Type': 'text/plain; charset=utf-8' });
      reponse.end('Page introuvable');
    }
  });

  return {
    serveur,
    journal,
    ecouter: () =>
      new Promise((resoudre) => {
        serveur.listen(options.port, '127.0.0.1', () => resoudre(serveur.address().port));
      }),
    fermer: () => {
      for (const m of minuteries) clearInterval(m);
      serveur.close();
    },
  };
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const options = lireOptions(process.argv.slice(2));
  const atelier = creerAtelier(options);
  atelier.ecouter().then((port) => {
    const adresse = `http://127.0.0.1:${port}`;
    console.log(`Atelier : ${adresse} — journal ${atelier.journal}`);
    if (options.ouvrir) {
      execFile(process.platform === 'darwin' ? 'open' : 'xdg-open', [adresse], () => undefined);
    }
  });
}

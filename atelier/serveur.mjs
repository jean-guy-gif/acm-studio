#!/usr/bin/env node
// Mission 126 — le serveur de l'atelier : `node atelier/serveur.mjs` (port 4871), sans dépendance.
//   /          la page
//   /etat      ce que la page montre (missions, agents, étapes, cartes, fil), en JSON
//   /sante     « ok »
// Options : --port N (0 = libre, affiché au démarrage), --ouvrir (ouvre le navigateur, macOS),
// --exemple <dossier> (un journal d'exemple et ses cartes, aucune commande ni adresse lue),
// --sans-cartes (aucune lecture de la base, de l'essai ni de la production).
// Les cartes se lisent toutes les 5 min (base) et toutes les 60 s (essai, production) ; chaque
// lecture a son délai et rend son erreur dans sa carte ; le serveur tient un journal de marche,
// `~/acm-studio-atelier/serveur.log`, 5 000 lignes au plus (constat A de Jean-Guy, 29/10).
import { execFile } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { lireBase, lireEssai, lireProduction, titreDeMission } from './cartes.mjs';
import { etatDeLaPage, missionsOuvertes } from './etat.mjs';
import { cheminJournal, dossierAtelier, lireJournal } from './journal.mjs';
import { contientSecret, masquerSecrets } from './secrets.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const DOSSIER_PROJET = resolve(ICI, '..');
export const LIGNES_DE_MARCHE_MAXIMUM = 5000;

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

// Le journal de marche du serveur : une ligne datée, masquée, jamais une sortie brute ; plafonné
// à 5 000 lignes, les plus anciennes partent (décision de Jean-Guy, 29/10).
export function journaliser(texte, chemin = join(dossierAtelier(), 'serveur.log')) {
  try {
    mkdirSync(dirname(chemin), { recursive: true });
    const ligne = `${new Date().toISOString()} ${masquerSecrets(String(texte)).replace(/\s+/g, ' ').slice(0, 300)}\n`;
    if (existsSync(chemin)) {
      const lignes = readFileSync(chemin, 'utf8')
        .split('\n')
        .filter((l) => l !== '');
      if (lignes.length >= LIGNES_DE_MARCHE_MAXIMUM) {
        writeFileSync(
          chemin,
          `${lignes.slice(-(LIGNES_DE_MARCHE_MAXIMUM - 1)).join('\n')}\n${ligne}`,
        );
        return;
      }
    }
    appendFileSync(chemin, ligne);
  } catch {
    // Un journal en panne n'ajoute jamais une erreur à l'erreur.
  }
}

const erreurLisible = (e, defaut = 'erreur') =>
  masquerSecrets(String(e?.message ?? defaut)).slice(0, 120);

// `options.lecteurs` : les trois lectures, remplaçables par les tests (une lecture qui pend).
export function creerAtelier(options) {
  const journal = options.exemple
    ? join(options.exemple, 'journal.jsonl')
    : (options.journal ?? cheminJournal());
  const lecteurs = { lireBase, lireEssai, lireProduction, ...(options.lecteurs ?? {}) };
  // Un exemple ne journalise pas (les tests tournent dans le dépôt).
  const marche = options.exemple ? () => undefined : (texte) => journaliser(texte);
  const lecture = () => ({ enCours: true, depuis: new Date().toISOString() });
  let cartes = { base: null, essai: null, production: null };
  if (options.exemple) {
    const chemin = join(options.exemple, 'cartes.json');
    cartes = existsSync(chemin) ? JSON.parse(readFileSync(chemin, 'utf8')) : cartes;
  } else if (!options.sansCartes) {
    cartes = { base: lecture(), essai: lecture(), production: lecture() };
  }
  const minuteries = [];
  const enCours = { base: false, deploiements: false };

  // Les dossiers et branches des missions ouvertes, pour les cartes (une mission en parallèle a son
  // propre dossier et sa propre branche) ; un dossier disparu (worktree retiré) est ignoré.
  const vivantes = () => {
    const ouvertes = missionsOuvertes(lireJournal(journal)).filter(
      (m) => m.dossier && existsSync(m.dossier),
    );
    return ouvertes.length > 0
      ? ouvertes
      : [{ mission: null, dossier: DOSSIER_PROJET, branche: '' }];
  };

  const rafraichirBase = async () => {
    if (enCours.base) return;
    enCours.base = true;
    const debut = Date.now();
    try {
      cartes.base = await lecteurs.lireBase(vivantes().map((m) => m.dossier));
      marche(
        `base lue en ${Date.now() - debut} ms${cartes.base.erreur ? ` : ${cartes.base.erreur}` : ''}`,
      );
    } catch (e) {
      cartes.base = {
        derniereAppliquee: null,
        enAttente: [],
        lueA: new Date().toISOString(),
        erreur: `Base illisible : ${erreurLisible(e)}`,
      };
      marche(`base en erreur : ${erreurLisible(e)}`);
    } finally {
      enCours.base = false;
    }
  };
  const rafraichirDeploiements = async () => {
    if (enCours.deploiements) return;
    enCours.deploiements = true;
    const debut = Date.now();
    try {
      const [{ dossier, branche }] = vivantes();
      const [essai, production] = await Promise.all([
        lecteurs.lireEssai(dossier, branche).catch((e) => ({
          commit: null,
          erreur: `Essai illisible : ${erreurLisible(e)}`,
          ci: null,
          lueA: new Date().toISOString(),
        })),
        lecteurs.lireProduction(dossier).catch((e) => ({
          commit: null,
          erreur: `Production illisible : ${erreurLisible(e)}`,
          fusion: null,
          lueA: new Date().toISOString(),
        })),
      ]);
      cartes.essai = essai;
      cartes.production = production;
      marche(
        `essai et production lus en ${Date.now() - debut} ms (essai ${essai.commit ?? essai.erreur}, production ${production.commit ?? production.erreur})`,
      );
    } catch (e) {
      const erreur = `Lecture impossible : ${erreurLisible(e)}`;
      cartes.essai = { commit: null, erreur, ci: null, lueA: new Date().toISOString() };
      cartes.production = { commit: null, erreur, fusion: null, lueA: new Date().toISOString() };
      marche(`déploiements en erreur : ${erreurLisible(e)}`);
    } finally {
      enCours.deploiements = false;
    }
  };
  if (!options.exemple && !options.sansCartes) {
    rafraichirBase().catch((e) => marche(`base : ${erreurLisible(e)}`));
    rafraichirDeploiements().catch((e) => marche(`déploiements : ${erreurLisible(e)}`));
    minuteries.push(
      setInterval(
        () => rafraichirBase().catch((e) => marche(`base : ${erreurLisible(e)}`)),
        5 * 60_000,
      ),
    );
    minuteries.push(
      setInterval(
        () => rafraichirDeploiements().catch((e) => marche(`déploiements : ${erreurLisible(e)}`)),
        60_000,
      ),
    );
  }

  const page = () => readFileSync(join(ICI, 'index.html'), 'utf8');
  const etat = () => {
    const lignes = lireJournal(journal);
    // Un exemple vit à l'heure de sa dernière ligne, plus 90 s : ses « depuis » sont stables.
    const maintenant = options.exemple
      ? new Date(Date.parse(lignes.at(-1)?.heure ?? Date.now()) + 90_000).toISOString()
      : new Date().toISOString();
    const page = etatDeLaPage(lignes, cartes, maintenant);
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
    try {
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
    } catch (e) {
      marche(`réponse en erreur sur ${chemin} : ${erreurLisible(e)}`);
      reponse.writeHead(500, { ...entetes, 'Content-Type': 'application/json; charset=utf-8' });
      reponse.end(JSON.stringify({ erreur: 'Le serveur n’a pas pu lire le journal.' }));
    }
  });

  return {
    serveur,
    journal,
    marche,
    ecouter: () =>
      new Promise((resoudre, rejeter) => {
        serveur.once('error', rejeter);
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
  // Rien ne fait tomber le serveur : une erreur inattendue entre au journal de marche.
  process.on('uncaughtException', (e) => atelier.marche(`erreur inattendue : ${erreurLisible(e)}`));
  process.on('unhandledRejection', (e) => atelier.marche(`promesse rejetée : ${erreurLisible(e)}`));
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(signal, () => {
      atelier.marche(`arrêté par ${signal}`);
      process.exit(0);
    });
  }
  atelier
    .ecouter()
    .then((port) => {
      const adresse = `http://127.0.0.1:${port}`;
      atelier.marche(`démarré sur ${adresse}, journal ${atelier.journal}`);
      console.log(`Atelier : ${adresse} — journal ${atelier.journal}`);
      if (options.ouvrir) {
        execFile(process.platform === 'darwin' ? 'open' : 'xdg-open', [adresse], () => undefined);
      }
    })
    .catch((e) => {
      const message =
        e?.code === 'EADDRINUSE'
          ? `Le port ${options.port} est déjà pris : un atelier tourne déjà ? (--port 0 pour un port libre)`
          : `L’atelier n’a pas pu démarrer : ${erreurLisible(e)}`;
      atelier.marche(message);
      console.error(message);
      process.exit(1);
    });
}

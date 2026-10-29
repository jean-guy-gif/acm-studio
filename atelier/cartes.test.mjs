import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { commande, dateDeVersion, derniereFusion } from './cartes.mjs';
import { creerAtelier, journaliser, lireOptions, LIGNES_DE_MARCHE_MAXIMUM } from './serveur.mjs';

// Mission 126 — constat A de Jean-Guy (29/10) : une lecture de carte ne bloque ni ne fait tomber
// le serveur, chacune a son délai et son erreur dans sa carte. Un test n'écrit jamais chez
// l'utilisateur : `ATELIER_HOME` part dans un dossier temporaire (relecteur, 29/10).
let home;
let ancienHome;
beforeAll(() => {
  home = mkdtempSync(join(tmpdir(), 'atelier-cartes-'));
  ancienHome = process.env.ATELIER_HOME;
  process.env.ATELIER_HOME = home;
});
afterAll(() => {
  if (ancienHome === undefined) delete process.env.ATELIER_HOME;
  else process.env.ATELIER_HOME = ancienHome;
  rmSync(home, { recursive: true, force: true });
});

describe('une lecture de carte, bornée', () => {
  it('une commande qui pend est tuée au délai et rejette « délai dépassé »', async () => {
    const debut = Date.now();
    await expect(commande('sleep', ['30'], { delai: 200 })).rejects.toThrow('délai dépassé');
    expect(Date.now() - debut).toBeLessThan(5_000);
  });

  it('une commande qui échoue rend sa première ligne d’erreur, masquée, jamais sa sortie entière', async () => {
    await expect(
      commande(
        'sh',
        ['-c', 'echo "clé E2E_VERCEL_BYPASS=Ab3dEfGh1jKlMnOpQrStUvWxYz012345" >&2; exit 3'],
        {
          delai: 5_000,
        },
      ),
    ).rejects.toThrow('E2E_VERCEL_BYPASS=[masqué]');
    const { stdout } = await commande('sh', ['-c', 'echo ok'], { delai: 5_000 });
    expect(stdout.trim()).toBe('ok');
  });

  it('/etat répond pendant qu’une lecture de carte pend, et dit la lecture en cours', async () => {
    const jamais = () => new Promise(() => undefined);
    const atelier = creerAtelier({
      ...lireOptions(['--port', '0', '--journal', join(home, 'journal.jsonl')]),
      lecteurs: { lireBase: jamais, lireEssai: jamais, lireProduction: jamais },
    });
    const port = await atelier.ecouter();
    try {
      const debut = Date.now();
      const etat = await (await fetch(`http://127.0.0.1:${port}/etat`)).json();
      expect(Date.now() - debut).toBeLessThan(2_000);
      expect(etat.cartes.base.enCours).toBe(true);
      expect(etat.cartes.essai.enCours).toBe(true);
      expect(etat.cartes.production.enCours).toBe(true);
    } finally {
      atelier.fermer();
    }
  });

  it('une lecture qui lève rend l’erreur dans sa carte et libère le verrou pour la suivante', async () => {
    let appels = 0;
    const leve = async () => {
      appels += 1;
      throw new Error('panne E2E_VERCEL_BYPASS=Ab3dEfGh1jKlMnOpQrStUvWxYz012345');
    };
    const atelier = creerAtelier({
      ...lireOptions(['--port', '0', '--journal', join(home, 'journal.jsonl')]),
      lecteurs: { lireBase: leve, lireEssai: leve, lireProduction: leve },
    });
    const port = await atelier.ecouter();
    try {
      await new Promise((r) => setTimeout(r, 50));
      const etat = await (await fetch(`http://127.0.0.1:${port}/etat`)).json();
      expect(etat.cartes.base.erreur).toContain('Base illisible');
      expect(etat.cartes.essai.erreur).toContain('Essai illisible');
      expect(JSON.stringify(etat)).not.toContain('Ab3dEfGh1jKlMnOpQrStUvWxYz012345');
      expect(appels).toBe(3);
    } finally {
      atelier.fermer();
    }
  });

  it('la dernière fusion se lit par ls-remote seul, une fois par 5 min : aucune ref touchée, aucun .lock', async () => {
    const depot = process.cwd();
    const gitDir = execFileSync('git', ['rev-parse', '--git-common-dir'], {
      cwd: depot,
      encoding: 'utf8',
    }).trim();
    const refs = () =>
      execFileSync('git', ['for-each-ref', '--format=%(refname) %(objectname)'], {
        cwd: depot,
        encoding: 'utf8',
      });
    const fetchHead = join(gitDir, 'FETCH_HEAD');
    const avant = {
      refs: refs(),
      fetch: existsSync(fetchHead) ? statSync(fetchHead).mtimeMs : null,
    };
    // Le dépôt distant est joué : la preuve tient hors ligne, et compte les appels.
    const appels = [];
    const sha = 'abcdef0123456789abcdef0123456789abcdef01';
    const executer = async (programme, args, options) => {
      appels.push(`${programme} ${args.join(' ')}`);
      if (args[0] === 'ls-remote') return { stdout: `${sha}\trefs/heads/main\n`, stderr: '' };
      return commande(programme, args, options);
    };
    const maintenant = Date.now();
    const fusion = await derniereFusion(`${depot}#test`, maintenant, executer);
    expect(fusion.commit).toBe('abcdef0');
    expect(appels[0]).toBe('git ls-remote origin refs/heads/main');
    expect(appels.some((a) => a.startsWith('git fetch'))).toBe(false);
    expect(refs()).toBe(avant.refs);
    expect(existsSync(fetchHead) ? statSync(fetchHead).mtimeMs : null).toBe(avant.fetch);
    const verrous = readdirSync(gitDir, { recursive: true }).filter((f) =>
      String(f).endsWith('.lock'),
    );
    expect(verrous).toEqual([]);
    // Relue dans les 5 min : aucun nouvel appel ; après, un seul de plus.
    const nombre = appels.length;
    expect(await derniereFusion(`${depot}#test`, maintenant + 4 * 60_000, executer)).toEqual(
      fusion,
    );
    expect(appels).toHaveLength(nombre);
    await derniereFusion(`${depot}#test`, maintenant + 6 * 60_000, executer);
    expect(appels.filter((a) => a.startsWith('git ls-remote'))).toHaveLength(2);
  });

  it('la date d’une migration se lit dans sa version', () => {
    expect(dateDeVersion('20261118090000_x')).toBe('18/11/2026');
    expect(dateDeVersion('x')).toBeNull();
  });
});

describe('le journal de marche du serveur', () => {
  it('est plafonné à 5 000 lignes, les plus anciennes partent, et il masque', () => {
    const dossier = mkdtempSync(join(tmpdir(), 'atelier-marche-'));
    const chemin = join(dossier, 'serveur.log');
    try {
      for (let i = 0; i < LIGNES_DE_MARCHE_MAXIMUM + 5; i += 1) journaliser(`ligne ${i}`, chemin);
      journaliser('jeton E2E_VERCEL_BYPASS=Ab3dEfGh1jKlMnOpQrStUvWxYz012345', chemin);
      const lignes = readFileSync(chemin, 'utf8')
        .split('\n')
        .filter((l) => l !== '');
      expect(lignes).toHaveLength(LIGNES_DE_MARCHE_MAXIMUM);
      expect(lignes[0]).toContain('ligne 6');
      expect(lignes.at(-1)).toContain('E2E_VERCEL_BYPASS=[masqué]');
    } finally {
      rmSync(dossier, { recursive: true, force: true });
    }
  });
});

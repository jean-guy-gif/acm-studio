import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import type { PortalSearchLink } from '@/features/competitor-search/services/build-portal-search-urls';
import {
  readPortalsSequentially,
  type PortalReadOutcome,
} from '@/features/competitor-search/services/read-portals-sequentially';

const DIR = join(__dirname, '..', '__fixtures__');
const bieniciHtml = readFileSync(join(DIR, 'bienici-resultats-nice.html'), 'utf8');

const LINKS: PortalSearchLink[] = [
  {
    portal: 'green_acres',
    label: 'Green Acres',
    url: 'https://www.green-acres.fr/immobilier/nice',
  },
  {
    portal: 'seloger',
    label: 'SeLoger',
    url: 'https://www.seloger.com/immobilier/achat/immo-nice-06/',
  },
  {
    portal: 'bienici',
    label: 'Bien’ici',
    url: 'https://www.bienici.com/recherche/achat/nice-06000',
  },
  {
    portal: 'maisons_appartements',
    label: 'Maisons et Appartements',
    url: 'https://www.maisonsetappartements.fr/fr/06/vente/nice/',
  },
];

// §10 — un délai d'une seconde entre deux pages sur TOUS les portails : sleep est
// appelé entre chaque page, jamais avant la première.
describe('readPortalsSequentially — cadence d’une seconde entre les pages', () => {
  it('attend entre chaque page, pas avant la première', async () => {
    const sleep = vi.fn(async () => {});
    await readPortalsSequentially(LINKS, {
      readPage: async () => ({ ok: false, reason: 'unavailable' }),
      sleep,
      interPageDelayMs: 1000,
    });
    // 4 portails → 3 attentes (entre 1-2, 2-3, 3-4), jamais avant le premier.
    expect(sleep).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledWith(1000);
  });
});

// §10 — l'échec partiel : un portail muet n'emporte pas les autres, et l'écran dit
// lequel n'a rien rendu.
describe('readPortalsSequentially — isolation et statut par portail', () => {
  it('le deuxième portail échoue, les autres aboutissent, la liste reste utilisable', async () => {
    const reads: Record<string, PortalReadOutcome> = {
      'https://www.green-acres.fr/immobilier/nice': { ok: false, reason: 'robots' },
      'https://www.seloger.com/immobilier/achat/immo-nice-06/': { ok: false, reason: 'timeout' },
      'https://www.bienici.com/recherche/achat/nice-06000': {
        ok: true,
        html: bieniciHtml,
        finalUrl: 'https://www.bienici.com/recherche/achat/nice-06000',
      },
      // Une page reçue mais vide de cartes → empty.
      'https://www.maisonsetappartements.fr/fr/06/vente/nice/': {
        ok: true,
        html: '<html><body>aucune annonce</body></html>',
        finalUrl: 'https://www.maisonsetappartements.fr/fr/06/vente/nice/',
      },
    };
    const results = await readPortalsSequentially(LINKS, {
      readPage: async (url) => reads[url],
      sleep: async () => {},
    });
    const byPortal = Object.fromEntries(results.map((r) => [r.portal, r]));
    // robots.txt interdit → refused (permanent) ; l'écran ne proposera pas « réessayer ».
    expect(byPortal.green_acres.status).toBe('refused');
    // délai/réseau → unreachable (passager) ; l'écran pourra relancer.
    expect(byPortal.seloger.status).toBe('unreachable');
    // page lue avec des cartes → ok, et les 26 cartes Bien'ici sont là.
    expect(byPortal.bienici.status).toBe('ok');
    expect(byPortal.bienici.candidates.length).toBe(26);
    // page reçue sans carte → empty.
    expect(byPortal.maisons_appartements.status).toBe('empty');
    // Aucun statut n'est laissé silencieux : chaque portail a un message quand il n'a rien rendu.
    for (const r of results) {
      if (r.status !== 'ok') {
        expect(r.message).toBeTruthy();
      }
    }
  });

  it('une exception inattendue sur un portail devient « unreachable », les autres continuent', async () => {
    const results = await readPortalsSequentially(LINKS.slice(0, 2), {
      readPage: async (url) => {
        if (url.includes('green-acres')) {
          throw new Error('boom');
        }
        return { ok: false, reason: 'network' };
      },
      sleep: async () => {},
    });
    expect(results[0].status).toBe('unreachable');
    expect(results[1].status).toBe('unreachable');
    expect(results).toHaveLength(2);
  });
});

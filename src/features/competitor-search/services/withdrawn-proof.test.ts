import { describe, expect, it } from 'vitest';

import { provesWithdrawn } from '@/features/competitor-search/services/withdrawn-proof';

const page = (body: string, title = 'SeLoger') =>
  `<html><head><title>${title}</title><style>.a{color:red}</style></head><body>${body}<script>var annonce = "Cette annonce n'est plus disponible";</script></body></html>`;

describe('provesWithdrawn — « Annonce retirée » seulement sur une preuve (mission 103)', () => {
  it('une page captcha, sans prix ni mention, ne prouve rien', () => {
    for (const html of [
      page('<h1>Vérification de sécurité</h1><p>Confirmez que vous n’êtes pas un robot.</p>'),
      page('<div id="app"></div>'),
      page('<p>Please enable JS and disable any ad blocker</p>', 'seloger.com'),
      '',
    ]) {
      expect(provesWithdrawn(html, 'www.seloger.com')).toBe(false);
    }
  });

  it('la mention explicite du portail prouve le retrait, quelle que soit son écriture', () => {
    for (const body of [
      '<h1>Cette annonce n’est plus disponible</h1>',
      '<p>Désolé, cette annonce n&#39;est plus en ligne.</p>',
      '<p>CETTE ANNONCE A ÉTÉ RETIRÉE par l’annonceur</p>',
      '<p>Annonce&nbsp;expirée</p>',
      '<p>Ce bien n’est plus disponible à la vente.</p>',
      '<p>Ce bien a été vendu.</p>',
    ]) {
      for (const host of [
        'www.seloger.com',
        'www.bienici.com',
        'www.green-acres.fr',
        'immobilier.lefigaro.fr',
        'www.maisonsetappartements.fr',
      ]) {
        expect(provesWithdrawn(page(body), host), `${host} — ${body}`).toBe(true);
      }
    }
  });

  it('une page 404 ou 410 se reconnaît à ce qu’elle écrit', () => {
    for (const html of [
      page('<h1>Erreur 404</h1>'),
      page('<h1>Oups</h1>', '404 Not Found'),
      page('<h1>Page introuvable</h1>'),
      page('<p>La page non trouvée</p>'),
      page('<h1>410 Gone</h1>'),
      page('<p>Cette page n’existe plus.</p>'),
    ]) {
      expect(provesWithdrawn(html, 'www.bienici.com')).toBe(true);
    }
  });

  it('« 404 » seul n’est pas une preuve : c’est aussi un prix ou une référence', () => {
    expect(provesWithdrawn(page('<p>Maison 404 m² — réf. 410</p>'), 'www.seloger.com')).toBe(false);
  });

  it('ne lit ni les scripts ni les styles : seulement ce que la page affiche', () => {
    expect(provesWithdrawn(page('<p>Chargement…</p>'), 'www.seloger.com')).toBe(false);
  });
});

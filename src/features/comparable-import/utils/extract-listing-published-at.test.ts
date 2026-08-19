import { describe, expect, it } from 'vitest';

import {
  daysOnMarketSince,
  extractListingPublishedAt,
} from '@/features/comparable-import/utils/extract-listing-published-at';

// Date de référence figée : le jour où le terrain a été mesuré.
const NOW = new Date('2026-08-19T10:00:00.000Z');

describe('extractListingPublishedAt', () => {
  // Terrain (19/08, SeLoger, Antibes) : le bloc schema.org est aplati en
  // {"type":…,"content":…} et les guillemets sont échappés.
  it('lit la forme aplatie schema.org de SeLoger', () => {
    const html = String.raw`<script>JSON.parse("{\"@type\":\"RealEstateListing\",{\"type\":\"datePosted\",\"content\":\"2026-04-10T07:32:00.000Z\"}")</script>`;
    expect(extractListingPublishedAt(html, NOW)).toBe('2026-04-10T07:32:00.000Z');
  });

  it('lit la forme usuelle clé/valeur, échappée ou non', () => {
    expect(extractListingPublishedAt('{"creationDate":"2026-04-10T07:32:00Z"}', NOW)).toBe(
      '2026-04-10T07:32:00.000Z',
    );
    expect(extractListingPublishedAt(String.raw`{\"publicationDate\":\"2026-05-02\"}`, NOW)).toBe(
      '2026-05-02T00:00:00.000Z',
    );
  });

  // Une annonce modifiée n'est pas une annonce republiée : compter la
  // modification comme mise en ligne raboterait le délai montré au vendeur.
  it('ignore la date de modification', () => {
    const html = '{"creationDate":"2026-04-10T07:32:00Z","updateDate":"2026-07-30T01:26:58.939Z"}';
    expect(extractListingPublishedAt(html, NOW)).toBe('2026-04-10T07:32:00.000Z');
  });

  it('retient la plus ancienne quand la page en publie plusieurs', () => {
    const html = '{"datePosted":"2026-06-01T00:00:00Z","creationDate":"2026-04-10T07:32:00Z"}';
    expect(extractListingPublishedAt(html, NOW)).toBe('2026-04-10T07:32:00.000Z');
  });

  it('écarte les dates invraisemblables et les valeurs qui ne sont pas des dates', () => {
    expect(extractListingPublishedAt('{"datePosted":"2027-01-01T00:00:00Z"}', NOW)).toBeNull();
    expect(extractListingPublishedAt('{"datePosted":"1990-01-01T00:00:00Z"}', NOW)).toBeNull();
    expect(extractListingPublishedAt('{"datePosted":"hier"}', NOW)).toBeNull();
    expect(extractListingPublishedAt('{"datePosted":"1975"}', NOW)).toBeNull();
  });

  it('ne renvoie rien sur une page sans date ni sur une page vide', () => {
    expect(extractListingPublishedAt('<html><body>Appartement T3</body></html>', NOW)).toBeNull();
    expect(extractListingPublishedAt('', NOW)).toBeNull();
  });
});

// Terrain (19/08, Le Figaro) : la page ne publie pas la date en clair. Son bloc
// `__NUXT_DATA__` est un tableau aplati où `"creationDate":3` désigne la case 3.
describe('extractListingPublishedAt — page à données aplaties (Nuxt)', () => {
  const payload = (nodes: string) =>
    `<script type="application/json" id="__NUXT_DATA__">${nodes}</script>`;

  it('déréférence l’indice quand la page ne porte qu’une annonce', () => {
    // Cases : 0 = objet annonce, 1 = référence, 2 = date de création,
    // 3 = date de première publication.
    const html = payload(
      '[{"creationDate":2,"firstPublicationDate":3},"IMBX/2194","2026-06-06T21:48:14","2026-06-07T08:00:00"]',
    );
    expect(extractListingPublishedAt(html, NOW)).toBe('2026-06-07T08:00:00.000Z');
  });

  it('préfère la première publication à la création', () => {
    const html = payload(
      '[{"creationDate":1,"firstPublicationDate":2},"2026-06-06T21:48:14","2026-06-07T08:00:00"]',
    );
    expect(extractListingPublishedAt(html, NOW)).toBe('2026-06-07T08:00:00.000Z');
  });

  it('se retient sur une page d’agence, qui porte plusieurs annonces', () => {
    // Trente et une annonces sur la page de l'agence : aucune date ne peut être
    // désignée comme celle de « l'annonce ». On préfère ne rien dire.
    const html = payload(
      '[{"firstPublicationDate":2},{"firstPublicationDate":3},"2026-06-07T08:00:00","2026-05-02T09:00:00"]',
    );
    expect(extractListingPublishedAt(html, NOW)).toBeNull();
  });

  it('ignore un bloc illisible ou des indices qui ne pointent pas sur une date', () => {
    expect(extractListingPublishedAt(payload('[{"creationDate":1},'), NOW)).toBeNull();
    expect(extractListingPublishedAt(payload('[{"creationDate":1},"bientôt"]'), NOW)).toBeNull();
    expect(extractListingPublishedAt(payload('[{"creationDate":99},"x"]'), NOW)).toBeNull();
  });
});

describe('daysOnMarketSince', () => {
  // Terrain (19/08) : l'annonce d'Antibes était en ligne depuis le 10/04.
  it('compte les jours écoulés depuis la mise en ligne', () => {
    expect(daysOnMarketSince('2026-04-10T07:32:00.000Z', NOW)).toBe(131);
  });

  it('ne descend jamais sous zéro et n’invente rien', () => {
    expect(daysOnMarketSince('2026-08-25T00:00:00.000Z', NOW)).toBe(0);
    expect(daysOnMarketSince(null, NOW)).toBeNull();
    expect(daysOnMarketSince('pas une date', NOW)).toBeNull();
  });
});

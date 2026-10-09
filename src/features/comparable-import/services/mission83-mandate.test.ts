import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { extractListingData } from '@/features/comparable-import/services/extract-listing-data';
import { normalizeListingData } from '@/features/comparable-import/services/normalize-listing-data';
import {
  readListingMandate,
  readMarkedMandate,
} from '@/features/comparable-import/services/read-listing-mandate';
import { detectSource } from '@/features/comparable-import/utils/detect-source';
import { UNKNOWN_MANDATE } from '@/features/competitor-mandate/types';

// Mission 83 — « Vendu par » et « Exclusivité », sur les pages réelles déjà capturées (une par
// portail) puis sur chaque piège mesuré le 09/10/2026.

const fixture = (name: string): string =>
  readFileSync(join(__dirname, '..', 'extractors', '__fixtures__', name), 'utf8');

function importMandate(name: string, url: string) {
  const { hostname } = new URL(url);
  const source = detectSource(hostname);
  const { data } = normalizeListingData(extractListingData(fixture(name), url), url, source);
  return {
    soldBy: data.soldBy,
    soldBySource: data.soldBySource,
    exclusivity: data.exclusivity,
    exclusivitySource: data.exclusivitySource,
  };
}

describe('lecture sur les pages réelles', () => {
  it('SeLoger : l’état de la page dit l’exclusivité et l’agence', () => {
    expect(
      importMandate(
        'seloger-villeneuve-loubet.html',
        'https://www.seloger.com/annonce/achat/provence-alpes-cote-d-azur/alpes-maritimes-06/villeneuve-loubet-06270/26ZEJMLWB13Y',
      ),
    ).toEqual({
      soldBy: 'agency',
      soldBySource: 'listing_data',
      exclusivity: 'yes',
      exclusivitySource: 'listing_data',
    });
  });

  it.each([
    ['bienici-antibes.html', 'https://www.bienici.com/annonce/iad-france-1'],
    ['bienici-cagnes-maison.html', 'https://www.bienici.com/annonce/laforet-immo-facile-1'],
  ])('Bien’ici (%s) : « Mandat en exclusivité » et le bloc annonceur', (name, url) => {
    expect(importMandate(name, url)).toEqual({
      soldBy: 'agency',
      soldBySource: 'advertiser',
      exclusivity: 'yes',
      exclusivitySource: 'badge',
    });
  });

  it('Figaro : « origin » dit l’agence ; sans « isExclusive » ni mention, mandat simple', () => {
    expect(
      importMandate(
        'figaro-nice-appartement.html',
        'https://immobilier.lefigaro.fr/annonces/annonce-109593037.html',
      ),
    ).toEqual({
      soldBy: 'agency',
      soldBySource: 'listing_data',
      exclusivity: 'no',
      exclusivitySource: 'no_mention',
    });
  });

  it('Green Acres : l’agence du bloc annonceur ; ni badge ni mention, mandat simple', () => {
    expect(
      importMandate(
        'green-acres-cagnes.html',
        'https://www.green-acres.fr/fr/properties/appartement/cagnes-sur-mer/A98cqw1yg8fmz1bt.htm',
      ),
    ).toEqual({
      soldBy: 'agency',
      soldBySource: 'advertiser',
      exclusivity: 'no',
      exclusivitySource: 'no_mention',
    });
  });

  // Retour d'essai du 09/10/2026 : annonce ouverte par-dessus une recherche (openAdvert), lue
  // ici sur son adresse propre, à la nouvelle présentation de Green Acres.
  it('Green Acres (Grasse, nouvelle présentation) : la bonne annonce, son agence, exclusivité oui', () => {
    const url = 'https://www.green-acres.fr/fr/properties/immobilier/grasse/Aw85w5p55r5k79fd.htm';
    const { data } = normalizeListingData(
      extractListingData(fixture('green-acres-grasse-exclusivite.html'), url),
      url,
      'Green Acres',
    );
    expect(data).toMatchObject({
      title: 'Exclusivite - Grasse Quartier Sainte-Anne - Maison De Hameau Pleine De Charme',
      city: 'Grasse',
      price: 325500,
      surfaceArea: 128,
      roomsCount: 6,
      soldBy: 'agency',
      soldBySource: 'advertiser',
      exclusivity: 'yes',
      exclusivitySource: 'badge',
    });
    expect(data.listingDescription).toMatch(/^EXCLUSIVITE - GRASSE QUARTIER SAINTE-ANNE/);
    expect(data.photoUrls.length).toBeGreaterThan(0);
    expect(data.photoUrls.every((photo) => photo.includes('Aw85w5p55r5k79fd'))).toBe(true);
  });

  it('Maisons et Appartements : le vendeur de l’offre est une organisation ; aucune mention, mandat simple', () => {
    expect(
      importMandate(
        'maisons-et-appartements-villeneuve.html',
        'https://www.maisonsetappartements.fr/ads/4534734',
      ),
    ).toEqual({
      soldBy: 'agency',
      soldBySource: 'listing_data',
      exclusivity: 'no',
      exclusivitySource: 'no_mention',
    });
  });
});

// Structures reproduites d'après les pages mesurées (chemins relevés dans le navigateur), réduites
// à ce que le lecteur regarde.
describe('pièges mesurés', () => {
  const greenAcresCard = `
    <div class="announce-card" data-advertid="1" data-o="L2Zy">
      <div class="photo-container"><div class="tags"><div class="upper-tags">
        <span class="tag tag--composed"><span class="tag__label">Exclusivité</span></span>
      </div></div></div>
      <div class="announce-info"></div>
    </div>`;

  it('Green Acres : le badge d’une annonce similaire ne dit rien de l’annonce', () => {
    const html = `<div class="main-title"><div class="title-bloc"><div class="title-info">
      <span class="tag tag--composed"><span class="tag__label">97 m²</span></span>
      </div></div></div>${greenAcresCard}${greenAcresCard}`;
    expect(readMarkedMandate(html, 'Green Acres')).toEqual(UNKNOWN_MANDATE);
  });

  it('Green Acres : le badge du bloc titre dit l’exclusivité', () => {
    const html = `<div class="main-title"><div class="title-bloc"><div class="title-info">
      <div class="mobile-agency-row">
        <span class="tag tag--composed"><span class="tag__label">Exclusivité</span></span>
      </div></div></div></div>
      <span class="advert-detail-agency-name">CENTURY 21 Lafage Transactions</span>
      ${greenAcresCard}`;
    expect(readMarkedMandate(html, 'Green Acres')).toEqual({
      soldBy: 'agency',
      soldBySource: 'advertiser',
      exclusivity: 'yes',
      exclusivitySource: 'badge',
    });
  });

  it('Bien’ici : le badge du carrousel des annonces similaires ne compte pas', () => {
    const html = `<div class="allDetails"><div class="labelInfo"><span>Réf. 12</span></div></div>
      <div class="vue-similar-ads">
        <span class="kimono-badge ad-emphasised-tags__badge">Exclusivité</span>
        <div class="labelInfo isExclusiveSaleMandate"><span>Mandat en exclusivité</span></div>
      </div>`;
    expect(readMarkedMandate(html, "Bien'ici")).toEqual(UNKNOWN_MANDATE);
  });

  it('SeLoger : « isExclusive » faux dit NON, seul cas où la source le dit', () => {
    const html = String.raw`{\"tags\":{\"isExclusive\":false},\"isPrivateOwner\":false}`;
    expect(readMarkedMandate(html, 'SeLoger')).toEqual({
      soldBy: 'agency',
      soldBySource: 'listing_data',
      exclusivity: 'no',
      exclusivitySource: 'listing_data',
    });
  });

  it('SeLoger : deux valeurs contraires ne décident rien', () => {
    const html = String.raw`{\"isExclusive\":true} {\"isExclusive\":false}`;
    expect(readMarkedMandate(html, 'SeLoger').exclusivity).toBeNull();
  });

  it('SeLoger : « isPrivateOwner » vrai ne pose jamais « particulier »', () => {
    const html = String.raw`{\"isPrivateOwner\":true,\"publisherType\":\"PRIVATE\"}`;
    expect(readMarkedMandate(html, 'SeLoger')).toEqual(UNKNOWN_MANDATE);
  });

  it('Figaro : « isExclusive » vrai sur le chemin de l’annonce, pas sur une annonce voisine', () => {
    const state = (own: boolean) =>
      `<script type="application/json" id="__NUXT_DATA__">${JSON.stringify([
        ['ShallowReactive', 1],
        { data: 2 },
        { classifiedDetailResponse: 3 },
        { classified: 4, similarClassifieds: 7 },
        own ? { origin: 5, isExclusive: 6 } : { origin: 5 },
        'professionnel',
        true,
        { isExclusive: 6 },
      ])}</script>`;
    expect(readMarkedMandate(state(true), 'Figaro Immobilier')).toEqual({
      soldBy: 'agency',
      soldBySource: 'listing_data',
      exclusivity: 'yes',
      exclusivitySource: 'listing_data',
    });
    expect(readMarkedMandate(state(false), 'Figaro Immobilier').exclusivity).toBeNull();
  });

  it('un portail non mesuré ne marque rien', () => {
    expect(readMarkedMandate('<span class="tag__label">Exclusivité</span>', 'Leboncoin')).toEqual(
      UNKNOWN_MANDATE,
    );
  });

  it('le titre d’une page de résultats (« 1 573 maisons à vendre en exclusivité ») ne dit rien', () => {
    expect(
      readListingMandate({
        marked: UNKNOWN_MANDATE,
        title: 'Achat immobilier Nice : 1 573 maisons à vendre en exclusivité',
        description: null,
      }),
    ).toEqual(UNKNOWN_MANDATE);
  });

  it('« Hôtel particulier » ne dit jamais « particulier »', () => {
    expect(
      readListingMandate({
        marked: UNKNOWN_MANDATE,
        title: 'Hôtel particulier à vendre',
        description: 'Vente de particulier à particulier, hôtel particulier de 1900.',
      }),
    ).toEqual(UNKNOWN_MANDATE);
  });
});

describe('ordre de lecture', () => {
  it('ce que la page marque passe avant le texte', () => {
    const marked = {
      ...UNKNOWN_MANDATE,
      exclusivity: 'no',
      exclusivitySource: 'listing_data',
    } as const;
    expect(
      readListingMandate({ marked, title: 'Exclusivité', description: 'En exclusivité.' }),
    ).toEqual(marked);
  });

  it('le titre passe avant la description', () => {
    expect(
      readListingMandate({
        marked: UNKNOWN_MANDATE,
        title: 'EXCLUSIVITÉ - 3 pièces Nice Nord',
        description: 'En exclusivité dans votre agence.',
      }),
    ).toMatchObject({ exclusivity: 'yes', exclusivitySource: 'title' });
  });

  it('à défaut, la description (« Exclusivité. Nice Ouest… », mesuré sur Maisons et Appartements)', () => {
    expect(
      readListingMandate({
        marked: UNKNOWN_MANDATE,
        title: 'Maison 6 pièces Nice',
        description: 'Exclusivité. Nice Ouest Napoléon III, quartier résidentiel, maison en…',
      }),
    ).toMatchObject({ exclusivity: 'yes', exclusivitySource: 'description' });
  });

  it('vendeur inconnu : le texte ne dit jamais « non », et rien du vendeur', () => {
    expect(
      readListingMandate({
        marked: UNKNOWN_MANDATE,
        title: 'Maison 6 pièces Nice',
        description: 'Mandat simple, sans exclusivité. Notre agence vous propose…',
      }),
    ).toEqual(UNKNOWN_MANDATE);
  });
});

describe('agence sans aucune mention d’exclusivité : mandat simple', () => {
  const agency = { ...UNKNOWN_MANDATE, soldBy: 'agency', soldBySource: 'advertiser' } as const;

  it('ni badge, ni titre, ni description : « non », provenance « aucune mention »', () => {
    expect(
      readListingMandate({
        marked: agency,
        title: 'Maison 6 pièces Nice',
        description: 'Belle maison avec jardin à jouissance exclusive, quartier exclusif.',
      }),
    ).toEqual({ ...agency, exclusivity: 'no', exclusivitySource: 'no_mention' });
  });

  it('une mention dans le titre ou la description l’emporte', () => {
    expect(
      readListingMandate({ marked: agency, title: 'EXCLUSIVITE - Grasse', description: null }),
    ).toMatchObject({ exclusivity: 'yes', exclusivitySource: 'title' });
    expect(
      readListingMandate({ marked: agency, title: 'Maison', description: 'Mandat exclusif.' }),
    ).toMatchObject({ exclusivity: 'yes', exclusivitySource: 'description' });
  });

  it('un badge l’emporte aussi', () => {
    const marked = { ...agency, exclusivity: 'yes', exclusivitySource: 'badge' } as const;
    expect(readListingMandate({ marked, title: 'Maison', description: null })).toEqual(marked);
  });

  it('vendeur inconnu : l’exclusivité reste inconnue', () => {
    expect(
      readListingMandate({ marked: UNKNOWN_MANDATE, title: 'Maison', description: 'Jardin.' }),
    ).toEqual(UNKNOWN_MANDATE);
  });
});

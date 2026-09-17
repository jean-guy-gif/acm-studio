import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { extractListingData } from '@/features/comparable-import/services/extract-listing-data';
import { normalizeListingData } from '@/features/comparable-import/services/normalize-listing-data';
import { selectListingDescription } from '@/features/comparable-import/services/select-listing-description';
import { detectSource } from '@/features/comparable-import/utils/detect-source';

// Mission 49 — la description ET les photos appartiennent à l'annonce, jamais à la
// page. Un helper partagé (pickLongestDescription / lecteurs pleine page) rapportait
// la description et les photos d'un bien voisin ; deux portails n'étaient sains que
// par coïncidence de longueur. On vérifie, contre les QUATRE fixtures réelles :
//   1. la description importée contient une phrase propre à l'annonce principale ;
//   2. elle ne contient aucune phrase propre à une annonce voisine ;
//   3. la source retenue est de niveau 1 ou 2 (provenance), jamais un ratissage
//      pleine page (niveau 3, supprimé) — le test qui tient dans le temps.
//   + les photos sont cadrées à l'annonce (pas la cuisine du voisin), fail-closed.
//
// Les fixtures sont capturées PAR L'EXTENSION, jamais recopiées à la main. La fixture
// SeLoger (annonce 26ZEJMLWB13Y, Villeneuve-Loubet) fait 763 672 caractères ; c'est
// la première SeLoger réelle, d'où « le portail le plus utilisé était le seul non
// mesuré ».
const DIR = join(__dirname, '..', 'extractors', '__fixtures__');

// `photoHost` seul ne prouve rien : chez Bien'ici, les photos des VOISINS sortent du
// MÊME CDN file.bienici.com que les nôtres (hektor-planetimmobilier-24967 @204175,
// apimo-87032581 @206782) — le filtre par hôte ne les sépare pas. Le cadrage Bien'ici
// repose sur la coupe POSITIONNELLE à vue-similar-ads (char 203546) : les photos des
// voisins sont toutes APRÈS. Là où l'URL porte l'identifiant de l'annonce, on l'exige
// (`photoOurs`) ; chez SeLoger (UUID opaques), on exige au moins l'ABSENCE d'une photo
// qui n'existe que dans la section recommandée (`photoNeighbourAbsent`).
const FIXTURES = {
  seloger: {
    file: 'seloger-villeneuve-loubet.html',
    url: 'https://www.seloger.com/annonces/achat/appartement/villeneuve-loubet-06270/26ZEJMLWB13Y',
    ours: 'Bouches du Loup',
    photoHost: 'mms.seloger.com',
    photoNeighbourAbsent: '2a7c0a82', // n'apparaît qu'après la section recommandée (>440237)
  },
  bienici: {
    file: 'bienici-antibes.html',
    url: 'https://www.bienici.com/annonce/vente/antibes/appartement/4pieces/iad-france-1010343',
    ours: 'Descriptif de cet appartement',
    photoHost: 'file.bienici.com',
    photoOurs: 'iad-france-1010343', // identifiant de l'annonce dans l'URL photo
  },
  greenAcres: {
    file: 'green-acres-cagnes.html',
    url: 'https://www.green-acres.fr/fr/properties/appartement/cagnes-sur-mer/A98cqw1yg8fmz1bt.htm',
    ours: 'Lycée Auguste Renoir',
    photoHost: 'green-acres.com',
    photoOurs: 'A98cqw1yg8fmz1bt', // advert-id
  },
  maisons: {
    file: 'maisons-et-appartements-villeneuve.html',
    url: 'https://www.maisonsetappartements.fr/ads/4534734',
    ours: 'jardin',
    photoHost: 'medias.maisonsetappartements.fr',
    photoOurs: '5045398', // id de groupe de la galerie
  },
} as const;

function importFixture(fixture: (typeof FIXTURES)[keyof typeof FIXTURES]) {
  const html = readFileSync(join(DIR, fixture.file), 'utf8');
  const parts = extractListingData(html, fixture.url);
  const source = detectSource(new URL(fixture.url).hostname);
  const { data } = normalizeListingData(parts, fixture.url, source);
  const selected = selectListingDescription({
    portalScoped: parts.portal.listingDescription ?? null,
    regionVisible: parts.visibleDescription ?? null,
    regionEmbedded: parts.embeddedDescription ?? null,
    ogMeta: parts.openGraph.listingDescription ?? null,
  });
  return { data, selected };
}

describe.each(Object.entries(FIXTURES))('Mission 49 — %s', (_name, fixture) => {
  it('la description importée contient une phrase propre à l’annonce principale', () => {
    const { data } = importFixture(fixture);
    expect(data.listingDescription).toContain(fixture.ours);
  });

  it('la source de la description est de niveau 1 ou 2, jamais un ratissage pleine page', () => {
    const { selected } = importFixture(fixture);
    expect(['main-advert', 'page-meta']).toContain(selected.provenance);
  });

  it('les photos sont cadrées à l’annonce (pas l’habillage ni le voisinage)', () => {
    const { data } = importFixture(fixture);
    expect(data.photoUrls.length).toBeGreaterThan(0);
    for (const url of data.photoUrls) {
      expect(url).toContain(fixture.photoHost);
      // Là où l'identifiant de l'annonce est dans l'URL, TOUTES les photos le portent.
      if ('photoOurs' in fixture) {
        expect(url).toContain(fixture.photoOurs);
      }
      // Sinon (SeLoger, UUID), au moins : jamais une photo de la section recommandée.
      if ('photoNeighbourAbsent' in fixture) {
        expect(url).not.toContain(fixture.photoNeighbourAbsent);
      }
    }
  });
});

// Le voisin de Green Acres est le cas MESURÉ : sa description (2 chambres, terrasse
// de 14 m², « local à vélos », immeuble 2022) ne doit jamais atteindre le vendeur.
describe('Mission 49 — Green Acres, aucune phrase du voisin', () => {
  it('n’importe ni « local à vélos » ni « 14 m² » d’un bien voisin', () => {
    const { data } = importFixture(FIXTURES.greenAcres);
    expect(data.listingDescription).not.toContain('vélos');
    expect(data.listingDescription).not.toContain('14 m²');
  });
});

// Maisons et Appartements : cadrage STRUCTUREL par l'id de groupe (les photos des
// voisins sont imbriquées dans les nôtres, aucun découpage positionnel ne les sépare).
describe('Mission 49 — Maisons et Appartements, photos du seul groupe de l’annonce', () => {
  it('ne garde que le groupe 5045398, jamais un groupe voisin', () => {
    const { data } = importFixture(FIXTURES.maisons);
    for (const url of data.photoUrls) {
      expect(url).toContain('5045398');
    }
    expect(data.photoUrls.some((url) => /5045136|5045230|5045239/.test(url))).toBe(false);
  });
});

describe('selectListingDescription — la règle, testable', () => {
  it('préfère la lecture cadrée (niveau 1) à la métadonnée de page (niveau 2)', () => {
    const selected = selectListingDescription({
      portalScoped: null,
      regionVisible: 'Description lue dans le bloc de l’annonce, complète.',
      regionEmbedded: null,
      ogMeta: 'Résumé og tronqué',
    });
    expect(selected.provenance).toBe('main-advert');
    expect(selected.description).toContain('bloc de l’annonce');
  });

  it('retombe sur la métadonnée de page (niveau 2) quand aucune lecture cadrée', () => {
    const selected = selectListingDescription({ ogMeta: 'Résumé og de la page' });
    expect(selected.provenance).toBe('page-meta');
  });

  it('une description vide est un résultat VALIDE, pas un repli sur la page', () => {
    const selected = selectListingDescription({});
    expect(selected.description).toBeNull();
    expect(selected.provenance).toBe('none');
  });
});

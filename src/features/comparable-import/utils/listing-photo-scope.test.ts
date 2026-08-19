import { describe, expect, it } from 'vitest';

import { keepListingPhotos } from '@/features/comparable-import/utils/listing-photo-scope';

// Relevé du 19/08 sur la page Green Acres : 20 photos importées, dont 5 d'une
// autre annonce et 2 badges de magasin d'applications.
const LISTING =
  'https://www.green-acres.fr/fr/properties/appartement/paris-16eme/Avcm5d35ccx50hxp.htm';
const own = (n: number) =>
  `https://lb1.green-acres.com/4041197a/Avcm5d35ccx50hxp/Photos/Avcm5d35ccx50hxp_${n}.jpg`;
const other = (n: number) =>
  `https://lb1.green-acres.com/4079153a/A5402oagic844liz/miniPhotos/A5402oagic844liz_${n}.jpg`;

describe('keepListingPhotos', () => {
  it('écarte les photos des annonces voisines', () => {
    const result = keepListingPhotos([own(1), other(1), own(2), other(2)], LISTING);
    expect(result).toEqual([own(1), own(2)]);
  });

  it('écarte l’habillage du site', () => {
    const chrome = [
      'https://lb1.green-acres.com/img/google_play_badges/fr_google_play_badge.png',
      'https://lb1.green-acres.com/img/apple_badges/fr_apple_badge.png',
      'https://cdn.portail.fr/assets/logo.png',
    ];
    expect(keepListingPhotos([own(1), ...chrome, own(2)], LISTING)).toEqual([own(1), own(2)]);
  });

  // Beaucoup de portails ne mettent pas l'identifiant dans leurs images : mieux
  // vaut une galerie un peu large qu'une fiche sans photo.
  it('n’applique pas le filtre d’identifiant s’il ne laisse presque rien', () => {
    const photos = [
      'https://v.seloger.com/s/crop/800x600/visuels/1/a/salon.jpg',
      'https://v.seloger.com/s/crop/800x600/visuels/1/a/cuisine.jpg',
    ];
    expect(keepListingPhotos(photos, 'https://www.seloger.com/annonces/achat/1.htm')).toEqual(
      photos,
    );
  });

  // Certains sites écrivent leurs photos en relatif : les écarter reviendrait à
  // vider la galerie. Elles sont résolues sur l'adresse de l'annonce.
  it('conserve les adresses relatives et ne renvoie rien sur une liste vide', () => {
    expect(keepListingPhotos([], LISTING)).toEqual([]);
    const relatives = ['/photos/maison-1.jpg', '/photos/maison-2.jpg'];
    expect(keepListingPhotos(relatives, 'https://www.agence-exemple.fr/annonce/1')).toEqual(
      relatives,
    );
    // L'habillage du site reste écarté, même en relatif.
    expect(
      keepListingPhotos(['/assets/logo.png'], 'https://www.agence-exemple.fr/annonce/1'),
    ).toEqual([]);
  });
});

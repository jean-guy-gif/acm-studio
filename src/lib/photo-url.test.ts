import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { displayPhotoUrl, photoKey, servedDemoPhotoFile } from '@/lib/photo-url';

// Mission 120 B (reprise R3) — une photo de la démo enregistrée depuis l'essai s'affiche depuis
// l'hôte qui sert la page ; une photo de portail n'est jamais réécrite.
describe('photo de la démo à l’affichage', () => {
  it('une adresse de la démo, quel que soit l’hôte de l’application, devient un chemin', () => {
    expect(displayPhotoUrl('https://acm-studio-essai.vercel.app/demo/photos/villa-05.jpg')).toBe(
      '/demo/photos/villa-05.jpg',
    );
    expect(displayPhotoUrl('https://acm-studio-henna.vercel.app/demo/photos/villa-05.jpg')).toBe(
      '/demo/photos/villa-05.jpg',
    );
    expect(displayPhotoUrl('http://localhost:3000/demo/photos/appartement-01.jpg')).toBe(
      '/demo/photos/appartement-01.jpg',
    );
    expect(displayPhotoUrl('/demo/photos/villa-05.jpg')).toBe('/demo/photos/villa-05.jpg');
  });

  it('une photo de portail, un autre chemin, une forme douteuse : inchangées', () => {
    const portal = 'https://v.seloger.com/s/width/800/visuels/demo/photos/villa-05.jpg';
    expect(displayPhotoUrl(portal)).toBe(portal);
    const other = 'https://cdn.example.com/demo/photos/villa-05.jpg';
    expect(displayPhotoUrl(other)).toBe(other);
    const query = 'https://acm-studio-essai.vercel.app/demo/photos/villa-05.jpg?x=1';
    expect(displayPhotoUrl(query)).toBe(query);
    expect(displayPhotoUrl('https://acm-studio-essai.vercel.app/demo/photos/../x.jpg')).toBe(
      'https://acm-studio-essai.vercel.app/demo/photos/../x.jpg',
    );
    expect(displayPhotoUrl(null)).toBeNull();
  });

  it('le nom de fichier se lit aussi sur l’hôte propre de l’application', () => {
    expect(servedDemoPhotoFile('https://acm.example.fr/demo/photos/villa-05.jpg')).toBeNull();
    expect(
      servedDemoPhotoFile('https://acm.example.fr/demo/photos/villa-05.jpg', 'acm.example.fr'),
    ).toBe('villa-05.jpg');
    expect(servedDemoPhotoFile('/demo/photos/../../.env')).toBeNull();
  });
});

describe('photoKey — l’identité d’une photo d’un rendu à l’autre (Lancement 11)', () => {
  const signed = (token: string) =>
    `https://xyz.supabase.co/storage/v1/object/sign/property-photos/agence/bien/01.jpg?token=${token}`;

  it('une photo du stockage garde sa clé quand son lien signé est refait', () => {
    expect(photoKey(signed('aaa'))).toBe(photoKey(signed('bbb')));
    expect(photoKey(signed('aaa'))).not.toContain('token');
  });

  it('deux photos du stockage n’ont pas la même clé', () => {
    expect(photoKey(signed('aaa'))).not.toBe(photoKey(signed('aaa').replace('01.jpg', '02.jpg')));
  });

  it('une photo de portail garde son adresse entière : ses paramètres distinguent deux photos', () => {
    const one = 'https://cdn.portail.example/image?id=1&w=800';
    expect(photoKey(one)).toBe(one);
    expect(photoKey(one)).not.toBe(photoKey('https://cdn.portail.example/image?id=2&w=800'));
    expect(photoKey('/demo/photos/maison-01.jpg')).toBe('/demo/photos/maison-01.jpg');
  });

  it('la présentation à l’acquéreur prend cette clé, jamais l’adresse entière', () => {
    const source = readFileSync('src/features/buyer-deck/components/deck-presentation.tsx', 'utf8');
    expect(source).toContain('key={photoKey(photo)}');
    expect(source).not.toContain('key={photo}');
  });
});

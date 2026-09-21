import { describe, expect, it } from 'vitest';

import {
  cleanDescription,
  isJunkDescription,
} from '@/features/comparable-import/utils/is-junk-description';
import { selectListingDescription } from '@/features/comparable-import/services/select-listing-description';

describe('isJunkDescription — §2.3', () => {
  it('reconnaît le mur d’inscription mesuré au rendez-vous', () => {
    expect(
      isJunkDescription('Connectez-vous pour accéder aux infos de cette annonce… Créer un compte'),
    ).toBe(true);
    expect(isJunkDescription('Inscrivez-vous pour voir les coordonnées')).toBe(true);
    expect(isJunkDescription('Identifiez-vous ou créez un compte')).toBe(true);
  });

  it('laisse passer une vraie description', () => {
    expect(
      isJunkDescription(
        'Bel appartement traversant de 3 pièces, séjour lumineux, balcon plein sud, cave.',
      ),
    ).toBe(false);
    // « accéder à l'étage » ne doit pas être confondu avec « accéder aux infos ».
    expect(isJunkDescription('Escalier pour accéder à l’étage, terrasse au dernier niveau.')).toBe(
      false,
    );
  });

  it('cleanDescription renvoie null sur un mur, le texte sinon', () => {
    expect(cleanDescription('Connectez-vous pour accéder aux annonces')).toBeNull();
    expect(cleanDescription('Maison de plain-pied avec jardin clos.')).toBe(
      'Maison de plain-pied avec jardin clos.',
    );
  });
});

describe('selectListingDescription — un mur n’est jamais retenu (§2.3)', () => {
  it('écarte le mur à chaque niveau et retombe sur une source propre ou rien', () => {
    // Le niveau 1 (cadré) est un mur → écarté ; on retombe sur og propre.
    expect(
      selectListingDescription({
        portalScoped: 'Connectez-vous pour accéder aux infos de cette annonce. Créer un compte.',
        ogMeta: 'Appartement 3 pièces 69 m² à Villeneuve-Loubet, proche mer.',
      }),
    ).toEqual({
      description: 'Appartement 3 pièces 69 m² à Villeneuve-Loubet, proche mer.',
      provenance: 'page-meta',
    });

    // Tous les niveaux sont des murs → description vide, jamais le mur.
    expect(
      selectListingDescription({
        portalScoped: 'Créez un compte pour voir la description',
        ogMeta: 'Connectez-vous pour accéder aux informations',
      }),
    ).toEqual({ description: null, provenance: 'none' });
  });
});

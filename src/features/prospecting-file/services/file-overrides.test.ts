import { describe, expect, it } from 'vitest';

import { prospectingFileInputSchema } from '@/features/prospecting-file/schemas/prospecting-file-input';
import { defaultTexts } from '@/features/prospecting-file/services/build-prospecting-file';
import {
  chosenPhotoPath,
  fileOverrides,
  ownerForbiddenWord,
} from '@/features/prospecting-file/services/file-overrides';
import { makeFacts } from '@/features/prospecting-file/services/test-facts';
import { NO_OVERRIDES } from '@/features/prospecting-file/types';

const texts = defaultTexts(makeFacts(), 'owner');
const proposed = {
  texts,
  showPrices: true,
  photoPath: 'a/p/property/1.jpg',
  photoPaths: ['a/p/property/1.jpg', 'a/p/property/2.jpg'],
};
const input = (patch: Record<string, unknown> = {}) =>
  prospectingFileInputSchema.parse({
    version: 'owner',
    ...texts,
    showPrices: true,
    photoPath: 'a/p/property/1.jpg',
    ...patch,
  });

describe('ce qui est gardé d’un enregistrement', () => {
  it('rien quand le conseiller n’a rien changé', () => {
    expect(fileOverrides(input(), proposed)).toEqual(NO_OVERRIDES);
  });

  it('seulement le texte réécrit, l’interrupteur basculé et la photo choisie', () => {
    const overrides = fileOverrides(
      input({ title: '  Mon titre  ', showPrices: false, photoPath: 'a/p/property/2.jpg' }),
      proposed,
    );
    expect(overrides).toEqual({
      ...NO_OVERRIDES,
      title: 'Mon titre',
      showPrices: false,
      photoPath: 'a/p/property/2.jpg',
    });
  });

  it('un champ vidé reprend le texte proposé', () => {
    expect(fileOverrides(input({ letter: '   ' }), proposed).letter).toBeNull();
  });

  it('une photo qui n’est pas celle du bien vendeur est ignorée', () => {
    const overrides = fileOverrides(
      input({ photoPath: 'autre-agence/x/property/9.jpg' }),
      proposed,
    );
    expect(overrides.photoPath).toBeNull();
    expect(
      chosenPhotoPath({ ...NO_OVERRIDES, photoPath: 'retiree.jpg' }, proposed.photoPaths),
    ).toBe('a/p/property/1.jpg');
    expect(chosenPhotoPath(NO_OVERRIDES, [])).toBeNull();
  });

  it('un texte trop long est refusé', () => {
    expect(
      prospectingFileInputSchema.safeParse({ ...input(), title: 'x'.repeat(301) }).success,
    ).toBe(false);
  });
});

describe('version propriétaire : jamais « mandat », même réécrit', () => {
  it('refusé côté propriétaire, admis côté confrère', () => {
    const rewritten = input({ keyMessage: 'Je vous propose un Mandat.' });
    expect(ownerForbiddenWord('owner', rewritten)).toBe(true);
    expect(ownerForbiddenWord('colleague', rewritten)).toBe(false);
    expect(ownerForbiddenWord('owner', input())).toBe(false);
  });
});

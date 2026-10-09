import { describe, expect, it } from 'vitest';

import { pendingCommercializationPrice } from '@/features/meeting-conclusion/services/pending-commercialization-price';

describe('pendingCommercializationPrice', () => {
  it('un champ vide ne laisse rien à enregistrer', () => {
    expect(pendingCommercializationPrice('', null)).toBeNull();
    expect(pendingCommercializationPrice('   ', '480000')).toBeNull();
  });

  it('un prix saisi et jamais enregistré est à enregistrer', () => {
    expect(pendingCommercializationPrice('480000', null)).toBe('480000');
  });

  it('un prix déjà enregistré tel quel ne se réenregistre pas', () => {
    expect(pendingCommercializationPrice('480000', '480000')).toBeNull();
    expect(pendingCommercializationPrice(' 480000 ', '480000')).toBeNull();
  });

  it('un prix modifié après l’enregistrement est à enregistrer', () => {
    expect(pendingCommercializationPrice('475000', '480000')).toBe('475000');
  });

  it('une saisie invalide est transmise telle quelle : le serveur décide', () => {
    expect(pendingCommercializationPrice('-5', null)).toBe('-5');
  });
});

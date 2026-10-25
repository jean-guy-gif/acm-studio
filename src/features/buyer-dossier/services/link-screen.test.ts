import { describe, expect, it } from 'vitest';

import { linkScreen } from '@/features/buyer-dossier/services/link-screen';

const state = (over: Partial<Parameters<typeof linkScreen>[0]> = {}) =>
  linkScreen({ presented: false, answered: false, sent: false, closed: null, ...over });

describe('ce que montre le lien', () => {
  it('pas encore répondu : le déroulé', () => {
    expect(state()).toBe('deck');
  });

  it('répondu, ou un second envoi refusé : le merci, jamais le formulaire', () => {
    expect(state({ answered: true })).toBe('thanks');
    expect(state({ sent: true })).toBe('thanks');
    expect(state({ closed: 'answered' })).toBe('thanks');
  });

  it('la présentation terminée, ou un envoi refusé pour cela : « Ce que nous avons vu ensemble »', () => {
    expect(state({ presented: true })).toBe('seen-together');
    expect(state({ presented: true, answered: true })).toBe('seen-together');
    expect(state({ closed: 'presented' })).toBe('seen-together');
  });
});

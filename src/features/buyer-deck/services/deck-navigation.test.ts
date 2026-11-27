import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { FRENCH_TEXTS } from '@/lib/client-texts/fr';

import {
  ANSWER,
  GRID,
  WORDS,
  answerOf,
  finishConfirmation,
  sendConfirmation,
  nextScreen,
  previousScreen,
  screenPosition,
  unansweredLetters,
} from '@/features/buyer-deck/services/deck-navigation';
import type { ItemResponse } from '@/features/buyer-deck/types';

const response = (itemId: string, answer: ItemResponse['answer']): ItemResponse => ({
  id: `r-${itemId}`,
  itemId,
  answer,
  reasons: [],
  answeredDuring: 'presentation',
  answeredAt: '2026-10-25T10:00:00Z',
});
const items = [
  { letter: 'A', itemId: 'a' },
  { letter: 'B', itemId: 'b' },
  { letter: 'C', itemId: 'c' },
];

// Mission 122 (essai de Jean-Guy, 25/10) — montrer le bien C en premier puis A et B, sans que la
// présentation se termine : la navigation est libre, et « Suivant » ne mène jamais à « Sa réponse ».
describe('la navigation de la présentation', () => {
  it('ses mots → la grille → A → B → C, puis rien : « Suivant » ne mène jamais à « Sa réponse »', () => {
    expect(nextScreen(WORDS, 3)).toEqual(GRID);
    expect(nextScreen(GRID, 3)).toEqual({ type: 'item', index: 0 });
    expect(nextScreen({ type: 'item', index: 1 }, 3)).toEqual({ type: 'item', index: 2 });
    expect(nextScreen({ type: 'item', index: 2 }, 3)).toBeNull();
    expect(nextScreen(ANSWER, 3)).toBeNull();
    expect(nextScreen(GRID, 0)).toBeNull();
  });

  it('du premier bien on revient à la grille ; de « Sa réponse » aussi ; de C on revient à B', () => {
    expect(previousScreen({ type: 'item', index: 0 })).toEqual(GRID);
    expect(previousScreen({ type: 'item', index: 2 })).toEqual({ type: 'item', index: 1 });
    expect(previousScreen(ANSWER)).toEqual(GRID);
    expect(previousScreen(GRID)).toEqual(WORDS);
    expect(previousScreen(WORDS)).toBeNull();
  });

  it('la barre d’avancement : ses mots, la grille, les biens, sa réponse en dernier', () => {
    expect(
      [WORDS, GRID, { type: 'item' as const, index: 2 }, ANSWER].map((s) => screenPosition(s, 3)),
    ).toEqual([0, 1, 4, 5]);
  });

  it('la grille montre la réponse déjà donnée à chaque bien', () => {
    const responses = [response('c', 'visit'), response('a', 'no')];
    expect(items.map((item) => answerOf(item.itemId, responses))).toEqual(['no', null, 'visit']);
  });

  it('sur le lien, « Envoyer ma réponse » avec des biens sans réponse demande confirmation', () => {
    expect(sendConfirmation(unansweredLetters(items, [response('c', 'visit')]))).toBe(
      '2 biens sans réponse\u00a0: A et B. Envoyer quand même\u202f?',
    );
    expect(sendConfirmation(['B'])).toBe('1 bien sans réponse\u00a0: B. Envoyer quand même\u202f?');
    expect(sendConfirmation([])).toBeNull();
  });

  it('« Terminer » avec des biens sans réponse demande confirmation, en les nommant', () => {
    expect(finishConfirmation(unansweredLetters(items, [response('c', 'visit')]))).toBe(
      '2 biens sans réponse\u00a0: A et B. Terminer quand même\u202f?',
    );
    expect(
      finishConfirmation(unansweredLetters(items, [response('c', 'visit'), response('a', 'no')])),
    ).toBe('1 bien sans réponse\u00a0: B. Terminer quand même\u202f?');
    expect(
      finishConfirmation(
        unansweredLetters(items, [
          response('a', 'no'),
          response('b', 'maybe'),
          response('c', 'visit'),
        ]),
      ),
    ).toBeNull();
  });

  it('dans la scène : « Terminer » est secondaire, « Sa réponse » a son propre bouton, répondre n’avance pas', () => {
    const scene = readFileSync(
      join(process.cwd(), 'src', 'features', 'buyer-deck', 'components', 'deck-presentation.tsx'),
      'utf8',
    );
    // Le bouton principal de la barre est « Suivant », jamais « Terminer ».
    const finishButton = scene.slice(
      scene.indexOf('data-testid="presentation-finish"') - 300,
      scene.indexOf('data-testid="presentation-finish"'),
    );
    expect(finishButton).toContain('className={navBtn}');
    expect(finishButton).not.toContain('primaryBtn');
    // Mission 140 — les mots dans les textes du client ; la scène lit leurs clés.
    expect(FRENCH_TEXTS.buyer.screens.toAvailability).toBe('Passer à ses disponibilités');
    expect(FRENCH_TEXTS.buyer.screens.backToGrid).toBe('Revenir à la grille');
    expect(scene).toContain('t.toAvailability');
    expect(scene).toContain('t.backToGrid');
    // Une réponse n'appelle jamais la navigation.
    const send = scene.slice(scene.indexOf('const send = '), scene.indexOf('const toggleReason'));
    expect(send).not.toMatch(/\bgo\(|setScreen/);
  });
});

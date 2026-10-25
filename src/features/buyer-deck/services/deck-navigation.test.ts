import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  ANSWER,
  GRID,
  WORDS,
  answerOf,
  finishConfirmation,
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

  it('« Terminer » avec des biens sans réponse demande confirmation, en les nommant', () => {
    expect(finishConfirmation(unansweredLetters(items, [response('c', 'visit')]))).toBe(
      '2 biens sans réponse : A et B. Terminer quand même ?',
    );
    expect(
      finishConfirmation(unansweredLetters(items, [response('c', 'visit'), response('a', 'no')])),
    ).toBe('1 bien sans réponse : B. Terminer quand même ?');
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
    expect(scene).toContain('Passer à ses disponibilités');
    expect(scene).toContain('Revenir à la grille');
    // Une réponse n'appelle jamais la navigation.
    const send = scene.slice(scene.indexOf('const send = '), scene.indexOf('const toggleReason'));
    expect(send).not.toMatch(/\bgo\(|setScreen/);
  });
});

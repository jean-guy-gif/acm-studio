import { describe, expect, it } from 'vitest';

import {
  saveBarStatus,
  type SaveBarState,
} from '@/features/subject-property/services/save-bar-status';

const state = (over: Partial<SaveBarState> = {}): SaveBarState => ({
  pending: false,
  dirty: false,
  saved: false,
  errorCount: 0,
  missing: [],
  error: null,
  ...over,
});

describe('saveBarStatus', () => {
  it('fiche neuve, rien de saisi : la barre ne dit rien', () => {
    expect(saveBarStatus(state()).text).toBe('');
  });

  it('dit « Modifications non enregistrées » puis « Enregistré »', () => {
    expect(saveBarStatus(state({ dirty: true, saved: true }))).toEqual({
      tone: 'neutral',
      text: 'Modifications non enregistrées',
      target: null,
    });
    expect(saveBarStatus(state({ saved: true }))).toEqual({
      tone: 'ok',
      text: 'Enregistré',
      target: null,
    });
  });

  it('compte les champs à corriger et mène au premier', () => {
    expect(saveBarStatus(state({ dirty: true, errorCount: 2 }))).toEqual({
      tone: 'error',
      text: '2 champs à corriger',
      target: 'first_error',
    });
    expect(saveBarStatus(state({ dirty: true, errorCount: 1 })).text).toBe('1 champ à corriger');
  });

  it('dit ce qui manque pour la recherche et mène au premier champ manquant', () => {
    expect(saveBarStatus(state({ saved: true, missing: ['property_type'] }))).toEqual({
      tone: 'error',
      text: 'Il manque : type de bien',
      target: 'property_type',
    });
    expect(saveBarStatus(state({ saved: true, missing: ['property_type', 'city'] })).text).toBe(
      'Il manque : type de bien, ville',
    );
  });

  it('une erreur d’enregistrement se lit dans la barre', () => {
    expect(
      saveBarStatus(state({ dirty: true, error: 'L’enregistrement du bien a échoué.' })),
    ).toEqual({ tone: 'error', text: 'L’enregistrement du bien a échoué.', target: null });
  });

  it('pendant l’enregistrement, rien d’autre', () => {
    expect(saveBarStatus(state({ pending: true, dirty: true, errorCount: 3 })).text).toBe(
      'Enregistrement…',
    );
  });
});

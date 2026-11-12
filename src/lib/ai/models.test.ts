import { describe, expect, it } from 'vitest';

import {
  AI_DEFAULT_MODEL,
  costMillicents,
  effortFor,
  isGeneration4,
  modelPrice,
  temperatureFor,
  worstCaseMillicents,
} from '@/lib/ai/models';

describe('les modèles de lecture (Mission 151)', () => {
  it('par défaut, Sonnet 4.6 par son profil « EU » (décision du 12/11)', () => {
    expect(AI_DEFAULT_MODEL).toBe('eu.anthropic.claude-sonnet-4-6');
    expect(isGeneration4(AI_DEFAULT_MODEL)).toBe(true);
    expect(isGeneration4('eu.anthropic.claude-sonnet-5-5')).toBe(false);
  });

  it('compte le coût en millièmes de centime, profil +10 %, 1 $ = 1 €', () => {
    // 10 000 jetons d'entrée à 3 $ et 1 000 de sortie à 15 $ : 0,045 $ × 1,1 = 0,0495 € = 4 950.
    expect(costMillicents(AI_DEFAULT_MODEL, { input_tokens: 10_000, output_tokens: 1_000 })).toBe(
      4950,
    );
    expect(
      costMillicents('eu.anthropic.claude-haiku-5-5', { input_tokens: 1e6, output_tokens: 0 }),
    ).toBe(11_000);
  });

  it('un modèle sans tarif ne se lit pas (pas de plafond inconnu)', () => {
    expect(modelPrice('eu.anthropic.claude-inconnu-9')).toBeNull();
    expect(
      costMillicents('eu.anthropic.claude-inconnu-9', { input_tokens: 1, output_tokens: 1 }),
    ).toBeNull();
  });

  it('réserve au pire : l’entrée large et toute la sortie permise', () => {
    const worst = worstCaseMillicents(AI_DEFAULT_MODEL, {
      estimatedInputTokens: 4000,
      maxOutputTokens: 4000,
    });
    const real = costMillicents(AI_DEFAULT_MODEL, { input_tokens: 4000, output_tokens: 1500 });
    expect(worst).toBeGreaterThan(real ?? 0);
    // Une lecture de notes au pire : moins de 10 centimes (≈ 8,6).
    expect(worst).toBeLessThan(10_000);
  });

  it('température au plus bas sur Claude 4 ; rien sur les 5.5, qui la refusent', () => {
    expect(temperatureFor(AI_DEFAULT_MODEL)).toBe(0);
    expect(temperatureFor('eu.anthropic.claude-sonnet-5-5')).toBeUndefined();
    expect(effortFor('eu.anthropic.claude-haiku-4-5-20251001-v1:0')).toBeUndefined();
    expect(effortFor(AI_DEFAULT_MODEL)).toBe('medium');
  });
});

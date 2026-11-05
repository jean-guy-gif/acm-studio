import { describe, expect, it } from 'vitest';

import {
  advancementSteps,
  FOURCHETTE_LABEL,
  fourchetteLabel,
  pendingImportLabel,
  propertyLabel,
} from '@/features/projects/services/preparation-card';

describe('preparation-card — aucune valeur inventée (§1 / §5)', () => {
  it('propertyLabel compose le bien saisi, et OMET les champs absents (pas de « — »)', () => {
    expect(
      propertyLabel({
        propertyType: 'Appartement',
        roomsCount: 4,
        surfaceArea: 97,
        city: 'Cagnes-sur-Mer',
      }),
    ).toBe('Appartement · 4 pièces · 97\u00A0m² · Cagnes-sur-Mer');

    // Champs absents : simplement omis, jamais rendus en « — ».
    expect(
      propertyLabel({ propertyType: 'Maison', roomsCount: null, surfaceArea: null, city: 'Nice' }),
    ).toBe('Maison · Nice');
    // Le type est le TEXTE LIBRE saisi côté bien vendeur, rendu tel quel.
    expect(
      propertyLabel({
        propertyType: 'Loft atypique',
        roomsCount: 1,
        surfaceArea: null,
        city: null,
      }),
    ).toBe('Loft atypique · 1 pièce');
    // Rien de saisi → rien à dire (la carte le dira autrement).
    expect(
      propertyLabel({ propertyType: null, roomsCount: null, surfaceArea: null, city: null }),
    ).toBeNull();
    expect(propertyLabel(null)).toBeNull();
  });

  it('fourchetteLabel rend les bornes, ou null si non saisie', () => {
    // toLocaleString('fr-FR') sépare les milliers par une espace fine insécable (U+202F) :
    // on normalise les espaces pour asserter sur le fond, pas sur le codet du séparateur.
    const normalize = (s: string | null) => s?.replace(/\s/g, ' ') ?? null;
    expect(normalize(fourchetteLabel({ low: 320000, high: 390000 }))).toBe('320 000 – 390 000 €');
    expect(fourchetteLabel(null)).toBeNull();
  });

  it('advancementSteps nomme ce qui est fait et ce qui manque', () => {
    const steps = advancementSteps({
      hasProperty: true,
      exploitableCount: 2,
      hasPositioning: false,
      pendingImportCount: 0,
      ready: false,
    });
    expect(steps).toEqual([
      { label: 'Bien vendeur', done: true },
      { label: '2/3 concurrents', done: false },
      { label: 'Décision de prix', done: false },
    ]);

    const ready = advancementSteps({
      hasProperty: true,
      exploitableCount: 6,
      hasPositioning: true,
      pendingImportCount: 0,
      ready: true,
    });
    expect(ready.every((s) => s.done)).toBe(true);
  });
});

// Mission 108 — un dossier « Prêt » est vraiment prêt, et sa carte ne dit qu'une « Décision de prix ».
describe('Mission 108 — la carte d’un dossier', () => {
  it('un concurrent retenu en attente d’import retient le dossier, et se dit', async () => {
    const { isProjectReady } = await import('@/features/projects/services/project-readiness');
    const base = { hasProperty: true, exploitableCount: 5, hasPositioning: true };
    expect(isProjectReady(base)).toBe(true);
    expect(isProjectReady({ ...base, pendingImportCount: 1 })).toBe(false);
    expect(pendingImportLabel(2)).toBe('2 en attente d’import');
    expect(pendingImportLabel(0)).toBeNull();
  });

  it('la ligne de la fourchette dit « Votre fourchette », plus « Décision de prix »', async () => {
    const { readFileSync } = await import('node:fs');
    const page = readFileSync('src/app/(protected)/builder/(liste)/page.tsx', 'utf8');
    expect(page).not.toContain('Décision de prix :');
    expect(page).toContain('{FOURCHETTE_LABEL} :');
    expect(FOURCHETTE_LABEL).toBe('Votre fourchette');
  });
});

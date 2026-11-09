import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { boardGridClass, prospectingCardStep } from '@/features/prospecting/services/card-step';

// Mission 146 (partie B, C9) — une carte de Prospection : une étape, au plus un lien, « … ».
const card = (input: Partial<Parameters<typeof prospectingCardStep>[0]>) =>
  prospectingCardStep({
    status: 'ready',
    step: 'owner',
    opposed: false,
    addressConfirmed: true,
    refusedCollaboration: false,
    ...input,
  });

describe('prospectingCardStep', () => {
  it('à confirmer : « Confirmer l’adresse », pas de lien', () => {
    const step = card({ status: 'to_confirm', addressConfirmed: false });
    expect(step.main).toEqual({ kind: 'confirm_address' });
    expect(step.link).toBeNull();
    expect(step.menu).toEqual({ address: null, decline: true, undo: false, oppose: true });
  });

  it('prêt : « Préparer le dossier », lien « Marquer remis » ; « Corriger l’adresse » dans « … »', () => {
    const step = card({});
    expect(step.main).toEqual({ kind: 'prepare' });
    expect(step.link).toEqual({ move: 'handed', label: 'Marquer remis' });
    expect(step.menu.address).toBe('correct');
  });

  it('un confrère : le dossier n’attend pas l’adresse, « Marquer contacté »', () => {
    for (const status of ['to_confirm', 'ready'] as const) {
      const step = card({ status, step: 'colleague', addressConfirmed: false });
      expect(step.main).toEqual({ kind: 'prepare' });
      expect(step.link?.label).toBe('Marquer contacté');
      expect(step.menu.address).toBe('confirm');
    }
  });

  it('remis : « RDV obtenu » ; chez un confrère, « Collaboration obtenue » et le lien « Refusée »', () => {
    expect(card({ status: 'handed' }).main).toEqual({
      kind: 'move',
      move: { move: 'meeting', label: 'RDV obtenu' },
    });
    const colleague = card({ status: 'handed', step: 'colleague' });
    expect(colleague.main).toEqual({
      kind: 'move',
      move: { move: 'collaboration', label: 'Collaboration obtenue' },
    });
    expect(colleague.link).toEqual({ move: 'collaboration_declined', label: 'Refusée' });
    expect(colleague.menu).toMatchObject({ decline: true, undo: true });
  });

  it('rendez-vous : « Mandat rentré »', () => {
    expect(card({ status: 'meeting' }).main).toEqual({
      kind: 'move',
      move: { move: 'mandate', label: 'Mandat rentré' },
    });
  });

  it('« à vérifier » : ses pastilles sont l’étape', () => {
    expect(card({ step: 'check', status: 'to_confirm' }).main).toEqual({ kind: 'check' });
    expect(card({ step: 'check' }).link).toBeNull();
  });

  it('clos : rien que « Annuler » et « Ne plus solliciter… »', () => {
    for (const status of ['mandate', 'collaboration', 'declined'] as const) {
      const step = card({ status });
      expect(step.main).toBeNull();
      expect(step.menu).toMatchObject({ decline: false, undo: true, oppose: true });
    }
    expect(card({ status: 'collaboration' }).menu.address).toBeNull();
  });

  it('un refus de collaboration s’annule tant que la carte n’a pas avancé', () => {
    expect(card({ refusedCollaboration: true }).menu.undo).toBe(true);
    expect(card({}).menu.undo).toBe(false);
  });

  it('« Ne plus solliciter » : plus aucun geste', () => {
    const step = card({ opposed: true, status: 'handed' });
    expect(step.main).toBeNull();
    expect(step.menu).toEqual({ address: null, decline: false, undo: false, oppose: false });
  });

  it('les colonnes affichées prennent la place des vides', () => {
    expect(boardGridClass(1)).toBe('grid-cols-1');
    expect(boardGridClass(2)).toContain('@2xl:grid-cols-2');
    expect(boardGridClass(2)).not.toContain('@5xl');
    expect(boardGridClass(4)).toContain('@5xl:grid-cols-4');
  });
});

// Mission 145 — jamais de `tel:` dans la prospection.
describe('la carte de Prospection', () => {
  it('n’a ni bouton plein ni lien d’appel', () => {
    for (const file of [
      'src/features/prospecting/components/prospecting-card.tsx',
      'src/features/prospecting/components/prospecting-card-actions.tsx',
      'src/features/prospecting/components/prospecting-board.tsx',
    ]) {
      const code = readFileSync(join(process.cwd(), file), 'utf8');
      expect(code, file).not.toMatch(/btnPrimary/);
      expect(code, file).not.toMatch(/tel:/);
    }
  });
});

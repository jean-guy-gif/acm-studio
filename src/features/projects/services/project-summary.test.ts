import { describe, expect, it } from 'vitest';

import { projectBadge, projectTiles } from '@/features/projects/services/project-summary';

// La refonte, lot E (maquette REFONTE-8) — l'état du dossier et ses trois chiffres.

describe('l’état du dossier, en une pastille', () => {
  it('où il en est dans le parcours', () => {
    expect(projectBadge({ status: 'draft', outcome: null, mandateType: null })).toEqual({
      label: 'En préparation',
      tone: 'plain',
    });
    expect(projectBadge({ status: 'ready_for_meeting', outcome: null, mandateType: null })).toEqual(
      { label: 'Prêt pour le rendez-vous', tone: 'plain' },
    );
  });

  it('conclu : son issue, et le type d’un mandat signé', () => {
    expect(
      projectBadge({ status: 'meeting_completed', outcome: 'signed', mandateType: 'exclusive' }),
    ).toEqual({ label: 'Mandat signé · exclusif', tone: 'good' });
    expect(
      projectBadge({ status: 'meeting_completed', outcome: 'signed', mandateType: null }).label,
    ).toBe('Mandat signé');
    expect(
      projectBadge({ status: 'meeting_completed', outcome: 'follow_up', mandateType: null }).label,
    ).toBe('À relancer');
    expect(
      projectBadge({ status: 'meeting_completed', outcome: null, mandateType: null }).label,
    ).toBe('Rendez-vous conclu');
  });
});

describe('les trois chiffres', () => {
  it('les concurrents retenus, ce qui reste à vérifier, les acquéreurs prêts', () => {
    const tiles = projectTiles({ retained: 6, toVerify: 2, readyBuyers: 5 });
    expect(tiles.map((tile) => [tile.value, tile.label, tile.tone ?? 'plain'])).toEqual([
      [6, 'Concurrents retenus', 'plain'],
      [2, 'Prix ou surface à vérifier', 'watch'],
      [5, 'Acquéreurs prêts à visiter', 'good'],
    ]);
  });

  it('s’accordent ; rien à vérifier n’est pas orange', () => {
    const tiles = projectTiles({ retained: 1, toVerify: 0, readyBuyers: 1 });
    expect(tiles.map((tile) => tile.label)).toEqual([
      'Concurrent retenu',
      'Prix ou surface à vérifier',
      'Acquéreur prêt à visiter',
    ]);
    expect(tiles[1]!.tone).toBe('plain');
    expect(projectTiles({ retained: 0, toVerify: 0, readyBuyers: 0 })[2]!.tone).toBe('plain');
  });

  // M98 — une lecture en échec n'est jamais un zéro.
  it('des acquéreurs illisibles le disent ; un dossier d’exemple n’en a pas', () => {
    const unread = projectTiles({ retained: 3, toVerify: 0, readyBuyers: null });
    expect(unread[2]).toMatchObject({ value: '?', label: 'Acquéreurs prêts : non lus' });
    expect(projectTiles({ retained: 3, toVerify: 0, readyBuyers: undefined })).toHaveLength(2);
  });

  it('jamais un montant, jamais un pourcentage', () => {
    const text = JSON.stringify(projectTiles({ retained: 6, toVerify: 2, readyBuyers: 5 }));
    expect(text).not.toMatch(/€|%/);
  });
});

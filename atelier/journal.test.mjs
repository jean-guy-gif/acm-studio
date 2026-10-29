import { describe, expect, it } from 'vitest';

import { ligneJournal, missionDeBranche, missionDePrompt } from './journal.mjs';

// Mission 126 — une ligne du journal : heure, dossier, branche, mission, agent, état, phrase.
describe('le journal', () => {
  it('lit la mission dans la branche ou dans la commande tapée', () => {
    expect(missionDeBranche('mission-120B-confrere')).toBe('120B');
    expect(missionDeBranche('mission-126-atelier')).toBe('126');
    expect(missionDeBranche('main')).toBeNull();
    expect(missionDeBranche('essai')).toBeNull();
    expect(missionDePrompt('/mission 120b --parallele')).toEqual({
      commande: 'mission',
      mission: '120B',
    });
    expect(missionDePrompt('  /valide 126')).toEqual({ commande: 'valide', mission: '126' });
    expect(missionDePrompt('reprend')).toBeNull();
    expect(missionDePrompt('/mission')).toBeNull();
  });

  it('une ligne ne garde que des valeurs de liste, masque la phrase, borne les durées', () => {
    const ligne = ligneJournal({
      dossier: '/x',
      branche: 'mission-126-atelier',
      mission: '126',
      agent: 'testeur',
      etat: 'blocked',
      phrase: 'E2E joué avec E2E_VERCEL_BYPASS=Ab3dEfGh1jKlMnOpQrStUvWxYz012345',
      etape: 'inconnue',
      evenement: 'e2e',
      donnees: {
        durees: [
          { suite: 'demo', secondes: 426 },
          { suite: 'x<script>', secondes: 'n' },
        ],
      },
      heure: '2026-10-30T09:00:00.000Z',
    });
    expect(ligne).toEqual({
      heure: '2026-10-30T09:00:00.000Z',
      dossier: '/x',
      branche: 'mission-126-atelier',
      mission: '126',
      agent: 'testeur',
      etat: 'en cours',
      phrase: 'E2E joué avec E2E_VERCEL_BYPASS=[masqué]',
      etape: null,
      evenement: 'e2e',
      donnees: { durees: [{ suite: 'demo', secondes: 426 }] },
    });
    expect(ligneJournal({ agent: '', phrase: null }).agent).toBe('chef');
  });
});

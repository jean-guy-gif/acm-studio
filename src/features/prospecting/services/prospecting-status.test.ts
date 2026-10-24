import { describe, expect, it } from 'vitest';

import {
  applyProspectingMove,
  canMarkHanded,
  followUpDate,
  isProspectingMove,
  prospectingCounters,
  prospectingProgress,
  prospectingStatus,
  shortDate,
  type ProspectingDates,
  type ProspectingStatus,
} from '@/features/prospecting/services/prospecting-status';

const NONE: ProspectingDates = {
  prospecting_handed_at: null,
  prospecting_meeting_at: null,
  prospecting_mandate_at: null,
  prospecting_declined_at: null,
  prospecting_collaboration_at: null,
  prospecting_collaboration_declined_at: null,
};
const NOW = '2026-10-10T08:00:00.000Z';

describe('prospectingStatus', () => {
  it('se déduit de l’adresse tant que rien n’est daté', () => {
    expect(prospectingStatus(NONE, false)).toBe('to_confirm');
    expect(prospectingStatus(NONE, true)).toBe('ready');
  });

  it('suit le fait le plus avancé, quelle que soit l’adresse', () => {
    const handed = { ...NONE, prospecting_handed_at: NOW };
    expect(prospectingStatus(handed, false)).toBe('handed');
    const meeting = { ...handed, prospecting_meeting_at: NOW };
    expect(prospectingStatus(meeting, true)).toBe('meeting');
    expect(prospectingStatus({ ...meeting, prospecting_mandate_at: NOW }, true)).toBe('mandate');
    expect(prospectingStatus({ ...handed, prospecting_declined_at: NOW }, true)).toBe('declined');
  });
});

describe('applyProspectingMove', () => {
  it('avance d’un cran à la fois, en datant le fait', () => {
    expect(applyProspectingMove('ready', 'handed', NOW)).toEqual({
      ok: true,
      patch: { prospecting_handed_at: NOW },
    });
    expect(applyProspectingMove('handed', 'meeting', NOW)).toEqual({
      ok: true,
      patch: { prospecting_meeting_at: NOW },
    });
    expect(applyProspectingMove('meeting', 'mandate', NOW)).toEqual({
      ok: true,
      patch: { prospecting_mandate_at: NOW },
    });
  });

  it('« pas intéressé » se note à tout moment avant le mandat', () => {
    for (const status of ['to_confirm', 'ready', 'handed', 'meeting'] as const) {
      expect(applyProspectingMove(status, 'declined', NOW)).toEqual({
        ok: true,
        patch: { prospecting_declined_at: NOW },
      });
    }
    expect(applyProspectingMove('mandate', 'declined', NOW).ok).toBe(false);
    expect(applyProspectingMove('declined', 'declined', NOW).ok).toBe(false);
  });

  it('annuler « pas intéressé » rend le concurrent là où il en était', () => {
    const atTheDoor = { ...NONE, prospecting_declined_at: NOW };
    const afterMeeting = {
      ...NONE,
      prospecting_handed_at: NOW,
      prospecting_meeting_at: NOW,
      prospecting_declined_at: NOW,
    };
    for (const [dates, address, expected] of [
      [atTheDoor, false, 'to_confirm'],
      [atTheDoor, true, 'ready'],
      [afterMeeting, true, 'meeting'],
    ] as const) {
      expect(prospectingStatus(dates, address)).toBe('declined');
      const undo = applyProspectingMove('declined', 'back', NOW);
      expect(undo).toEqual({ ok: true, patch: { prospecting_declined_at: null } });
      if (undo.ok) expect(prospectingStatus({ ...dates, ...undo.patch }, address)).toBe(expected);
    }
  });

  // Mission 98 — un confrère se contacte sans attendre l'adresse du bien. Mission 115 — contacté,
  // la suite n'est plus celle d'un propriétaire : collaboration obtenue ou refusée.
  it('un confrère est « contacté » sans adresse, puis dit la collaboration', () => {
    expect(applyProspectingMove('to_confirm', 'handed', NOW, 'colleague')).toEqual({
      ok: true,
      patch: { prospecting_handed_at: NOW },
    });
    expect(canMarkHanded('to_confirm', 'colleague')).toBe(true);
    expect(canMarkHanded('ready', 'colleague')).toBe(true);
    // Contacté sans adresse : le statut tient ; « RDV obtenu » n'est plus un geste de confrère.
    const contacted = { ...NONE, prospecting_handed_at: NOW };
    expect(prospectingStatus(contacted, false)).toBe('handed');
    expect(applyProspectingMove('handed', 'meeting', NOW, 'colleague').ok).toBe(false);
    expect(applyProspectingMove('handed', 'collaboration', NOW, 'colleague').ok).toBe(true);
  });

  it('un propriétaire, ou un concurrent « à vérifier », attend toujours son adresse', () => {
    for (const step of ['owner', 'check'] as const) {
      expect(applyProspectingMove('to_confirm', 'handed', NOW, step).ok).toBe(false);
      expect(canMarkHanded('to_confirm', step)).toBe(false);
      expect(canMarkHanded('ready', step)).toBe(true);
    }
  });

  it('refuse un saut de cran', () => {
    const refused: [ProspectingStatus, 'handed' | 'meeting' | 'mandate'][] = [
      ['to_confirm', 'handed'],
      ['ready', 'meeting'],
      ['handed', 'mandate'],
      ['mandate', 'handed'],
    ];
    for (const [status, move] of refused) {
      expect(applyProspectingMove(status, move, NOW).ok).toBe(false);
    }
  });

  it('revient d’un cran en effaçant la seule date du fait annulé', () => {
    expect(applyProspectingMove('mandate', 'back', NOW)).toEqual({
      ok: true,
      patch: { prospecting_mandate_at: null },
    });
    expect(applyProspectingMove('meeting', 'back', NOW)).toEqual({
      ok: true,
      patch: { prospecting_meeting_at: null },
    });
    expect(applyProspectingMove('handed', 'back', NOW)).toEqual({
      ok: true,
      patch: { prospecting_handed_at: null },
    });
    expect(applyProspectingMove('declined', 'back', NOW)).toEqual({
      ok: true,
      patch: { prospecting_declined_at: null },
    });
  });

  it('n’a rien à annuler avant la remise', () => {
    expect(applyProspectingMove('ready', 'back', NOW).ok).toBe(false);
    expect(applyProspectingMove('to_confirm', 'back', NOW).ok).toBe(false);
  });

  it('ne reconnaît que les cinq gestes', () => {
    expect(isProspectingMove('handed')).toBe(true);
    expect(isProspectingMove('back')).toBe(true);
    expect(isProspectingMove('ready')).toBe(false);
    expect(isProspectingMove(null)).toBe(false);
  });
});

describe('dates', () => {
  it('conseille la relance une semaine après la remise', () => {
    expect(followUpDate('2026-10-07T09:00:00.000Z')).toBe('2026-10-14T09:00:00.000Z');
    expect(followUpDate('pas une date')).toBeNull();
  });

  it('écrit le jour vu de l’agence', () => {
    expect(shortDate('2026-10-07T09:00:00.000Z')).toBe('07/10');
    // 23 h 30 UTC le 7 = déjà le 8 à Paris.
    expect(shortDate('2026-10-07T23:30:00.000Z')).toBe('08/10');
    expect(shortDate(null)).toBeNull();
  });
});

describe('compteurs et avancement', () => {
  const statuses: ProspectingStatus[] = [
    'to_confirm',
    'to_confirm',
    'ready',
    'handed',
    'meeting',
    'mandate',
    'declined',
  ];

  it('compte les faits : un mandat rentré est aussi un rendez-vous et une remise', () => {
    expect(prospectingCounters(statuses)).toEqual({
      toCanvass: 6,
      handed: 3,
      meetings: 2,
      mandates: 1,
      collaborations: 0,
      declined: 1,
    });
  });

  it('dit l’avancement d’un mandat, statuts présents seulement', () => {
    expect(prospectingProgress(['ready', 'to_confirm', 'to_confirm', 'to_confirm', 'handed'])).toBe(
      '1 prêt · 3 adresses à confirmer · 1 remis',
    );
    expect(prospectingProgress(['handed', 'handed', 'meeting'])).toBe('2 remis · 1 RDV obtenu');
    expect(prospectingProgress([])).toBeNull();
  });
});

// Mission 115 — le confrère : collaboration obtenue ou refusée, après « Contacté ».
describe('collaboration avec le confrère (mission 115)', () => {
  const contacted = { ...NONE, prospecting_handed_at: NOW };
  const LATER = '2026-10-12T08:00:00.000Z';

  it('contacté, un confrère a « obtenue » ou « refusée », plus « RDV obtenu »', () => {
    expect(applyProspectingMove('handed', 'collaboration', NOW, 'colleague')).toEqual({
      ok: true,
      patch: { prospecting_collaboration_at: NOW },
    });
    expect(applyProspectingMove('handed', 'collaboration_declined', NOW, 'colleague')).toEqual({
      ok: true,
      patch: { prospecting_collaboration_declined_at: NOW },
    });
    expect(applyProspectingMove('handed', 'meeting', NOW, 'colleague').ok).toBe(false);
  });

  it('ni avant le contact, ni pour un propriétaire', () => {
    for (const status of ['to_confirm', 'ready', 'meeting'] as const) {
      expect(applyProspectingMove(status, 'collaboration', NOW, 'colleague').ok).toBe(false);
      expect(applyProspectingMove(status, 'collaboration_declined', NOW, 'colleague').ok).toBe(
        false,
      );
    }
    for (const step of ['owner', 'check'] as const) {
      expect(applyProspectingMove('handed', 'collaboration', NOW, step).ok).toBe(false);
      // Le parcours propriétaire ne change pas : remis → rendez-vous → mandat.
      expect(applyProspectingMove('handed', 'meeting', NOW, step).ok).toBe(true);
    }
  });

  it('« obtenue » clôt la prospection : statut à part, plus « pas intéressé », annulable', () => {
    const obtained = { ...contacted, prospecting_collaboration_at: LATER };
    expect(prospectingStatus(obtained, false)).toBe('collaboration');
    expect(applyProspectingMove('collaboration', 'declined', NOW, 'colleague').ok).toBe(false);
    expect(applyProspectingMove('collaboration', 'meeting', NOW, 'colleague').ok).toBe(false);
    expect(applyProspectingMove('collaboration', 'back', NOW, 'colleague')).toEqual({
      ok: true,
      patch: { prospecting_collaboration_at: null },
    });
    expect(prospectingCounters(['collaboration', 'handed', 'mandate'])).toMatchObject({
      toCanvass: 2,
      handed: 3,
      mandates: 1,
      collaborations: 1,
    });
    expect(prospectingProgress(['collaboration', 'collaboration'])).toBe(
      '2 collaborations obtenues',
    );
  });

  it('« refusée » remet le bien en propriétaire : le contact d’avant ne compte plus', () => {
    const refused = { ...contacted, prospecting_collaboration_declined_at: LATER };
    // Le contact du confrère (NOW) est antérieur au refus (LATER) : à l'adresse de décider.
    expect(prospectingStatus(refused, true)).toBe('ready');
    expect(prospectingStatus(refused, false)).toBe('to_confirm');
    // Puis la suite d'un propriétaire, datée après le refus.
    const AFTER = '2026-10-14T08:00:00.000Z';
    expect(applyProspectingMove('ready', 'handed', AFTER, 'owner')).toEqual({
      ok: true,
      patch: { prospecting_handed_at: AFTER },
    });
    const handed = { ...refused, prospecting_handed_at: AFTER };
    expect(prospectingStatus(handed, true)).toBe('handed');
    expect(applyProspectingMove('handed', 'meeting', AFTER, 'owner').ok).toBe(true);
    expect(prospectingStatus({ ...handed, prospecting_meeting_at: AFTER }, true)).toBe('meeting');
  });

  it('le refus, dernier fait posé, s’annule ; le confrère redevient « contacté »', () => {
    expect(applyProspectingMove('ready', 'back', NOW, 'owner', true)).toEqual({
      ok: true,
      patch: { prospecting_collaboration_declined_at: null },
    });
    expect(applyProspectingMove('to_confirm', 'back', NOW, 'owner', true).ok).toBe(true);
    expect(applyProspectingMove('ready', 'back', NOW, 'owner', false).ok).toBe(false);
    // Un fait posé après le refus s'annule d'abord, lui.
    expect(applyProspectingMove('handed', 'back', NOW, 'owner', true)).toEqual({
      ok: true,
      patch: { prospecting_handed_at: null },
    });
  });

  it('reconnaît les sept gestes', () => {
    expect(isProspectingMove('collaboration')).toBe(true);
    expect(isProspectingMove('collaboration_declined')).toBe(true);
  });
});

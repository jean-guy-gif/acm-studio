import { describe, expect, it } from 'vitest';

import {
  applyProspectingMove,
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

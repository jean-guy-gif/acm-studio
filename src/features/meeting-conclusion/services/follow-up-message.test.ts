import { describe, expect, it } from 'vitest';

import { buildDossierFollowUp } from '@/features/meeting-conclusion/services/dossier-follow-up';
import {
  buildFollowUpMessage,
  type FollowUpMessageInput,
} from '@/features/meeting-conclusion/services/follow-up-message';
import {
  FOLLOW_UP_MOTIVES,
  type FollowUpMotive,
  type MeetingConclusion,
} from '@/features/meeting-conclusion/types';

const plain = (text: string): string => text.replace(/[  ]/g, ' ');
const digits = (text: string): string => text.replace(/[\s  ]/g, '');

const BASE: FollowUpMessageInput = {
  motive: 'thinking_price',
  meetingDate: '3 octobre',
  sellerPerceivedPrice: 350_000,
  sellerRevisedPrice: 325_000,
  commercializationPrice: 330_000,
  launchReadinessMissing: null,
  priceDropsSinceMeeting: 0,
  advisorFirstName: 'Claire',
  agencyName: 'Agence du Cap',
};

describe('le message de relance (mission 96)', () => {
  it('reprend ce que le vendeur a dit lui-même', () => {
    const message = plain(buildFollowUpMessage(BASE));
    expect(message).toContain(
      'Vous m’aviez dit qu’après avoir vu le marché, 325 000 € vous semblait cohérent.',
    );
    expect(message).toContain('notre rendez-vous du 3 octobre');
  });

  it('sans prix reformulé, il reprend le prix du début', () => {
    const message = plain(buildFollowUpMessage({ ...BASE, sellerRevisedPrice: null }));
    expect(message).toContain('vous imaginiez votre bien à 350 000 €');
    expect(message).not.toContain('après avoir vu le marché');
  });

  it('sans aucun prix dit par le vendeur, il n’en invente pas', () => {
    const message = buildFollowUpMessage({
      ...BASE,
      sellerRevisedPrice: null,
      sellerPerceivedPrice: null,
    });
    expect(message).not.toContain('€');
    expect(message).not.toContain('Vous m’aviez dit');
  });

  it('reprend ce qui lui manquait pour être à 10, entre guillemets', () => {
    const message = buildFollowUpMessage({
      ...BASE,
      launchReadinessMissing: ' Un avis de\nmon notaire ',
    });
    expect(message).toContain('« Un avis de mon notaire »');
  });

  it('est signé du prénom du conseiller et du nom sur les documents', () => {
    const message = buildFollowUpMessage(BASE);
    expect(message.endsWith('Bien cordialement,\nClaire\nAgence du Cap')).toBe(true);
    expect(buildFollowUpMessage({ ...BASE, advisorFirstName: null, agencyName: null })).toMatch(
      /Bien cordialement,$/,
    );
  });

  it('s’adapte au motif choisi', () => {
    const closing = (motive: FollowUpMotive | null) =>
      plain(buildFollowUpMessage({ ...BASE, motive }));
    expect(closing('price_accepted')).toContain(
      'Nous étions convenus d’un prix de 330 000 €. Quand souhaitez-vous que nous signions le mandat ?',
    );
    expect(closing('thinking_price')).toContain('Où en est votre réflexion sur le prix ?');
    expect(closing('consulting_relative')).toContain('Avez-vous pu en parler autour de vous ?');
    expect(closing('awaiting_estimate')).toContain('l’autre estimation que vous attendiez');
    expect(closing('undated_project')).toContain('Votre projet de vente a-t-il avancé ?');
    expect(closing('other')).toContain('Où en êtes-vous de votre projet ?');
    expect(closing(null)).toContain('Où en êtes-vous de votre projet ?');
    const texts = new Set(FOLLOW_UP_MOTIVES.filter((m) => m !== 'other').map(closing));
    expect(texts.size).toBe(5);
  });

  it('« prix accepté » sans prix enregistré : aucun montant inventé', () => {
    const message = buildFollowUpMessage({
      ...BASE,
      motive: 'price_accepted',
      commercializationPrice: null,
    });
    expect(message).toContain('Nous étions d’accord sur le prix.');
  });

  it('dit les baisses depuis le rendez-vous sans nommer de bien', () => {
    const two = buildFollowUpMessage({ ...BASE, priceDropsSinceMeeting: 2 });
    expect(two).toContain(
      'Depuis notre rendez-vous, 2 des biens que nous avions vus ont baissé leur prix.',
    );
    const one = buildFollowUpMessage({ ...BASE, priceDropsSinceMeeting: 1 });
    expect(one).toContain('1 des biens que nous avions vus a baissé son prix.');
    expect(buildFollowUpMessage(BASE)).not.toContain('baissé');
  });

  it('aucune formule de pression, aucune urgence', () => {
    for (const motive of [...FOLLOW_UP_MOTIVES, null]) {
      const message = buildFollowUpMessage({ ...BASE, motive, priceDropsSinceMeeting: 3 });
      expect(message).not.toMatch(
        /urgen|vite|rapidement|dernière chance|ne tardez|dépêch|avant qu|risque|perdre|!/i,
      );
    }
  });
});

describe('le message ne contient aucune adresse ni aucun prix de concurrent', () => {
  const conclusion: MeetingConclusion = {
    marketComputed: 318_000,
    advisorAnalysis: 322_000,
    advisorPrice: 319_000,
    commercializationPrice: 330_000,
    sellerPerceivedPrice: 350_000,
    sellerRevisedPrice: 325_000,
    launchReadinessFirst: 7,
    launchReadinessLast: 8,
    launchReadinessMissing: 'Un avis de mon notaire',
    outcome: 'follow_up',
    followUpReason: 'note de travail du conseiller',
    followUpMotive: 'thinking_price',
    followUpMotiveDetail: null,
    mandateType: null,
    signedAt: null,
    concludedAt: '2026-10-03T15:00:00Z',
    outcomeChangedAt: '2026-10-03T15:00:00Z',
  };
  // Des concurrents aux prix reconnaissables, et un libellé qui porte une commune.
  const competitors = [
    { guess: 281_111, revealedPrice: 301_111, currentPrice: 291_111 },
    { guess: 412_222, revealedPrice: 402_222, currentPrice: 392_222 },
    { guess: 263_333, revealedPrice: null, currentPrice: 273_333 },
  ];
  const view = buildDossierFollowUp({
    conclusion,
    liveStartedAt: null,
    liveEndedAt: null,
    competitors,
    dangerous: {
      label: 'Appartement · 3 pièces · 68 m² · Villeneuve-Loubet',
      revealedPrice: 301_111,
      currentPrice: 291_111,
    },
    contacts: [],
    now: new Date('2026-10-20T12:00:00Z'),
    signature: { advisorFirstName: 'Claire', agencyName: 'Agence du Cap' },
  });

  it('un message est proposé pour un dossier « à relancer »', () => {
    expect(view.message).toContain('Depuis notre rendez-vous, 2 des biens');
  });

  it('aucun prix de concurrent, ni révélé, ni actuel, ni deviné', () => {
    const message = digits(view.message!);
    for (const competitor of competitors) {
      for (const price of [competitor.guess, competitor.revealedPrice, competitor.currentPrice]) {
        if (price != null) {
          expect(message).not.toContain(String(price));
        }
      }
    }
  });

  it('aucun concurrent nommé : ni libellé, ni commune', () => {
    expect(view.message).not.toContain('Villeneuve-Loubet');
    expect(view.message).not.toContain('68');
    expect(view.message).not.toMatch(/concurrent/i);
  });

  it('ni les repères du conseiller, ni sa note de travail', () => {
    const message = digits(view.message!);
    for (const amount of [318_000, 322_000, 319_000]) {
      expect(message).not.toContain(String(amount));
    }
    expect(view.message).not.toContain('note de travail');
  });

  it('les seuls montants du message sont ceux que le vendeur a dits', () => {
    const amounts = [...plain(view.message!).matchAll(/(\d[\d ]*\d) €/g)].map((match) =>
      Number(match[1].replace(/ /g, '')),
    );
    expect(amounts).toEqual([325_000]);
  });

  it('pas de message pour une autre issue', () => {
    const signed = buildDossierFollowUp({
      conclusion: { ...conclusion, outcome: 'signed', followUpMotive: null },
      liveStartedAt: null,
      liveEndedAt: null,
      competitors,
      dangerous: null,
      contacts: [],
      now: new Date('2026-10-20T12:00:00Z'),
      signature: { advisorFirstName: 'Claire', agencyName: 'Agence du Cap' },
    });
    expect(signed.message).toBeNull();
    expect(signed.due).toBe(false);
    expect(signed.lastContactDays).toBeNull();
  });
});

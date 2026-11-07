import { describe, expect, it } from 'vitest';

import {
  BUYER_LANGUAGES,
  LANGUE_ALLEMAND_PROPOSEE,
  LANGUE_ANGLAIS_PROPOSEE,
  LANGUE_ITALIEN_PROPOSEE,
  LANGUE_RUSSE_PROPOSEE,
  buyerLanguage,
  offeredLanguages,
} from '@/features/buyer-messages/languages';
import {
  isEmptyWeek,
  meetingProposalMessage,
  propertyKind,
  visitBuyerMessage,
  visitSellerMessage,
  weeklyReportMessage,
  type VisitReport,
} from '@/features/buyer-messages/messages';
import { spokenLanguage } from '@/lib/client-language';
import { visitOutcomeOf, visitReportLine } from '@/features/buyer-messages/report';
import { visitReportSchema } from '@/features/buyer-messages/report-schema';
import { meetingTasks, weeklyReportTasks } from '@/features/buyer-messages/report-tasks';
import { VISIT_NEXT_STEPS, VISIT_OPINIONS } from '@/features/buyer-messages/templates/types';
import { coveredWeek, weekFigures } from '@/features/buyer-messages/week';

// Mission 139 — les messages de l'après-visite et de la recherche, depuis les modèles de chaque
// langue ; les chiffres de la semaine, exacts, sans rien inventer ; les tâches du lundi.
const VISITED_AT = '2026-11-06T10:00:00Z';
const KELLER: VisitReport = {
  opinion: 'interested',
  liked: ['outdoor', 'pool'],
  disliked: ['price'],
  nextStep: 'offer',
};
const mougins = { kind: 'house' as const, city: 'Mougins' };

describe('les langues', () => {
  it('français et anglais proposés ; italien, allemand, russe cachés jusqu’à leur relecture', () => {
    expect(LANGUE_ANGLAIS_PROPOSEE).toBe(true);
    expect([LANGUE_ITALIEN_PROPOSEE, LANGUE_ALLEMAND_PROPOSEE, LANGUE_RUSSE_PROPOSEE]).toEqual([
      false,
      false,
      false,
    ]);
    expect(offeredLanguages()).toEqual(['fr', 'en']);
    // Une langue déjà posée sur la fiche reste choisie, même cachée.
    expect(offeredLanguages('ru')).toEqual(['fr', 'en', 'ru']);
    expect(buyerLanguage('es')).toBe('fr');
  });
});

describe('le compte rendu de visite, à l’acquéreur', () => {
  it('en français : merci, ce qui a plu, ce qui a gêné, la suite', () => {
    expect(
      visitBuyerMessage({
        language: 'fr',
        buyerName: 'Famille Keller',
        property: mougins,
        visitedAt: VISITED_AT,
        report: KELLER,
        advisorFirstName: 'Natacha',
      }),
    ).toBe(
      [
        'Bonjour Famille Keller,',
        'Merci pour la visite de la maison de Mougins le 6 novembre.',
        'Ce qui vous a plu : l’extérieur et la piscine.',
        'Ce qui vous a gêné : le prix.',
        'Comme convenu, nous préparons ensemble votre offre d’achat : je vous appelle pour en fixer les termes.',
        'Natacha',
      ].join('\n'),
    );
  });

  it('en anglais : la date en toutes lettres, jamais « 11/6 »', () => {
    expect(
      visitBuyerMessage({
        language: 'en',
        buyerName: 'Mr and Mrs Wilson',
        property: { kind: 'apartment', city: 'Antibes' },
        visitedAt: VISITED_AT,
        report: {
          opinion: 'mixed',
          liked: ['light', 'overlooked'],
          disliked: ['noise', 'works'],
          nextStep: 'second_visit',
        },
        advisorFirstName: 'Natacha',
      }),
    ).toBe(
      [
        'Dear Mr and Mrs Wilson,',
        'Thank you for visiting the flat in Antibes on 6 November.',
        'What you liked: the light and the open outlook.',
        'What held you back: the work needed and the noise.',
        'I suggest a second viewing: I will get back to you with some possible times.',
        'Natacha',
      ].join('\n'),
    );
  });

  it('chaque langue, chaque avis, chaque suite : un message complet, sans « autre » ni jabot', () => {
    for (const language of BUYER_LANGUAGES) {
      for (const opinion of VISIT_OPINIONS) {
        for (const nextStep of VISIT_NEXT_STEPS) {
          const message = visitBuyerMessage({
            language,
            buyerName: 'Famille Keller',
            property: mougins,
            visitedAt: VISITED_AT,
            report: { opinion, liked: ['pool', 'other'], disliked: ['price'], nextStep },
            advisorFirstName: 'Natacha',
          });
          expect(message.split('\n')).toHaveLength(6);
          expect(message).toContain('Mougins');
          expect(message).not.toMatch(/undefined|null|\{|\}|other|autre/i);
          expect(message).not.toMatch(/€|\d{3} \d{3}/);
        }
      }
    }
  });

  it('sans étiquette, ni « ce qui a plu » ni « ce qui a gêné »', () => {
    const message = visitBuyerMessage({
      language: 'fr',
      buyerName: 'M. et Mme Lambert',
      property: { kind: 'other', city: null },
      visitedAt: VISITED_AT,
      report: { opinion: 'not_for_me', liked: [], disliked: [], nextStep: 'keep_searching' },
      advisorFirstName: null,
    });
    expect(message).toBe(
      [
        'Bonjour M. et Mme Lambert,',
        'Merci pour la visite du bien le 6 novembre.',
        'Je continue à chercher pour vous et je vous envoie les prochains biens qui correspondent à votre recherche.',
      ].join('\n'),
    );
  });

  it('le type de bien lu sur le libellé ou la fiche', () => {
    expect(propertyKind('Maison')).toBe('house');
    expect(propertyKind('Appartement')).toBe('apartment');
    expect(propertyKind('house')).toBe('house');
    expect(propertyKind('Terrain')).toBe('other');
  });
});

describe('le retour au vendeur', () => {
  it('en français, sans le nom de l’acquéreur, ni sa note, ni la suite qu’il envisage', () => {
    const message = visitSellerMessage({
      sellerName: 'M. Lefebvre',
      visitedAt: VISITED_AT,
      report: KELLER,
      advisorFirstName: 'Natacha',
    });
    expect(message).toBe(
      [
        'Bonjour M. Lefebvre,',
        'La visite de votre bien du 6 novembre : l’acquéreur a été intéressé.',
        'Ce qui lui a plu : l’extérieur et la piscine.',
        'Ce qui l’a gêné : le prix.',
        'Je reviens vers vous très vite.',
        'Natacha',
      ].join('\n'),
    );
    expect(message).not.toMatch(/Keller|offre|budget/i);
  });

  it('chaque avis se dit en une proposition juste', () => {
    const line = (opinion: VisitReport['opinion']) =>
      visitSellerMessage({
        sellerName: 'M. Lefebvre',
        visitedAt: VISITED_AT,
        report: { ...KELLER, opinion },
        advisorFirstName: null,
      }).split('\n')[1];
    expect(line('love')).toBe(
      'La visite de votre bien du 6 novembre : l’acquéreur a eu un coup de cœur.',
    );
    expect(line('mixed')).toBe(
      'La visite de votre bien du 6 novembre : l’acquéreur est resté mitigé.',
    );
    expect(line('not_for_me')).toBe(
      'La visite de votre bien du 6 novembre : le bien n’a pas convaincu l’acquéreur.',
    );
  });
});

describe('le compte rendu, relu au serveur', () => {
  it('l’issue se déduit de la suite : « Offre envisagée » ⇔ offre', () => {
    expect(visitOutcomeOf({ opinion: 'love', nextStep: 'offer' })).toBe('offer');
    expect(visitOutcomeOf({ opinion: 'not_for_me', nextStep: 'keep_searching' })).toBe('declined');
    expect(visitOutcomeOf({ opinion: 'mixed', nextStep: 'second_visit' })).toBe('visited');
  });

  it('« Pas pour moi » et « Offre envisagée » se contredisent ; les étiquettes dédoublonnées', () => {
    expect(
      visitReportSchema.safeParse({
        opinion: 'not_for_me',
        liked: [],
        disliked: [],
        nextStep: 'offer',
        note: '',
      }).success,
    ).toBe(false);
    const parsed = visitReportSchema.parse({
      opinion: 'interested',
      liked: ['pool', 'outdoor', 'pool'],
      disliked: ['price'],
      nextStep: 'offer',
      note: '  Ils reviennent samedi.  ',
    });
    expect(parsed.liked).toEqual(['outdoor', 'pool']);
    expect(parsed.note).toBe('Ils reviennent samedi.');
    expect(
      visitReportSchema.safeParse({
        opinion: 'interested',
        liked: ['garage'],
        disliked: [],
        nextStep: 'offer',
        note: '',
      }).success,
    ).toBe(false);
  });

  it('ce que le conseiller relit sur la visite', () => {
    expect(visitReportLine(KELLER)).toBe(
      'Intéressé · a aimé : l’extérieur, la piscine · gêné : le prix',
    );
  });
});

describe('le point de la semaine', () => {
  // Jeudi 12/11/2026 : la semaine écoulée va du lundi 2 au dimanche 8 novembre.
  const NOW = new Date('2026-11-12T09:00:00Z');
  const week = coveredWeek(NOW);

  it('la semaine écoulée, du lundi 00:00 au lundi suivant, à Paris', () => {
    expect(week.start).toBe('2026-11-02');
    expect(week.end).toBe('2026-11-09');
    // Minuit à Paris en hiver : 23 h UTC la veille.
    expect(week.startAt.toISOString()).toBe('2026-11-01T23:00:00.000Z');
    // Heure d'été : le lundi 30/03/2026 commence à 22 h UTC la veille.
    expect(coveredWeek(new Date('2026-04-08T09:00:00Z')).startAt.toISOString()).toBe(
      '2026-03-29T22:00:00.000Z',
    );
  });

  it('des chiffres exacts : étudiés sans doublon, écartés par raison, retenus, visites', () => {
    const figures = weekFigures(
      {
        finds: [
          { key: 'listing:a', at: '2026-11-04T02:00:00Z' },
          { key: 'listing:b', at: '2026-11-04T02:00:00Z' },
          // Hors de la semaine.
          { key: 'listing:z', at: '2026-11-09T00:30:00Z' },
        ],
        dismissals: [
          { key: 'listing:a', reason: 'parking', at: '2026-11-05T10:00:00Z' },
          { key: 'listing:c', reason: 'parking', at: '2026-11-05T10:00:00Z' },
          { key: 'listing:d', reason: 'over_budget', at: '2026-11-06T10:00:00Z' },
          // Dimanche 23 h 30 à Paris : encore la semaine.
          { key: 'listing:e', reason: 'sector', at: '2026-11-08T22:30:00Z' },
        ],
        retained: [
          { key: 'listing:b', at: '2026-11-07T10:00:00Z' },
          { key: 'project:p1', at: '2026-11-07T10:00:00Z' },
          { key: 'project:p0', at: '2026-10-20T10:00:00Z' },
        ],
        visits: [{ at: '2026-11-03T15:00:00Z' }, { at: '2026-10-28T15:00:00Z' }],
      },
      week,
    );
    expect(figures).toEqual({
      studied: 6,
      dismissed: { parking: 2, over_budget: 1, sector: 1 },
      retained: 2,
      visits: 1,
    });
    expect(
      weeklyReportMessage({
        language: 'fr',
        buyerName: 'M. et Mme Lambert',
        figures,
        advisorFirstName: 'Natacha',
      }),
    ).toBe(
      [
        'Bonjour M. et Mme Lambert,',
        'Voici le point de la semaine sur votre recherche.',
        'Cette semaine pour vous : 6 biens étudiés, 4 écartés (2 pour le stationnement, 1 pour le secteur, 1 pour le prix), 2 retenus, 1 visite.',
        'Je reste à votre disposition.',
        'Natacha',
      ].join('\n'),
    );
  });

  it('une semaine vide le dit ; un chiffre à zéro ne se dit pas', () => {
    const empty = { studied: 0, dismissed: {}, retained: 0, visits: 0 };
    expect(isEmptyWeek(empty)).toBe(true);
    expect(
      weeklyReportMessage({
        language: 'fr',
        buyerName: 'Famille Keller',
        figures: empty,
        advisorFirstName: null,
      }),
    ).toContain('Pas de nouveau bien correspondant cette semaine ; je reste attentif.');
    const one = weeklyReportMessage({
      language: 'en',
      buyerName: 'Mr and Mrs Wilson',
      figures: { studied: 1, dismissed: {}, retained: 0, visits: 0 },
      advisorFirstName: null,
    });
    expect(one).toContain('This week for you: 1 property reviewed.');
    expect(one).not.toMatch(/set aside|shortlisted|viewing/);
  });

  it('chaque langue écrit ses chiffres, sans jabot', () => {
    for (const language of BUYER_LANGUAGES) {
      const message = weeklyReportMessage({
        language,
        buyerName: 'Famille Keller',
        figures: {
          studied: 14,
          dismissed: { parking: 5, over_budget: 3, other: 3 },
          retained: 3,
          visits: 1,
        },
        advisorFirstName: 'Natacha',
      });
      expect(message).toMatch(/14/);
      expect(message).toMatch(/11/);
      expect(message).not.toMatch(/\{n\}|undefined|null/);
    }
  });

  it('le point proposé, dans la langue', () => {
    expect(
      meetingProposalMessage({
        language: 'de',
        buyerName: 'Familie Keller',
        advisorFirstName: 'Natacha',
      }),
    ).toContain('in der Agentur oder per Videoanruf');
  });
});

describe('les tâches de la recherche', () => {
  const NOW = new Date('2026-11-12T09:00:00Z');
  const base = {
    id: 'b1',
    name: 'Famille Keller',
    createdAt: '2026-10-01T10:00:00Z',
    active: true,
    ready: true,
    reportedWeeks: new Set<string>(),
    lastMeetingAt: null,
  };

  it('le point de la semaine : dû le lundi, une fois par semaine, pour un acquéreur actif', () => {
    // Mission 145 — proposé du lundi au mercredi soir (Paris), retiré ensuite (NOW est un jeudi).
    const WEDNESDAY = new Date('2026-11-11T21:00:00Z');
    expect(weeklyReportTasks([base], NOW)).toEqual([]);
    expect(weeklyReportTasks([base], new Date('2026-11-11T23:30:00Z'))).toEqual([]);
    expect(weeklyReportTasks([base], new Date('2026-11-09T07:00:00Z'))).toHaveLength(1);
    const [task] = weeklyReportTasks([base], WEDNESDAY);
    expect(task).toMatchObject({
      kind: 'buyer_weekly_report',
      dueOn: '2026-11-09',
      weekStart: '2026-11-02',
    });
    expect(
      weeklyReportTasks([{ ...base, reportedWeeks: new Set(['2026-11-02']) }], WEDNESDAY),
    ).toEqual([]);
    expect(weeklyReportTasks([{ ...base, active: false }], WEDNESDAY)).toEqual([]);
  });

  it('le point proposé : 14 jours après la fiche, puis après le dernier ; prêt seulement', () => {
    expect(meetingTasks([base])[0]!.dueOn).toBe('2026-10-15');
    expect(meetingTasks([{ ...base, lastMeetingAt: '2026-11-10T10:00:00Z' }])[0]!.dueOn).toBe(
      '2026-11-24',
    );
    expect(meetingTasks([{ ...base, ready: false }])).toEqual([]);
  });
});

// Mission 140 B (décisions de Jean-Guy, 07/11) — aucune langue non relue n'atteint un client ; le
// compte rendu au vendeur suit la langue de son dossier.
describe('la langue des messages, côté client', () => {
  it('une langue cachée retombe en français ; l’anglais reste l’anglais', () => {
    expect(spokenLanguage('it')).toBe('fr');
    expect(spokenLanguage('de')).toBe('fr');
    expect(spokenLanguage('ru')).toBe('fr');
    expect(spokenLanguage('en')).toBe('en');
    expect(spokenLanguage(null)).toBe('fr');
  });

  it('le compte rendu au vendeur, en anglais pour un dossier en anglais', () => {
    const message = visitSellerMessage({
      sellerName: 'Mr and Mrs Bernard',
      visitedAt: VISITED_AT,
      report: KELLER,
      advisorFirstName: 'Natacha',
      language: 'en',
    });
    expect(message).toBe(
      [
        'Hello Mr and Mrs Bernard,',
        'The viewing of your property on 6 November: the buyer was interested.',
        'What they liked: the outdoor space and the pool.',
        'What put them off: the price.',
        'I will get back to you very soon.',
        'Natacha',
      ].join('\n'),
    );
    expect(message).not.toMatch(/Keller|offer|budget|Bonjour|visite/i);
  });
});

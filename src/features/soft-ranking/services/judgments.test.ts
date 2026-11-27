import { describe, expect, it } from 'vitest';

import { DEMO_LISTINGS } from '@/features/demo/data/scenarios';
import { demoRankingAnswer } from '@/features/demo/services/demo-soft-ranking';
import { rankingInstructions, rankingSchema } from '@/features/soft-ranking/ranking-request';
import {
  citesAnAddress,
  guardJudgments,
  mentionsLine,
  orderBySoftScore,
  orderWithinGroups,
  reasonsOfRanking,
  softMentions,
  softScore,
  whyRows,
} from '@/features/soft-ranking/services/judgments';
import type { RankingListing } from '@/features/soft-ranking/types';

// Mission 151 (partie B) — le jugement de ce qui compte pour eux, gardé au serveur.

const listing: RankingListing = {
  key: 'https://www.seloger.com/annonces/1.htm',
  text: 'Maison de caractère, poutres apparentes. Au calme absolu, aucun passage. À deux pas de la gare.',
  tags: ['Calme'],
};
const ids = new Map([['a1', listing]]);

describe('guardJudgments', () => {
  it('garde un jugement dont la citation est dans l’annonce, mot pour mot (casse et espaces près)', () => {
    const judged = guardJudgments(
      {
        annonces: [
          {
            id: 'a1',
            jugements: [
              {
                critere: 'calme',
                verdict: 'reserve',
                citation: 'au  calme absolu, aucun passage',
                contre_citation: 'À deux pas de la gare',
                a_verifier: false,
              },
              {
                critere: 'cachet',
                verdict: 'clairement',
                citation: 'poutres apparentes',
                contre_citation: null,
                a_verifier: false,
              },
            ],
          },
        ],
      },
      ids,
      ['calme', 'cachet'],
    );
    expect(judged.get(listing.key)).toEqual([
      {
        key: 'calme',
        verdict: 'reserve',
        quote: 'au  calme absolu, aucun passage',
        counterQuote: 'À deux pas de la gare',
        toVerify: false,
      },
      {
        key: 'cachet',
        verdict: 'clearly',
        quote: 'poutres apparentes',
        counterQuote: null,
        toVerify: false,
      },
    ]);
  });

  it('une citation absente fait tomber le jugement à « rien » ; un critère sauté est « non lu »', () => {
    const judged = guardJudgments(
      {
        annonces: [
          {
            id: 'a1',
            jugements: [
              {
                critere: 'calme',
                verdict: 'clairement',
                citation: 'au calme absolu… sans nuisance',
                contre_citation: null,
                a_verifier: false,
              },
              // Un critère hors de la fiche est ignoré.
              { critere: 'vue', verdict: 'clairement', citation: 'Maison', a_verifier: false },
            ],
          },
          // Une annonce qui n'a pas été demandée est ignorée.
          { id: 'a9', jugements: [] },
        ],
      },
      ids,
      ['calme', 'cachet'],
    );
    expect(judged.size).toBe(1);
    expect(judged.get(listing.key)?.map((j) => j.verdict)).toEqual(['nothing', 'unread']);
  });

  it('une réserve sans contre-citation vérifiée tombe ; l’étiquette seule est « à vérifier »', () => {
    const judged = guardJudgments(
      {
        annonces: [
          {
            id: 'a1',
            jugements: [
              {
                critere: 'calme',
                verdict: 'clairement',
                citation: 'Calme',
                contre_citation: null,
                a_verifier: true,
              },
              {
                critere: 'cachet',
                verdict: 'reserve',
                citation: 'Maison de caractère',
                contre_citation: 'une rue passante',
                a_verifier: false,
              },
            ],
          },
        ],
      },
      ids,
      ['calme', 'cachet'],
    );
    const [calme, cachet] = judged.get(listing.key)!;
    expect(calme).toMatchObject({ verdict: 'clearly', toVerify: true });
    expect(cachet).toMatchObject({ verdict: 'nothing', quote: null });
  });

  it('une réponse illisible ne juge rien', () => {
    expect(guardJudgments('texte', ids, ['calme']).size).toBe(0);
    expect(guardJudgments({ annonces: 'non' }, ids, ['calme']).size).toBe(0);
  });
});

describe('le score et l’ordre (Jean-Guy, 12/11)', () => {
  const j = (verdict: 'clearly' | 'reserve' | 'nothing' | 'contrary' | 'unread') => ({
    key: 'calme' as const,
    verdict,
    quote: null,
    counterQuote: null,
    toVerify: false,
  });

  it('clairement 2, avec réserve 1, rien ou non lu 0, le contraire −2', () => {
    expect(softScore([j('clearly'), j('reserve'), j('nothing'), j('unread')])).toBe(3);
    expect(softScore([j('contrary')])).toBe(-2);
    expect(softScore(undefined)).toBe(0);
  });

  it('range sans rien retirer ni ajouter ; à égalité, l’ordre d’avant (le %, puis le prix)', () => {
    const items = ['a', 'b', 'c', 'd'];
    const score: Record<string, number> = { a: 0, b: 2, c: -2, d: 2 };
    expect(orderBySoftScore(items, (item) => score[item]!)).toEqual(['b', 'd', 'a', 'c']);
  });
});

describe('la forme simplifiée et la carte', () => {
  it('les mots trouvés, sans jugement', () => {
    expect(softMentions(listing, ['calme', 'cachet', 'vue'])).toEqual(['calme', 'caractère']);
    expect(mentionsLine(['calme'])).toBe('L’annonce mentionne «\u00a0calme\u00a0»');
    expect(mentionsLine([])).toBe('L’annonce ne mentionne aucun de leurs mots');
  });

  it('✓ ≈ ? ✗ avec les mots exacts de l’annonce', () => {
    const rows = whyRows([
      {
        key: 'calme',
        verdict: 'reserve',
        quote: 'calme',
        counterQuote: 'la gare',
        toVerify: false,
      },
      {
        key: 'cachet',
        verdict: 'contrary',
        quote: 'villa contemporaine',
        counterQuote: null,
        toVerify: false,
      },
      { key: 'vue', verdict: 'nothing', quote: null, counterQuote: null, toVerify: false },
    ]);
    expect(rows.map((row) => row.mark)).toEqual(['≈', '✗', '?']);
    expect(rows[0]!.text).toBe(
      'avec réserve\u00a0: «\u00a0calme\u00a0» mais «\u00a0la gare\u00a0»',
    );
    expect(rows[2]!.text).toBe('l’annonce n’en dit rien');
  });

  it('le classement reçu, bien par bien', () => {
    expect(reasonsOfRanking({ mode: 'simple', reason: 'failed', byKey: { k: ['calme'] } })).toEqual(
      { k: { mentions: ['calme'] } },
    );
  });
});

describe('la demande au modèle', () => {
  it('ne demande que les critères de la fiche, avec la règle de la mesure pour le calme', () => {
    const instructions = rankingInstructions(['calme', 'vue']);
    expect(instructions).toContain('- calme : le bien et son environnement sont au calme');
    expect(instructions).toContain('- vue : ');
    expect(instructions).not.toContain('- cachet : ');
    const schema = JSON.stringify(rankingSchema(['calme', 'vue']));
    expect(schema).toContain('"enum":["calme","vue"]');
  });
});

// La lecture simulée de la démo passe par la même vérification que la vraie.
describe('la lecture simulée de la démo', () => {
  it('les textes de Vence : le calme clairement, avec réserve, une vue, de plain-pied', () => {
    const vence = (id: string): RankingListing => {
      const found = DEMO_LISTINGS.find((item) => item.id === id)!;
      return { key: id, text: found.description, tags: [] };
    };
    const batch = ['ven-01', 'ven-07', 'ven-05', 'ven-08', 'ven-12'].map((id, index) => ({
      id: `a${index + 1}`,
      listing: vence(id),
    }));
    const judged = guardJudgments(
      demoRankingAnswer(batch, ['calme', 'vue', 'plain_pied']),
      new Map(batch.map(({ id, listing }) => [id, listing])),
      ['calme', 'vue', 'plain_pied'],
    );
    const verdicts = (id: string) => judged.get(id)!.map((j) => j.verdict);
    expect(verdicts('ven-01')).toEqual(['clearly', 'nothing', 'nothing']);
    expect(verdicts('ven-07')).toEqual(['reserve', 'nothing', 'nothing']);
    expect(verdicts('ven-05')).toEqual(['nothing', 'clearly', 'nothing']);
    expect(verdicts('ven-08')).toEqual(['nothing', 'nothing', 'clearly']);
    expect(verdicts('ven-12')).toEqual(['nothing', 'nothing', 'nothing']);
  });
});

describe('le score ne range qu’à l’intérieur d’un groupe (Jean-Guy, 12/11)', () => {
  it('les groupes gardent leur ordre, aucun bien ne change de groupe', () => {
    const items = [
      { group: 'mandats', key: 'm1', score: 0 },
      { group: 'mandats', key: 'm2', score: 2 },
      { group: 'concurrents', key: 'c1', score: 0 },
      { group: 'concurrents', key: 'c2', score: 4 },
    ];
    expect(
      orderWithinGroups(
        items,
        (item) => item.group,
        (item) => item.score,
      ).map((item) => item.key),
    ).toEqual(['m2', 'm1', 'c2', 'c1']);
  });
});

describe('le bandeau (planches 4 et 4 b)', () => {
  it('dit comment les biens sont rangés, et pourquoi le classement est simplifié', async () => {
    const { softBanner } = await import('@/features/soft-ranking/components/soft-why');
    const labels = ['au calme', 'une vue'];
    expect(softBanner({ mode: 'full' }, labels).text).toBe(
      ' — au calme, une vue —, puis par ressemblance, puis par prix. Aucun bien n’est écarté pour ces critères.',
    );
    expect(softBanner({ mode: 'simple', reason: 'before' }, labels).text).toContain(
      'jusqu’à la recherche du marché',
    );
    expect(softBanner({ mode: 'simple', reason: 'budget' }, labels).text).toBe(
      '\u00a0: forfait du mois atteint.',
    );
    expect(softBanner({ mode: 'simple', reason: 'closed' }, labels)).toEqual({
      strong: 'Classement simplifié',
      text: '',
    });
  });
});

// Jean-Guy, 12/11 : une citation qui contient une adresse n'est pas enregistrée ; le jugement reste.
describe('une citation qui cite une adresse', () => {
  const withAddress: RankingListing = {
    key: 'https://x.fr/adresse',
    text: 'Au calme, 12 rue des Lilas, sans aucun vis-à-vis. Le bien est au 8 bis avenue de la Gare.',
    tags: [],
  };

  it('n’est pas gardée : le jugement reste, sans sa citation', () => {
    const judged = guardJudgments(
      {
        annonces: [
          {
            id: 'a1',
            jugements: [
              {
                critere: 'calme',
                verdict: 'clairement',
                citation: 'Au calme, 12 rue des Lilas',
                contre_citation: null,
                a_verifier: false,
              },
              {
                critere: 'sans_vis_a_vis',
                verdict: 'reserve',
                citation: 'sans aucun vis-à-vis',
                contre_citation: 'au 8 bis avenue de la Gare',
                a_verifier: false,
              },
            ],
          },
        ],
      },
      new Map([['a1', withAddress]]),
      ['calme', 'sans_vis_a_vis'],
    );
    const [calme, vis] = judged.get(withAddress.key)!;
    expect(calme).toMatchObject({ verdict: 'clearly', quote: null });
    expect(vis).toMatchObject({
      verdict: 'reserve',
      quote: 'sans aucun vis-à-vis',
      counterQuote: null,
    });
    expect(JSON.stringify(judged.get(withAddress.key))).not.toMatch(/Lilas|avenue de la Gare/);
    expect(whyRows([calme!])[0]!.text).toBe('l’annonce le dit (citation non gardée)');
  });

  it('reconnaît une adresse, pas une surface ni une route sans numéro', () => {
    expect(citesAnAddress('12 rue des Lilas')).toBe(true);
    expect(citesAnAddress('au 8 bis, avenue de la Gare')).toBe(true);
    expect(citesAnAddress('4 chemin des Restanques Hautes')).toBe(true);
    expect(citesAnAddress('Maison de 130 m² sur 800 m²')).toBe(false);
    expect(citesAnAddress('à deux pas de la route départementale')).toBe(false);
    expect(citesAnAddress('à 5 min de la route')).toBe(false);
    expect(citesAnAddress('3 chambres, garage')).toBe(false);
  });
});

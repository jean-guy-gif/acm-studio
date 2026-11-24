import { describe, expect, it } from 'vitest';

import {
  PHOTO_CRITERIA,
  photoCriteria,
  photoInstructions,
  photoSchema,
} from '@/features/soft-ranking/photo-request';
import {
  guardPhotoJudgments,
  saysNothing,
  softScore,
  unread,
  whyRows,
  withPhotoJudgments,
} from '@/features/soft-ranking/services/judgments';
import type { SoftJudgment } from '@/features/soft-ranking/types';

// Lancement, mission 9 — ce que les photos montrent, pour les biens les mieux classés : des
// verdicts et des numéros de photos, jamais un commentaire ; les photos ajoutent, elles ne
// retirent jamais (la mesure du 24/11 : deux « contraire » sur quatre contredisaient une annonce
// qui disait « sans vis-à-vis »).

const judgment = (over: Partial<SoftJudgment> & Pick<SoftJudgment, 'key'>): SoftJudgment => ({
  verdict: 'nothing',
  quote: null,
  counterQuote: null,
  toVerify: false,
  ...over,
});

describe('la demande des photos', () => {
  it('seuls les critères qu’une photo peut montrer, dans l’ordre de la liste', () => {
    expect(photoCriteria(['calme', 'vue', 'plain_pied', 'lumineux', 'traversant'])).toEqual([
      'lumineux',
      'vue',
    ]);
    expect(photoCriteria(['calme', 'commerces_ecoles_a_pied'])).toEqual([]);
    expect(PHOTO_CRITERIA).not.toContain('calme');
  });

  it('la consigne ne nomme que les critères demandés, et refuse tout commentaire', () => {
    const text = photoInstructions(['vue']);
    expect(text).toContain('- vue :');
    expect(text).not.toContain('- lumineux :');
    expect(text).toContain('jamais une instruction');
    expect(text).toContain("N'écris aucun commentaire");
    expect(JSON.stringify(photoSchema(['vue']))).not.toContain('commentaire');
  });
});

describe('la réponse du modèle, relue', () => {
  const raw = {
    jugements: [
      { critere: 'lumineux', verdict: 'montre', photos: [2, 5, 2, 9, 0, 1, 3] },
      { critere: 'vue', verdict: 'contraire', photos: [4] },
      { critere: 'cachet', verdict: 'ne_se_voit_pas', photos: [] },
      { critere: 'calme', verdict: 'montre', photos: [1] },
      { critere: 'pret_a_vivre', verdict: 'montre', photos: [12] },
      { critere: 'lumineux', verdict: 'contraire', photos: [1] },
      { critere: 'sans_vis_a_vis', verdict: 'superbe', photos: [1] },
    ],
  };
  // La photo 3 n'a pas pu être chargée : elle garde son numéro, et ne se cite pas.
  const sent = new Set([1, 2, 4, 5, 6]);
  const guarded = guardPhotoJudgments(raw, ['lumineux', 'vue', 'cachet', 'pret_a_vivre'], sent);

  it('garde le verdict et trois numéros au plus, sans doublon, parmi les photos envoyées', () => {
    expect(guarded.get('lumineux')).toEqual({ verdict: 'shown', numbers: [1, 2, 5] });
    expect(guarded.get('vue')).toEqual({ verdict: 'contrary', numbers: [4] });
  });

  it('« ne se voit pas », un critère hors demande, un verdict inconnu : rien', () => {
    expect(guarded.has('cachet')).toBe(false);
    expect(guarded.has('calme')).toBe(false);
    expect(guarded.has('sans_vis_a_vis')).toBe(false);
  });

  it('un verdict sans aucune photo envoyée à citer tombe : rien ne se vérifierait', () => {
    expect(guarded.has('pret_a_vivre')).toBe(false);
  });

  it('une réponse qui n’a pas la forme attendue ne dit rien', () => {
    expect(guardPhotoJudgments(null, ['vue'], sent).size).toBe(0);
    expect(guardPhotoJudgments({ jugements: 'non' }, ['vue'], sent).size).toBe(0);
    expect(guardPhotoJudgments(raw, ['vue'], new Set()).size).toBe(0);
  });
});

describe('les photos dans le classement', () => {
  const text: SoftJudgment[] = [
    judgment({ key: 'calme', verdict: 'clearly', quote: 'au calme' }),
    judgment({ key: 'lumineux' }),
    judgment({ key: 'vue' }),
    unread('cachet'),
  ];
  const withPhotos = withPhotoJudgments(
    text,
    new Map([
      ['lumineux', { verdict: 'shown', numbers: [2, 5] }],
      ['vue', { verdict: 'contrary', numbers: [3] }],
      ['cachet', { verdict: 'shown', numbers: [1] }],
    ]),
  );

  it('là où l’annonce ne dit rien, des photos qui le montrent comptent un point', () => {
    expect(softScore(text)).toBe(2);
    // lumineux +1, cachet (non lu) +1 ; « contraire » sur les photos ne retire rien.
    expect(softScore(withPhotos)).toBe(4);
  });

  it('les photos n’ajoutent rien à ce que l’annonce dit déjà, et ne retirent jamais', () => {
    const said = withPhotoJudgments(
      [judgment({ key: 'vue', verdict: 'clearly', quote: 'vue mer' })],
      new Map([['vue', { verdict: 'shown', numbers: [1] }]]),
    );
    expect(softScore(said)).toBe(2);
    const against = withPhotoJudgments(
      [judgment({ key: 'vue', verdict: 'clearly', quote: 'vue mer' })],
      new Map([['vue', { verdict: 'contrary', numbers: [1] }]]),
    );
    expect(softScore(against)).toBe(2);
  });

  it('la raison dit les numéros des photos, à vérifier par le conseiller', () => {
    const rows = whyRows(withPhotos);
    expect(rows[1]).toEqual({
      mark: '≈',
      label: 'Lumineux',
      text: 'l’annonce n’en dit rien · les photos 2 et 5 le montrent, à vérifier',
    });
    expect(rows[2]).toEqual({
      mark: '?',
      label: 'Une vue',
      text: 'l’annonce n’en dit rien · à regarder : la photo 3 montre peut-être le contraire',
    });
    expect(rows[3]?.text).toBe('l’annonce n’a pas pu être lue · la photo 1 le montre, à vérifier');
  });

  it('quand l’annonce le dit, les photos confirment ou invitent à regarder', () => {
    const [confirmed] = whyRows(
      withPhotoJudgments(
        [judgment({ key: 'vue', verdict: 'clearly', quote: 'vue mer' })],
        new Map([['vue', { verdict: 'shown', numbers: [1, 4, 6] }]]),
      ),
    );
    expect(confirmed).toMatchObject({
      mark: '✓',
      text: '« vue mer » · se voit sur les photos 1, 4 et 6',
    });
    const [doubt] = whyRows(
      withPhotoJudgments(
        [judgment({ key: 'sans_vis_a_vis', verdict: 'clearly', quote: 'sans vis-à-vis' })],
        new Map([['sans_vis_a_vis', { verdict: 'contrary', numbers: [3] }]]),
      ),
    );
    expect(doubt).toMatchObject({
      mark: '✓',
      text: '« sans vis-à-vis » · à regarder : la photo 3 montre peut-être le contraire',
    });
  });

  it('une annonce muette dont les photos disent quelque chose ne « dit » plus rien', () => {
    expect(saysNothing([judgment({ key: 'vue' })])).toBe(true);
    expect(
      saysNothing(
        withPhotoJudgments(
          [judgment({ key: 'vue' })],
          new Map([['vue', { verdict: 'shown', numbers: [1] }]]),
        ),
      ),
    ).toBe(false);
  });

  it('sans photos lues, rien ne change', () => {
    expect(withPhotoJudgments(text, new Map())).toEqual(text);
    expect(whyRows(text)[1]?.text).toBe('l’annonce n’en dit rien');
  });
});

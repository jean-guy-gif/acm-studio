import { describe, expect, it } from 'vitest';

import {
  CURRENT_PRICES_NOTE,
  buildSellerSaid,
  guessLines,
  priceDropsLabel,
  priceDropsSinceMeeting,
  summarizeGuesses,
  type GuessedCompetitor,
  type SellerSaidInput,
} from '@/features/meeting-conclusion/services/seller-said';
import { guessGap } from '@/features/live-seller/services/guess-gap';

// Les espaces de `formatEuro` (fine insécable des milliers, insécable avant « € ») ramenées à
// des espaces simples, pour lire les attentes.
const plain = (text: string): string => text.replace(/[  ]/g, ' ');

const guessed = (guess: number | null, revealedPrice: number | null): GuessedCompetitor => ({
  guess,
  revealedPrice,
  currentPrice: revealedPrice,
});

const NOTHING: SellerSaidInput = {
  sellerPerceivedPrice: null,
  sellerRevisedPrice: null,
  commercializationPrice: null,
  competitors: [],
  dangerous: null,
  launchReadinessFirst: null,
  launchReadinessLast: null,
  launchReadinessMissing: null,
  liveDuration: null,
};

describe('les devinettes face aux prix réels', () => {
  it('« sous-estimé 4 concurrents sur 6, de 6 % en moyenne »', () => {
    const summary = summarizeGuesses([
      // Mission 148 — l'écart se mesure en % du prix affiché.
      guessed(96_000, 100_000), // 4 % en dessous du prix affiché : sous-estimé
      guessed(94_000, 100_000), // 6 %
      guessed(376_000, 400_000), // 6 %
      guessed(184_000, 200_000), // 8 %
      guessed(309_000, 300_000), // 3 % au-dessus : surestimé
      guessed(250_000, 250_000), // juste
    ]);
    expect(summary).toMatchObject({ compared: 6, under: 4, over: 1, usesCurrentPrices: false });
    expect(summary?.underAveragePercent).toBeCloseTo(6, 10);
    expect(summary?.overAveragePercent).toBeCloseTo(3, 10);
    expect(guessLines(summary!).map(plain)).toEqual([
      'Il a sous-estimé 4 concurrents sur 6, de 6 % en moyenne',
      'Il a surestimé 1 concurrent sur 6, de 3 % en moyenne',
    ]);
  });

  it('l’écart est exactement celui du Live : même calcul, même arrondi', () => {
    // Mission 148 — 280 000 deviné pour 300 000 affiché : le Live dit « 6,7 % en dessous du prix
    // affiché » (en % du prix affiché ; M96 disait 7,1 %, en % de la devinette).
    const live = guessGap(280_000, 300_000)!;
    expect(Math.round(Math.abs(live.percent) * 10) / 10).toBe(6.7);
    const summary = summarizeGuesses([guessed(280_000, 300_000)]);
    expect(summary?.underAveragePercent).toBe(6.7);
    expect(guessLines(summary!).map(plain)).toEqual([
      'Il a sous-estimé 1 concurrent sur 1, de 6,7 % en moyenne',
    ]);
  });

  it('une devinette à 0 € n’a pas d’écart en % dans le Live : elle ne compte pas', () => {
    expect(summarizeGuesses([guessed(0, 300_000)])).toBeNull();
  });

  it('un concurrent sans devinette (écarté par « non ») ou sans prix ne compte pas', () => {
    const summary = summarizeGuesses([
      guessed(280_000, 300_000),
      guessed(null, 300_000),
      { guess: 250_000, revealedPrice: null, currentPrice: null },
    ]);
    expect(summary).toMatchObject({ compared: 1, under: 1, over: 0 });
  });

  it('aucune devinette : aucun résumé, donc aucune phrase', () => {
    expect(summarizeGuesses([])).toBeNull();
    expect(summarizeGuesses([guessed(null, 300_000)])).toBeNull();
  });

  it('toutes les devinettes justes : une phrase, sans pourcentage inventé', () => {
    const summary = summarizeGuesses([guessed(300_000, 300_000), guessed(200_000, 200_000)]);
    expect(guessLines(summary!)).toEqual(['Il a donné le prix affiché de 2 concurrents']);
  });

  it('le prix révélé figé l’emporte sur le prix actuel', () => {
    // Révélé à 300 000, baissé depuis à 280 000 : la devinette de 290 000 était SOUS le prix vu.
    const summary = summarizeGuesses([
      { guess: 290_000, revealedPrice: 300_000, currentPrice: 280_000 },
    ]);
    expect(summary).toMatchObject({ under: 1, over: 0, usesCurrentPrices: false });
  });

  it('Live d’avant la mission : comparé au prix actuel, et l’écran le dit', () => {
    const said = buildSellerSaid({
      ...NOTHING,
      competitors: [{ guess: 290_000, revealedPrice: null, currentPrice: 300_000 }],
    });
    expect(said?.guessesNote).toBe(CURRENT_PRICES_NOTE);
    expect(CURRENT_PRICES_NOTE).toBe('face aux prix affichés aujourd’hui');
  });

  it('prix révélés figés : aucune mention', () => {
    const said = buildSellerSaid({ ...NOTHING, competitors: [guessed(290_000, 300_000)] });
    expect(said?.guessesNote).toBeNull();
  });
});

describe('« Depuis le rendez-vous : N concurrents ont baissé leur prix »', () => {
  it('compare le prix révélé au prix actuel', () => {
    const competitors: GuessedCompetitor[] = [
      { guess: 1, revealedPrice: 300_000, currentPrice: 290_000 },
      { guess: 1, revealedPrice: 300_000, currentPrice: 300_000 },
      { guess: 1, revealedPrice: 300_000, currentPrice: 310_000 },
      { guess: 1, revealedPrice: 250_000, currentPrice: 240_000 },
    ];
    expect(priceDropsSinceMeeting(competitors)).toBe(2);
    expect(priceDropsLabel(2)).toBe(
      'Depuis le rendez-vous\u00a0: 2 concurrents ont baissé leur prix',
    );
    expect(priceDropsLabel(1)).toBe('Depuis le rendez-vous\u00a0: 1 concurrent a baissé son prix');
  });

  it('sans prix révélé figé, on ne sait pas : rien ne compte et rien ne s’affiche', () => {
    expect(priceDropsSinceMeeting([{ guess: 1, revealedPrice: null, currentPrice: 200_000 }])).toBe(
      0,
    );
    expect(priceDropsLabel(0)).toBeNull();
    expect(buildSellerSaid({ ...NOTHING, sellerPerceivedPrice: 1 })?.priceDrops).toBeNull();
  });
});

describe('le bloc n’affiche que des données existantes', () => {
  it('rien de dit : pas de bloc', () => {
    expect(buildSellerSaid(NOTHING)).toBeNull();
  });

  it('tout est connu : chaque ligne vient d’une réponse', () => {
    const said = buildSellerSaid({
      sellerPerceivedPrice: 350_000,
      sellerRevisedPrice: 325_000,
      commercializationPrice: 330_000,
      competitors: [{ guess: 282_000, revealedPrice: 300_000, currentPrice: 295_000 }],
      dangerous: {
        label: 'Appartement · 3 pièces · 68 m² · Antibes',
        revealedPrice: 300_000,
        currentPrice: 295_000,
      },
      launchReadinessFirst: 7,
      launchReadinessLast: 10,
      launchReadinessMissing: ' Un avis de mon notaire ',
      liveDuration: 'Durée du Live\u00a0: 41 min',
    });
    expect(said?.path.map((step) => `${step.label}\u00a0: ${plain(step.value)}`)).toEqual([
      'Au début\u00a0: 350 000 €',
      'Après avoir vu le marché\u00a0: 325 000 €',
      'Prix retenu\u00a0: 330 000 €',
    ]);
    expect(said?.guesses).toHaveLength(1);
    // Le prix du concurrent le plus dangereux est celui qui a été RÉVÉLÉ, pas celui d'aujourd'hui.
    expect(plain(said!.dangerous!)).toBe('Appartement · 3 pièces · 68 m² · Antibes — 300 000 €');
    expect(said?.readiness).toBe('7/10 → 10/10');
    expect(said?.readinessMissing).toBe('Un avis de mon notaire');
    expect(said?.liveDuration).toBe('Durée du Live\u00a0: 41 min');
    expect(said?.priceDrops).toBe('Depuis le rendez-vous\u00a0: 1 concurrent a baissé son prix');
  });

  it('une donnée absente n’a pas de ligne', () => {
    const said = buildSellerSaid({ ...NOTHING, sellerPerceivedPrice: 350_000 });
    expect(said).toEqual({
      path: [{ label: 'Au début', value: expect.any(String) }],
      guesses: [],
      guessesNote: null,
      dangerous: null,
      readiness: null,
      readinessMissing: null,
      liveDuration: null,
      buyersShown: null,
      priceDrops: null,
    });
  });

  // Mission 133 — les acquéreurs prêts montrés pendant le Live, côté conseiller.
  it('les acquéreurs montrés au rendez-vous, seulement s’ils l’ont été', () => {
    const said = buildSellerSaid({ ...NOTHING, buyersShownCount: 7 });
    expect(said?.buyersShown).toBe('7 acquéreurs montrés au rendez-vous');
    expect(buildSellerSaid({ ...NOTHING, buyersShownCount: null })).toBeNull();
  });

  it('le vendeur a passé l’écran du prix reformulé : le chemin saute cette étape', () => {
    const said = buildSellerSaid({
      ...NOTHING,
      sellerPerceivedPrice: 350_000,
      commercializationPrice: 330_000,
    });
    expect(said?.path.map((step) => step.label)).toEqual(['Au début', 'Prix retenu']);
  });

  it('concurrent le plus dangereux d’un Live d’avant : prix d’aujourd’hui, et c’est dit', () => {
    const said = buildSellerSaid({
      ...NOTHING,
      dangerous: { label: 'Maison · 5 pièces · Vence', revealedPrice: null, currentPrice: 610_000 },
    });
    expect(plain(said!.dangerous!)).toBe(
      'Maison · 5 pièces · Vence — 610 000 € (prix affiché aujourd’hui)',
    );
  });
});

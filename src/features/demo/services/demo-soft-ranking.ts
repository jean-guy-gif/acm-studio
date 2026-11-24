import type { BuyerSoftCriterionKey } from '@/features/buyers/types';
import { SOFT_WORDS } from '@/features/soft-ranking/services/judgments';
import type { RankingListing } from '@/features/soft-ranking/types';

// Mission 151 (partie B) — la lecture simulée du classement dans l'agence de démonstration (M114) :
// aucun appel ; une réponse de la forme de celle du modèle, tirée des textes inventés du jeu de
// données, qui passe ensuite par la MÊME vérification des citations (`guardJudgments`). Une
// proposition qui dit le critère : « clairement » ; nuancée par une route, une gare ou un
// boulevard dans une autre proposition : « avec réserve » ; un contraire connu : « le contraire ».
// Pur.

const CONTRARY: Partial<Record<BuyerSoftCriterionKey, RegExp>> = {
  cachet: /contemporaine|récente|construction de 20\d\d/i,
  pret_a_vivre: /à rafraîchir|travaux à prévoir|à rénover/i,
  calme: /passante|bruyante/i,
};
const NUANCE = /route|gare|boulevard|voie rapide|tramway/i;

const clauses = (text: string): string[] =>
  text
    .split(/[.;]\s*|,\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

const fold = (value: string): string =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, "'");

export function demoRankingAnswer(
  batch: readonly { id: string; listing: RankingListing }[],
  criteria: readonly BuyerSoftCriterionKey[],
): unknown {
  return {
    annonces: batch.map(({ id, listing }) => {
      const parts = clauses(listing.text);
      return {
        id,
        jugements: criteria.map((critere) => {
          const contrary = CONTRARY[critere];
          const against = contrary ? parts.find((part) => contrary.test(part)) : undefined;
          if (against) {
            return {
              critere,
              verdict: 'contraire',
              citation: against,
              contre_citation: null,
              a_verifier: false,
            };
          }
          const said = parts.find((part) =>
            SOFT_WORDS[critere].some((word) => fold(part).includes(fold(word))),
          );
          if (!said) {
            return {
              critere,
              verdict: 'rien',
              citation: null,
              contre_citation: null,
              a_verifier: false,
            };
          }
          const nuance = parts.find((part) => part !== said && NUANCE.test(part));
          return nuance && critere === 'calme'
            ? {
                critere,
                verdict: 'reserve',
                citation: said,
                contre_citation: nuance,
                a_verifier: false,
              }
            : {
                critere,
                verdict: 'clairement',
                citation: said,
                contre_citation: null,
                a_verifier: false,
              };
        }),
      };
    }),
  };
}

// Lancement, mission 9 — les photos simulées d'une annonce de démonstration : aucune photo n'est
// chargée ni envoyée. Une réponse de la forme de celle du modèle, déterministe, relue par la MÊME
// vérification (`guardPhotoJudgments`) : ce que le texte dit se voit sur la première photo ; ce
// qu'il ne dit pas se voit une fois sur deux, sur les deux premières. Pur.
export function demoPhotoAnswer(
  listing: RankingListing,
  criteria: readonly BuyerSoftCriterionKey[],
  photoCount: number,
): unknown {
  const text = fold(listing.text);
  return {
    jugements: criteria.map((critere, index) => {
      const said = SOFT_WORDS[critere].some((word) => text.includes(fold(word)));
      if (said) return { critere, verdict: 'montre', photos: [1] };
      return (listing.text.length + index) % 2 === 0
        ? { critere, verdict: 'montre', photos: photoCount > 1 ? [1, 2] : [1] }
        : { critere, verdict: 'ne_se_voit_pas', photos: [] };
    }),
  };
}

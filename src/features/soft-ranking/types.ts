import type { BuyerSoftCriterionKey } from '@/features/buyers/types';

// Mission 151 (partie B) — le classement des biens par ce qui compte pour eux (planches 4 et 4 b,
// validées par Jean-Guy le 10/11 et le 12/11), pour le conseiller seul pendant la bêta.

// Par critère et par bien : dit clairement, avec réserve, n'en dit rien, dit le contraire ; ou
// « non lu » (absent de la réponse du modèle, relancé une fois) — jamais lu comme « rien » (M98).
export type SoftVerdict = 'clearly' | 'reserve' | 'nothing' | 'contrary' | 'unread';

export type SoftJudgment = {
  key: BuyerSoftCriterionKey;
  verdict: SoftVerdict;
  // Les mots exacts de l'annonce, vérifiés mot pour mot (accents et espaces près) ; jamais le texte.
  quote: string | null;
  // « Avec réserve » : le passage qui nuance (la route, la gare).
  counterQuote: string | null;
  // Le calme dit par la seule étiquette du portail : « à vérifier ».
  toVerify: boolean;
  // Lancement, mission 9 — ce que montrent les photos, pour les biens les mieux classés seulement.
  photos?: PhotoJudgment;
};

// Ce que les photos d'une annonce montrent d'un critère : un verdict et les numéros des photos
// (ceux de la fiche complète du bien), jamais un commentaire du modèle. « Ne se voit pas » n'a
// pas de ligne : il n'ajoute rien.
export type PhotoJudgment = { verdict: 'shown' | 'contrary'; numbers: number[] };

// Le texte d'un bien, le temps du classement : jamais gardé, jamais renvoyé au navigateur.
export type RankingListing = { key: string; text: string; tags: string[] };

// Ce que l'écran reçoit pour un bien : les jugements, en mode complet ; les mots trouvés, en mode
// simplifié (« l'annonce mentionne « calme » »).
// Un bien sans texte ni étiquette n'a rien été lu : il ne « dit » rien, il n'a rien à lire (M98).
export type SoftReasons = { judgments: SoftJudgment[] } | { mentions: string[] } | { noText: true };

// Pourquoi le classement est simplifié (planche 4 b).
export type SimpleReason = 'before' | 'failed' | 'budget' | 'closed';

export type SoftRanking =
  | { mode: 'full'; byKey: Record<string, SoftJudgment[]> }
  | { mode: 'simple'; reason: SimpleReason; byKey: Record<string, string[]> };

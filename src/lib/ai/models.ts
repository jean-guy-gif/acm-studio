// Mission 151 — le modèle de lecture est un paramètre (`ACM_AI_MODEL`), décision de Jean-Guy du
// 12/11 : par défaut Claude Sonnet 4.6 par son profil « EU », appelé depuis l'Irlande, tant que les
// modèles 5.5 sont refusés au compte AWS ; le passage aux 5.5 se fait par ce seul paramètre, après
// la même mesure relancée sur eux (`missions/M151-essais/mesure.mjs`). Pur : ni réseau, ni secret.

export const AI_DEFAULT_MODEL = 'eu.anthropic.claude-sonnet-4-6';

// Un Claude de génération 4 passe par l'API Bedrock classique (`bedrock:InvokeModel`) ; un Claude
// 5.5 par `bedrock-mantle` (`missions/M151-etapes-aws.md`, étape 10).
export const isGeneration4 = (model: string): boolean => /claude-[a-z]+-4[-.]/.test(model);

// Les tarifs publics d'Anthropic, en dollars par million de jetons (entrée, sortie). Un modèle
// inconnu n'a pas de tarif : la lecture ne part pas plutôt que de partir sans plafond.
const PRICES: readonly (readonly [RegExp, readonly [number, number]])[] = [
  [/claude-sonnet-4-6/, [3, 15]],
  [/claude-haiku-4-5/, [1, 5]],
  [/claude-sonnet-5-5/, [2, 10]],
  [/claude-haiku-5-5/, [0.1, 0.5]],
];

export function modelPrice(model: string): readonly [number, number] | null {
  return PRICES.find(([pattern]) => pattern.test(model))?.[1] ?? null;
}

// Un profil géographique ou régional de Bedrock coûte 10 % de plus (doc « Claude in Amazon
// Bedrock », Regions). Le dollar est compté pour un euro (décision de Jean-Guy, 12/11 : prudent).
const REGIONAL_MARKUP = 1.1;
// 1 € = 100 centimes = 100 000 millièmes de centime.
const MILLICENTS_PER_EURO = 100_000;

export type TokenUsage = { input_tokens: number; output_tokens: number };

// Le coût réel d'un appel, en millièmes de centime, arrondi au-dessus.
export function costMillicents(model: string, usage: TokenUsage): number | null {
  const price = modelPrice(model);
  if (!price) return null;
  const [input, output] = price;
  const dollars =
    ((usage.input_tokens * input + usage.output_tokens * output) / 1e6) * REGIONAL_MARKUP;
  // Arrondi au-dessus, sans qu'une poussière de virgule flottante (11 000,000…2) ajoute une unité.
  return Math.ceil(dollars * MILLICENTS_PER_EURO - 1e-6);
}

// Le pire cas, réservé avant l'appel (M105) : l'entrée estimée large et toute la sortie permise,
// plus une marge. La trace garde le coût RÉEL, même s'il dépasse la réservation (décision de
// Jean-Guy, 12/11) : la marge rend ce dépassement rare.
export const RESERVATION_MARGIN = 1.25;
export function worstCaseMillicents(
  model: string,
  input: { estimatedInputTokens: number; maxOutputTokens: number },
): number | null {
  const cost = costMillicents(model, {
    input_tokens: Math.ceil(input.estimatedInputTokens * 1.5),
    output_tokens: input.maxOutputTokens,
  });
  return cost == null ? null : Math.ceil(cost * RESERVATION_MARGIN);
}

// La température au plus bas, là où le modèle l'accepte (décision de Jean-Guy, 12/11) : Claude 4
// (Sonnet 4.6, Haiku 4.5) l'accepte ; les modèles 5.5 refusent toute valeur autre que celle par
// défaut (400) : on ne l'envoie pas.
export function temperatureFor(model: string): number | undefined {
  return isGeneration4(model) ? 0 : undefined;
}

// L'effort : Haiku 4.5 ne le prend pas ; les autres modèles mesurés, si.
export function effortFor(model: string): 'medium' | undefined {
  return /claude-haiku-4-5/.test(model) ? undefined : 'medium';
}

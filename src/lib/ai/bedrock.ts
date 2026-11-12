import 'server-only';

import { AnthropicBedrock, AnthropicBedrockMantle } from '@anthropic-ai/bedrock-sdk';

import { AI_DEFAULT_MODEL, effortFor, isGeneration4, temperatureFor } from '@/lib/ai/models';

// Mission 151 — l'appel à Claude sur Amazon Bedrock, côté serveur seulement. La clé AWS est lue ici
// (`ACM_AWS_ACCESS_KEY_ID`, `ACM_AWS_SECRET_ACCESS_KEY`, `ACM_AWS_REGION`), jamais exposée ; le
// modèle se lit dans `ACM_AI_MODEL`, sinon le défaut (`models.ts`).
//
// RIEN DE CE QUI EST LU NE SORT D'ICI PAR UNE ERREUR : un échec devient une cause fixe, jamais le
// message du fournisseur, de `JSON.parse` ou du schéma (ils recopient la réponse, donc les notes du
// conseiller), et rien n'est journalisé ici. L'appelant décide de ce qu'il dit.

export type AiCallCause =
  | 'unconfigured' // la clé ou la région manque
  | 'unavailable' // le fournisseur refuse ou ne répond pas
  | 'refused' // le modèle refuse de lire (stop_reason « refusal »)
  | 'truncated' // la réponse a été coupée
  | 'invalid_output'; // la réponse n'est pas le JSON attendu

export type AiCallResult =
  | {
      ok: true;
      json: unknown;
      model: string;
      usage: { input_tokens: number; output_tokens: number };
    }
  | {
      ok: false;
      cause: AiCallCause;
      model: string;
      usage: { input_tokens: number; output_tokens: number } | null;
    };

export type AiContentBlock =
  | { type: 'text'; text: string }
  | {
      type: 'image';
      source: {
        type: 'base64';
        media_type: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
        data: string;
      };
    };

export function aiModel(): string {
  const configured = process.env.ACM_AI_MODEL?.trim();
  return configured ? configured : AI_DEFAULT_MODEL;
}

function credentials() {
  const accessKey = process.env.ACM_AWS_ACCESS_KEY_ID?.trim();
  const secret = process.env.ACM_AWS_SECRET_ACCESS_KEY?.trim();
  // Un point final s'est déjà glissé dans la région (11/11).
  const region = process.env.ACM_AWS_REGION?.trim().replace(/\.$/, '');
  return accessKey && secret && region ? { accessKey, secret, region } : null;
}

export function aiConfigured(): boolean {
  return credentials() != null;
}

export async function callStructured(input: {
  system: string;
  content: AiContentBlock[];
  schema: Record<string, unknown>;
  maxTokens: number;
  model?: string;
  // Le classement des annonces a un délai (planche 4 b) : au-delà, la lecture est abandonnée.
  timeoutMs?: number;
}): Promise<AiCallResult> {
  const model = input.model ?? aiModel();
  const keys = credentials();
  if (!keys) return { ok: false, cause: 'unconfigured', model, usage: null };

  const common = {
    awsAccessKey: keys.accessKey,
    awsRegion: keys.region,
    maxRetries: input.timeoutMs != null ? 0 : 1,
    timeout: input.timeoutMs ?? 90_000,
  };
  // Les deux clients ne nomment pas le secret de la même façon.
  const client = isGeneration4(model)
    ? new AnthropicBedrock({ ...common, awsSecretKey: keys.secret })
    : new AnthropicBedrockMantle({ ...common, awsSecretAccessKey: keys.secret });

  const temperature = temperatureFor(model);
  const effort = effortFor(model);
  let response;
  try {
    response = await client.messages.create({
      model,
      max_tokens: input.maxTokens,
      system: input.system,
      ...(temperature !== undefined ? { temperature } : {}),
      output_config: {
        ...(effort ? { effort } : {}),
        format: { type: 'json_schema', schema: input.schema },
      },
      messages: [{ role: 'user', content: input.content }],
    });
  } catch {
    return { ok: false, cause: 'unavailable', model, usage: null };
  }

  const usage = {
    input_tokens: response.usage?.input_tokens ?? 0,
    output_tokens: response.usage?.output_tokens ?? 0,
  };
  if (response.stop_reason === 'refusal') return { ok: false, cause: 'refused', model, usage };
  if (response.stop_reason === 'max_tokens') return { ok: false, cause: 'truncated', model, usage };
  const text = response.content.map((block) => (block.type === 'text' ? block.text : '')).join('');
  try {
    return { ok: true, json: JSON.parse(text), model, usage };
  } catch {
    return { ok: false, cause: 'invalid_output', model, usage };
  }
}

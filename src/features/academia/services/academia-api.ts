import 'server-only';

import { z } from 'zod';

import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';
import { academiaLivingHereUrl } from '@/lib/academia';

// Mission 157 — le client de l'API de Mon secteur (Academia), d'après le contrat v1 de Laurent
// (14/11) : de serveur à serveur seulement, la clé d'ACM dans l'en-tête, jamais vers le navigateur ni
// au journal. Seul le bien vendeur part : son adresse, son type, ses pièces, sa surface et une clé
// d'idempotence ; jamais un nom, un téléphone, un e-mail, le texte ou le lien d'une annonce
// (règle 1 du contrat). Chaque réponse est relue par une liste d'autorisation : ce qui n'est pas du
// contrat n'est jamais cru. Délai de 8 s, puis un seul nouvel essai sur un dépassement ou une 5xx,
// jamais sur une 4xx (M104) ; `429` : `Retry-After`, sans nouvel essai.

export const ACADEMIA_API_BASE = 'https://app.myacademia.ai/api/v1';
export const ACADEMIA_API_TIMEOUT_MS = 8_000;

export type AcademiaFetch = (input: string, init: RequestInit) => Promise<Response>;

// `detail` : ce qu'Academia a rendu (le statut HTTP, son code et son message d'erreur, ou les noms des
// champs d'une réponse hors contrat), pour le journal et pour Laurent ; jamais la clé ni une valeur
// de la réponse.
export type AcademiaFailure =
  | {
      ok: false;
      reason: 'unauthorized' | 'readonly' | 'forbidden' | 'not_found' | 'unavailable';
      detail?: string;
    }
  | { ok: false; reason: 'quota'; retryAfter?: number; detail?: string };

export type AcademiaPropertyType = 'appartement' | 'maison';
export type AcademiaPropertyFacts = {
  type: AcademiaPropertyType;
  pieces?: number;
  surface?: number;
};

export type AcademiaRequestState = 'en_cours' | 'pret' | 'erreur';

const ACADEMIA_ID = /^[A-Za-z0-9_-]{1,100}$/;
const requestReply = z.object({
  id: z.string().regex(ACADEMIA_ID),
  etat: z.enum(['en_cours', 'pret', 'erreur']),
});
const linkReply = z.object({ url: z.string(), expire_le: z.string() });

// Le type du bien dans le vocabulaire du contrat ; un autre type ne part pas (le bien sans type).
export function academiaPropertyType(value: string | null): AcademiaPropertyType | null {
  const type = normalizePropertyType(value);
  return type === 'apartment' ? 'appartement' : type === 'house' ? 'maison' : null;
}

// `status` 0 : aucune réponse (réseau, délai), `note` dit pourquoi.
type Raw = { status: number; json: unknown; headers: Headers; note?: string } | null;

async function send(
  fetchImpl: AcademiaFetch,
  key: string,
  method: 'GET' | 'POST',
  path: string,
  body: unknown,
  timeoutMs: number,
): Promise<Raw> {
  let last: Raw = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${ACADEMIA_API_BASE}${path}`, {
        method,
        headers: {
          authorization: `Bearer ${key}`,
          accept: 'application/json',
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
        cache: 'no-store',
      });
      const json = await response.json().catch(() => null);
      last = { status: response.status, json, headers: response.headers };
      if (response.status >= 500) continue;
      return last;
    } catch (error) {
      // Dépassement du délai ou réseau : un seul nouvel essai.
      const cause = (error as { cause?: { code?: unknown } })?.cause?.code;
      last = {
        status: 0,
        json: null,
        headers: new Headers(),
        note: controller.signal.aborted
          ? `aucune réponse en ${Math.round(timeoutMs / 1000)} s`
          : `réseau : ${error instanceof Error ? error.message : 'échec'}${typeof cause === 'string' ? ` (${cause})` : ''}`,
      };
    } finally {
      clearTimeout(timer);
    }
  }
  return last;
}

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, 160) : null;

// Ce qu'Academia a rendu, dit en une ligne : « HTTP 404 · route_inconnue · Route inconnue ».
export function academiaDetail(raw: Raw): string {
  if (!raw) return 'aucune réponse';
  if (raw.status === 0) return raw.note ?? 'aucune réponse';
  const body = (raw.json ?? {}) as Record<string, unknown>;
  const nested = (body.erreur ?? body.error) as unknown;
  const source = nested && typeof nested === 'object' ? (nested as Record<string, unknown>) : body;
  const parts = [
    `HTTP ${raw.status}`,
    text(source.code),
    text(source.message) ?? (typeof nested === 'string' ? text(nested) : null),
  ].filter((part): part is string => part != null);
  return parts.join(' · ');
}

// Une réponse qui n'a pas la forme du contrat : les noms de ses champs, jamais leurs valeurs.
function offContract(raw: NonNullable<Raw>): AcademiaFailure {
  const json = raw.json;
  const fields =
    json && typeof json === 'object' && !Array.isArray(json)
      ? Object.keys(json).slice(0, 12).join(', ')
      : json === null
        ? 'pas de JSON'
        : typeof json;
  return {
    ok: false,
    reason: 'unavailable',
    detail: `HTTP ${raw.status} · réponse hors contrat · champs : ${fields || 'aucun'}`,
  };
}

function failure(raw: Raw): AcademiaFailure {
  const detail = academiaDetail(raw);
  if (!raw) return { ok: false, reason: 'unavailable', detail };
  switch (raw.status) {
    case 401:
      return { ok: false, reason: 'unauthorized', detail };
    case 402:
      return { ok: false, reason: 'readonly', detail };
    case 403:
      return { ok: false, reason: 'forbidden', detail };
    case 404:
      return { ok: false, reason: 'not_found', detail };
    case 429: {
      const seconds = Number(raw.headers.get('retry-after'));
      return Number.isFinite(seconds) && seconds > 0
        ? { ok: false, reason: 'quota', retryAfter: seconds, detail }
        : { ok: false, reason: 'quota', detail };
    }
    default:
      return { ok: false, reason: 'unavailable', detail };
  }
}

// Les adresses proposées par Academia (une chaîne, ou `{ adresse }`), jamais devinées par ACM.
function propositions(json: unknown): string[] {
  const list = (json as { propositions?: unknown } | null)?.propositions;
  if (!Array.isArray(list)) return [];
  return list
    .map((entry) =>
      typeof entry === 'string'
        ? entry
        : typeof (entry as { adresse?: unknown })?.adresse === 'string'
          ? (entry as { adresse: string }).adresse
          : null,
    )
    .filter((entry): entry is string => !!entry && entry.trim().length >= 5)
    .map((entry) => entry.trim().slice(0, 300))
    .slice(0, 5);
}

export async function createAcademiaRequest(
  input: {
    key: string;
    adresse: string;
    bien: AcademiaPropertyFacts | null;
    idempotence: string;
  },
  fetchImpl: AcademiaFetch = fetch,
  timeoutMs: number = ACADEMIA_API_TIMEOUT_MS,
): Promise<
  | { ok: true; id: string; etat: AcademiaRequestState }
  | { ok: false; reason: 'ambiguous'; propositions: string[] }
  | AcademiaFailure
> {
  const body = {
    adresse: input.adresse,
    ...(input.bien ? { bien: input.bien } : {}),
    idempotence: input.idempotence,
  };
  const raw = await send(fetchImpl, input.key, 'POST', '/dossiers', body, timeoutMs);
  if (raw && (raw.status === 200 || raw.status === 202)) {
    const parsed = requestReply.safeParse(raw.json);
    return parsed.success
      ? { ok: true, id: parsed.data.id, etat: parsed.data.etat }
      : offContract(raw);
  }
  if (raw?.status === 422) {
    return { ok: false, reason: 'ambiguous', propositions: propositions(raw.json) };
  }
  return failure(raw);
}

export async function readAcademiaRequest(
  key: string,
  id: string,
  fetchImpl: AcademiaFetch = fetch,
  timeoutMs: number = ACADEMIA_API_TIMEOUT_MS,
): Promise<{ ok: true; etat: AcademiaRequestState } | AcademiaFailure> {
  if (!ACADEMIA_ID.test(id)) return { ok: false, reason: 'not_found' };
  const raw = await send(fetchImpl, key, 'GET', `/dossiers/${id}`, undefined, timeoutMs);
  if (raw?.status === 200) {
    const parsed = requestReply.safeParse(raw.json);
    return parsed.success ? { ok: true, etat: parsed.data.etat } : offContract(raw);
  }
  return failure(raw);
}

export async function createAcademiaClientLink(
  key: string,
  id: string,
  fetchImpl: AcademiaFetch = fetch,
  timeoutMs: number = ACADEMIA_API_TIMEOUT_MS,
): Promise<{ ok: true; url: string; expiresAt: string } | AcademiaFailure> {
  if (!ACADEMIA_ID.test(id)) return { ok: false, reason: 'not_found' };
  const raw = await send(
    fetchImpl,
    key,
    'POST',
    `/dossiers/${id}/liens-client`,
    { type: 'vivre-ici' },
    timeoutMs,
  );
  if (raw && (raw.status === 200 || raw.status === 201)) {
    const parsed = linkReply.safeParse(raw.json);
    const url = parsed.success ? academiaLivingHereUrl(parsed.data.url) : null;
    const expires = parsed.success ? new Date(parsed.data.expire_le) : null;
    if (!url || !expires || Number.isNaN(expires.getTime())) return offContract(raw);
    return { ok: true, url, expiresAt: expires.toISOString() };
  }
  return failure(raw);
}

import type { LocatorAvailability } from '@/features/competitor-locator/types';

// Mission 75 — pont vers le Localisateur Academia, une AUTRE extension que celle d'ACM Studio.
// La page lui parle directement par `chrome.runtime.sendMessage(id, …)` : c'est le Localisateur
// qui choisit les origines qu'il écoute (URL de travail et URL d'essai, pas localhost).
//
// Trois messages, et rien d'autre : ACM_PING, ACM_BIENS_PAR_URL, ACM_OUVRIR_BIEN. Ce module ne
// fait que transporter : ce qui revient est une donnée, revalidée avant tout usage.

const PING_TIMEOUT_MS = 1_500;
const QUERY_TIMEOUT_MS = 8_000;
const OPEN_TIMEOUT_MS = 8_000;
// Plafond du Localisateur par appel.
export const LOCATOR_MAX_URLS = 50;

type ChromeRuntime = {
  sendMessage?: (
    extensionId: string,
    message: unknown,
    callback: (response: unknown) => void,
  ) => void;
  lastError?: unknown;
};

// `process.env.NEXT_PUBLIC_…` doit être écrit en toutes lettres pour être inscrit dans le
// paquet du navigateur. Les identifiants viennent de l'environnement, jamais du code.
//
// Mission 106 — une LISTE, séparée par des virgules : le Localisateur du Store et celui du mode
// développeur (« fpnim…,bjoap… », le Store d'abord). Un identifiant malformé est ignoré ; une seule
// valeur, comme avant, marche toujours.
export function locatorExtensionIds(
  raw: string | undefined = process.env.NEXT_PUBLIC_LOCALISATEUR_ID,
): string[] {
  const ids = (raw ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => /^[a-p]{32}$/.test(value));
  return [...new Set(ids)];
}

// Mission 106 — le Localisateur qui a répondu, gardé pour l'onglet : les messages suivants vont
// à lui seul. Au premier besoin, ACM_PING part vers chaque identifiant, dans l'ordre de la liste.
const CHOSEN_KEY = 'acm-localisateur-id';
let chosenInMemory: string | null = null;

function rememberedId(ids: string[]): string | null {
  let value = chosenInMemory;
  try {
    value = value ?? globalThis.sessionStorage?.getItem(CHOSEN_KEY) ?? null;
  } catch {
    // Mémoire de l'onglet refusée : on garde ce qu'on a.
  }
  return value != null && ids.includes(value) ? value : null;
}

function remember(id: string | null): void {
  chosenInMemory = id;
  try {
    if (id) globalThis.sessionStorage?.setItem(CHOSEN_KEY, id);
    else globalThis.sessionStorage?.removeItem(CHOSEN_KEY);
  } catch {
    // Rien de plus à faire : la mémoire de la page suffit.
  }
}

// Pour les tests : l'onglet oublie le Localisateur choisi.
export function forgetChosenLocator(): void {
  remember(null);
}

// Le Localisateur à qui parler, et sa réponse au ping. Le gardé d'abord ; muet, il est oublié et
// la liste est reprise dans l'ordre. Aucun ne répond : null (Localisateur absent, M75).
async function resolveLocator(): Promise<{ id: string; ping: unknown } | null> {
  const ids = locatorExtensionIds();
  const kept = rememberedId(ids);
  const order = kept ? [kept, ...ids.filter((id) => id !== kept)] : ids;
  for (const id of order) {
    const ping = await sendTo(id, { type: 'ACM_PING' }, PING_TIMEOUT_MS);
    if (ping != null) {
      remember(id);
      return { id, ping };
    }
  }
  remember(null);
  return null;
}

async function send(message: Record<string, unknown>, timeoutMs: number): Promise<unknown> {
  const kept = rememberedId(locatorExtensionIds());
  const id = kept ?? (await resolveLocator())?.id ?? null;
  return id ? sendTo(id, message, timeoutMs) : null;
}

function sendTo(
  extensionId: string,
  message: Record<string, unknown>,
  timeoutMs: number,
): Promise<unknown> {
  return new Promise((resolve) => {
    const runtime = (globalThis as { chrome?: { runtime?: ChromeRuntime } }).chrome?.runtime;
    if (typeof runtime?.sendMessage !== 'function') {
      resolve(null);
      return;
    }
    let settled = false;
    const finish = (value: unknown) => {
      if (!settled) {
        settled = true;
        globalThis.clearTimeout(timer);
        resolve(value);
      }
    };
    const timer = globalThis.setTimeout(() => finish(null), timeoutMs);
    try {
      // Extension absente : Chrome renseigne `lastError` et appelle sans réponse.
      runtime.sendMessage(extensionId, message, (response) =>
        finish(runtime.lastError ? null : response),
      );
    } catch {
      finish(null);
    }
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

// Sans réponse, ou bêta terminée : `unavailable`. Le ping répond même partage éteint.
export function readPing(response: unknown): LocatorAvailability {
  const ping = asRecord(response);
  if (!ping || ping.ok !== true || ping.betaTerminee === true) {
    return 'unavailable';
  }
  return ping.partage === true ? 'ready' : 'sharing_off';
}

export async function pingLocator(): Promise<LocatorAvailability> {
  return readPing((await resolveLocator())?.ping ?? null);
}

export type LocatorPropertiesResult =
  | { ok: true; properties: Record<string, unknown> }
  | { ok: false; reason: 'sharing_off' | 'error' };

export function readProperties(response: unknown): LocatorPropertiesResult {
  const answer = asRecord(response);
  if (!answer) {
    return { ok: false, reason: 'error' };
  }
  if (answer.ok !== true) {
    return { ok: false, reason: answer.partage === false ? 'sharing_off' : 'error' };
  }
  const properties = asRecord(answer.biens);
  return properties ? { ok: true, properties } : { ok: false, reason: 'error' };
}

export async function fetchLocatorProperties(urls: string[]): Promise<LocatorPropertiesResult> {
  return readProperties(
    await send(
      { type: 'ACM_BIENS_PAR_URL', urls: urls.slice(0, LOCATOR_MAX_URLS) },
      QUERY_TIMEOUT_MS,
    ),
  );
}

// `message` : le texte renvoyé par le Localisateur (plafond de vues atteint, par exemple), à
// afficher tel quel. Absent : le Localisateur n'a rien dit.
export type LocatorOpenResult =
  { ok: true } | { ok: false; reason: 'sharing_off' | 'refused'; message: string | null };

export function readOpen(response: unknown): LocatorOpenResult {
  const answer = asRecord(response);
  if (!answer) {
    return { ok: false, reason: 'refused', message: null };
  }
  if (answer.ok === true) {
    return { ok: true };
  }
  if (answer.partage === false) {
    return { ok: false, reason: 'sharing_off', message: null };
  }
  // Seul `message` est destiné au conseiller (plafond de vues, bien inconnu, demandes trop
  // rapprochées) ; `error` est un détail interne du Localisateur, jamais affiché.
  const message =
    typeof answer.message === 'string' && answer.message.trim() !== ''
      ? answer.message.trim().slice(0, 300)
      : null;
  return { ok: false, reason: 'refused', message };
}

export async function openLocatorProperty(url: string): Promise<LocatorOpenResult> {
  return readOpen(await send({ type: 'ACM_OUVRIR_BIEN', url }, OPEN_TIMEOUT_MS));
}

// Mission 104 — rouvrir un Live figé par erreur : ce que partagent l'action, la requête et l'écran.
export const REOPEN_REASON_MIN = 5;
export const REOPEN_REASON_MAX = 500;

export type ReopenLiveResult = { ok: true; responses: number } | { ok: false; error: string };

export type LiveReopening = { createdAt: string; operatorEmail: string; reason: string };

'use server';

import { z } from 'zod';

import { recordAppError } from '@/lib/app-errors/record';
import { getProfile } from '@/lib/auth/get-profile';

// Ce que le navigateur envoie n'est jamais cru : borné ici, nettoyé à l'écriture, et l'identité
// vient de la session, jamais de la charge.
const schema = z.object({
  source: z.enum(['browser', 'live']),
  page: z.string().max(2000),
  message: z.string().max(5000),
});

// Un navigateur en boucle ne remplit pas le journal : au plus 30 signalements par minute et par
// instance du serveur.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
let windowStart = 0;
let windowCount = 0;

function allowed(now: number): boolean {
  if (now - windowStart > WINDOW_MS) {
    windowStart = now;
    windowCount = 0;
  }
  windowCount += 1;
  return windowCount <= MAX_PER_WINDOW;
}

// Mission 100 — une erreur survenue dans le navigateur (page d'erreur, Live). Ne renvoie rien et
// ne lève jamais : l'écran qui signale n'a rien à en apprendre.
export async function reportClientError(input: unknown): Promise<void> {
  const parsed = schema.safeParse(input);
  if (!parsed.success || !allowed(Date.now())) return;
  let agencyId: string | null = null;
  let userId: string | null = null;
  try {
    const profile = await getProfile();
    agencyId = profile?.agency_id ?? null;
    userId = profile?.id ?? null;
  } catch {
    // Sans session lisible, l'erreur est enregistrée sans identité.
  }
  await recordAppError({
    source: parsed.data.source,
    page: parsed.data.page,
    error: parsed.data.message,
    agencyId,
    userId,
  });
}

import 'server-only';

import { checkAcademiaKey, type AcademiaFetch } from '@/features/academia/services/academia-api';
import type { AcademiaKeyStatus } from '@/features/academia/services/academia-key-status';

// Mission 161 — `GET /etat` pour chaque clé posée dans Vercel, à l'ouverture de `/erreurs` (les
// opérateurs seuls) ; une clé absente ne part pas. Délai court : 4 s par essai, deux essais au plus.
export async function readAcademiaKeys(
  env: Record<string, string | undefined> = process.env,
  fetchImpl: AcademiaFetch = fetch,
): Promise<{ agencies: AcademiaKeyStatus; demo: AcademiaKeyStatus }> {
  const check = async (value: string | undefined): Promise<AcademiaKeyStatus> => {
    const key = value?.trim();
    return key ? checkAcademiaKey(key, fetchImpl, 4_000) : 'missing';
  };
  const [agencies, demo] = await Promise.all([
    check(env.ACADEMIA_API_KEY),
    check(env.ACADEMIA_API_KEY_DEMO),
  ]);
  return { agencies, demo };
}

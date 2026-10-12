import 'server-only';

import { createServerClient } from '@supabase/ssr';

import { recordAppError } from '@/lib/app-errors/record';
import { isFrameworkSignal } from '@/lib/app-errors/sanitize';
import { env } from '@/lib/env';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

type RequestInfo = { path: string; headers: Record<string, string | string[] | undefined> };
type RequestContext = { routeType: string };

function requestCookies(headers: RequestInfo['headers']): { name: string; value: string }[] {
  const raw = headers.cookie;
  const header = Array.isArray(raw) ? raw.join('; ') : (raw ?? '');
  return header
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.includes('='))
    .map((part) => {
      const separator = part.indexOf('=');
      const value = part.slice(separator + 1);
      try {
        return { name: part.slice(0, separator), value: decodeURIComponent(value) };
      } catch {
        return { name: part.slice(0, separator), value };
      }
    });
}

// Qui a fait la requête : le jeton de session est VÉRIFIÉ (signature, expiration), jamais cru
// sur parole. Sans session valide, l'erreur est enregistrée sans identité.
async function requestIdentity(
  headers: RequestInfo['headers'],
): Promise<{ agencyId: string | null; userId: string | null }> {
  try {
    const cookies = requestCookies(headers);
    const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
      cookies: { getAll: () => cookies, setAll: () => {} },
    });
    const { data } = await supabase.auth.getClaims();
    const userId = typeof data?.claims?.sub === 'string' ? data.claims.sub : null;
    if (userId == null) return { agencyId: null, userId: null };
    const { data: profile } = await createServiceRoleClient()
      .from('profiles')
      .select('agency_id')
      .eq('id', userId)
      .maybeSingle();
    return { agencyId: profile?.agency_id ?? null, userId };
  } catch {
    return { agencyId: null, userId: null };
  }
}

// Mission 100 — toute erreur que Next.js attrape côté serveur : rendu d'une page, action, route.
export async function recordRequestError(
  error: unknown,
  request: RequestInfo,
  context: RequestContext,
): Promise<void> {
  if (isFrameworkSignal(error)) return;
  const identity = await requestIdentity(request.headers);
  await recordAppError({
    source: 'server',
    page: request.path,
    error,
    scope: context.routeType === 'render' ? 'page' : context.routeType,
    ...identity,
  });
}

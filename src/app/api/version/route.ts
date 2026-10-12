import { deployedCommit } from '@/lib/version';

// Mission 100 — le commit que sert ce déploiement, et RIEN d'autre : ni date, ni environnement,
// ni configuration. Publique (liste d'autorisation de `public-paths.ts`) : c'est elle que
// `npm run verifier:production` interroge. Jamais mise en cache.
export const dynamic = 'force-dynamic';

export function GET(): Response {
  return Response.json({ commit: deployedCommit() }, { headers: { 'Cache-Control': 'no-store' } });
}

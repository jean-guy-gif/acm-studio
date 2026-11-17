import { notFound } from 'next/navigation';

import { academiaApiAccess } from '@/features/academia/services/academia-api-access';
import { ACADEMIA_API_BASE } from '@/features/academia/services/academia-api';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';
import { getProfile } from '@/lib/auth/get-profile';

// SONDE TEMPORAIRE, sur l'essai seulement (jamais dans main) : ce que renvoient les vues « bien » et
// « bien-client » de l'API d'essai d'Academia sur son dossier de démonstration fixe, données
// fictives. Réservée à l'agence de démonstration ; la clé ne quitte jamais le serveur.
export const dynamic = 'force-dynamic';

const ID = '0de30000-0000-4000-8000-000000000001';
const Q = 'type=maison&pieces=5&surface=135';
const PATHS = [
  `/dossiers/${ID}/bien?${Q}`,
  `/dossiers/${ID}/bien-client?${Q}`,
  `/dossiers/${ID}/bien?type=appartement&pieces=3&surface=68`,
];

export default async function SondeAcademia() {
  const profile = await getProfile();
  if (!profile || !(await isDemoAgency(profile.agency_id))) notFound();
  const access = academiaApiAccess(true);
  if (!access) return <pre>Pas de clé d’essai sur ce déploiement.</pre>;
  const results = [];
  for (const path of PATHS) {
    try {
      const response = await fetch(`${ACADEMIA_API_BASE}${path}`, {
        headers: { authorization: `Bearer ${access.key}`, accept: 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      });
      const text = await response.text();
      results.push({ path, status: response.status, body: text.slice(0, 60_000) });
    } catch (error) {
      results.push({ path, status: 0, body: error instanceof Error ? error.message : 'échec' });
    }
  }
  return (
    <main data-testid="sonde">
      {results.map((result) => (
        <section key={result.path} data-path={result.path} data-status={result.status}>
          <h2>
            {result.status} GET {result.path}
          </h2>
          <pre data-testid="sonde-body">{result.body}</pre>
        </section>
      ))}
    </main>
  );
}

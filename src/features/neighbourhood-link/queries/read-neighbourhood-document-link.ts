import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { buildQrCode } from '@/features/contact-card/services/qr-code';
import { readNeighbourhoodLink } from '@/features/neighbourhood-link/queries/read-neighbourhood-link';
import type { NeighbourhoodDocumentLink } from '@/features/neighbourhood-link/services/neighbourhood-link';
import type { Database } from '@/lib/supabase/database.types';

// Mission 157 B — le lien « Vivre ici » d'un document du vendeur (la synthèse, l'Étude de marché) :
// relu à chaque ouverture, avec son QR code pour l'impression.
export async function readNeighbourhoodDocumentLink(
  client: SupabaseClient<Database>,
  agencyId: string,
  projectId: string,
  now: Date = new Date(),
): Promise<NeighbourhoodDocumentLink | null> {
  const link = await readNeighbourhoodLink(client, agencyId, projectId, now);
  if (!link) return null;
  // L'agence de démonstration se reconnaît au serveur (M114), lue avec le client du document ; une
  // lecture en échec n'imprime pas l'adresse du lien (le QR code suffit).
  const agency = await client.from('agencies').select('is_demo').eq('id', agencyId).maybeSingle();
  const printAddress = !agency.error && agency.data?.is_demo === false;
  return { ...link, qr: buildQrCode(link.url), printAddress };
}

import 'server-only';

import type { createClient } from '@/lib/supabase/server';

type Client = Awaited<ReturnType<typeof createClient>>;

const UNIQUE_VIOLATION = '23505';

// Mission 102 — inscrire un bien sur la liste « Ne plus solliciter » : la clé de son adresse
// et l'identité de chacune de ses annonces, une ligne par clé. Une clé déjà inscrite est une
// demande tenue, pas une erreur. Rend faux dès qu'une écriture échoue vraiment.
export async function insertOppositions(
  supabase: Client,
  author: { agencyId: string; profileId: string },
  keys: { addressKey: string | null; listingKeys: string[] },
): Promise<boolean> {
  const rows = [
    ...(keys.addressKey != null ? [{ address_key: keys.addressKey }] : []),
    ...[...new Set(keys.listingKeys)].map((listingKey) => ({ listing_key: listingKey })),
  ];
  for (const row of rows) {
    const { error } = await supabase
      .from('prospecting_oppositions')
      .insert({ agency_id: author.agencyId, created_by: author.profileId, ...row });
    if (error && error.code !== UNIQUE_VIOLATION) {
      return false;
    }
  }
  return true;
}

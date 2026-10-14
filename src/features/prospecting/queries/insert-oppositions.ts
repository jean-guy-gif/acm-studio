import 'server-only';

import { reportServerError } from '@/lib/app-errors/report-server-error';
import type { createClient } from '@/lib/supabase/server';

type Client = Awaited<ReturnType<typeof createClient>>;

const UNIQUE_VIOLATION = '23505';

// Mission 102 — inscrire un bien sur la liste « Ne plus solliciter » : la clé de son adresse
// et l'identité de chacune de ses annonces, une ligne par clé. Une clé déjà inscrite est une
// demande tenue, pas une erreur. Rend faux dès qu'une écriture échoue vraiment.
// Mission 104 — et rend vrai seulement quand chaque clé est RELUE dans la liste de l'agence :
// l'écran ne dit « Inscrit » que sur une écriture confirmée en base. `communeUnverified` :
// inscrite à la main sans que le service des communes ait répondu.
export async function insertOppositions(
  supabase: Client,
  author: { agencyId: string; profileId: string },
  keys: { addressKey: string | null; listingKeys: string[]; communeUnverified?: boolean },
): Promise<boolean> {
  const listingKeys = [...new Set(keys.listingKeys)];
  const rows = [
    ...(keys.addressKey != null
      ? [
          {
            address_key: keys.addressKey,
            ...(keys.communeUnverified ? { commune_unverified: true } : {}),
          },
        ]
      : []),
    ...listingKeys.map((listingKey) => ({ listing_key: listingKey })),
  ];
  if (rows.length === 0) {
    return false;
  }
  for (const row of rows) {
    const { error } = await supabase
      .from('prospecting_oppositions')
      .insert({ agency_id: author.agencyId, created_by: author.profileId, ...row });
    if (error && error.code !== UNIQUE_VIOLATION) {
      // Mission 104 — un échec d'écriture entre au journal : il ne passe plus en silence.
      await reportServerError('insertOppositions', error);
      return false;
    }
  }

  // Relire : chaque clé doit être dans la liste de l'agence.
  const [byAddress, byListing] = await Promise.all([
    keys.addressKey != null
      ? supabase
          .from('prospecting_oppositions')
          .select('address_key')
          .eq('agency_id', author.agencyId)
          .eq('address_key', keys.addressKey)
      : Promise.resolve({ data: [], error: null }),
    listingKeys.length > 0
      ? supabase
          .from('prospecting_oppositions')
          .select('listing_key')
          .eq('agency_id', author.agencyId)
          .in('listing_key', listingKeys)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (byAddress.error || byListing.error) {
    await reportServerError('insertOppositions', byAddress.error ?? byListing.error);
    return false;
  }
  const addressFound = keys.addressKey == null || (byAddress.data ?? []).length > 0;
  const listingsFound = new Set(
    (byListing.data ?? []).map((row) => (row as { listing_key: string | null }).listing_key),
  );
  const confirmed = addressFound && listingKeys.every((key) => listingsFound.has(key));
  if (!confirmed) {
    await reportServerError(
      'insertOppositions',
      new Error('opposition écrite mais introuvable à la relecture'),
    );
  }
  return confirmed;
}

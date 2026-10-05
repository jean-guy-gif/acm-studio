'use server';

import { z } from 'zod';

import { placeCityKey } from '@/features/competitor-search/services/build-filtered-search-urls';
import { learnablePlaceId } from '@/features/competitor-search/services/learn-place-id';
import { loadSearchCriteria } from '@/features/competitor-search/queries/load-search-criteria';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

// Une recherche lue : l'adresse de l'onglet et les communes écrites sur ses cartes.
const readPageSchema = z.object({
  url: z.url().max(4000),
  cardCities: z.array(z.string().max(120).nullable()).max(200),
});
const inputSchema = z.array(readPageSchema).max(20);

export type RememberPortalPlacesInput = z.infer<typeof inputSchema>;
export type RememberPortalPlacesResult = { ok: true; learned: string[] } | { ok: false };

// MISSION 69 — « ACM s'en souviendra » : après une lecture, on relève l'identifiant de commune
// dans l'adresse de chaque onglet SeLoger / M&A / Green Acres, et on le garde SI les cartes
// confirment la commune du bien (learnablePlaceId). La commune vient du bien vendeur, côté
// serveur — jamais du client. Écriture par service role (aucune écriture directe permise sur
// portal_place_ids), après vérification du dossier dans l'agence du conseiller.
// Un échec ici ne bloque jamais la lecture : on le journalise, l'écran continue.
export async function rememberPortalPlaces(
  projectId: string,
  pages: RememberPortalPlacesInput,
): Promise<RememberPortalPlacesResult> {
  const parsed = inputSchema.safeParse(pages);
  if (!parsed.success) {
    return { ok: false };
  }
  const loaded = await loadSearchCriteria(projectId);
  if (!loaded.ok) {
    return { ok: false };
  }
  const { criteria, profileId } = loaded;
  const cityKey = placeCityKey(criteria.city, criteria.postalCode);
  if (cityKey == null) {
    return { ok: true, learned: [] }; // sans code postal, rien n'est appris (homonymes)
  }

  const candidates = parsed.data.flatMap((page) => {
    const found = learnablePlaceId(page.url, page.cardCities, criteria.city);
    return found == null
      ? []
      : [
          {
            portal: found.portal,
            city_key: cityKey,
            city_label: criteria.city,
            place_id: found.placeId,
            source_url: page.url,
            learned_by: profileId,
            updated_at: new Date().toISOString(),
          },
        ];
  });
  // Un seul identifiant par portail et par lecture (un upsert ne touche pas deux fois la même
  // ligne) ; deux onglets du même portail en désaccord n'apprennent rien.
  const rows = candidates.filter(
    (row) =>
      !candidates.some((other) => other.portal === row.portal && other.place_id !== row.place_id) &&
      candidates.find((other) => other.portal === row.portal) === row,
  );
  if (rows.length === 0) {
    return { ok: true, learned: [] };
  }

  try {
    const admin = createServiceRoleClient();
    const { error } = await admin
      .from('portal_place_ids')
      .upsert(rows, { onConflict: 'portal,city_key' });
    if (error) {
      console.error('[rememberPortalPlaces] écriture', error.message);
      return { ok: false };
    }
  } catch (error) {
    console.error('[rememberPortalPlaces]', error instanceof Error ? error.message : error);
    return { ok: false };
  }
  return { ok: true, learned: rows.map((row) => row.portal) };
}

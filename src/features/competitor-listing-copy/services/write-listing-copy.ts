import 'server-only';

import {
  buildListingCopy,
  type ListingCopySource,
} from '@/features/competitor-listing-copy/services/build-listing-copy';
import { extractListingKey } from '@/features/comparable-import/utils/extract-listing-key';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import type { Json } from '@/lib/supabase/database.types';

// Mission 152 (partie A) — écrit la copie de l'annonce d'un concurrent qui vient d'être créé, une
// fois : une seconde écriture (un import rejoué) ne change rien (`on conflict do nothing`), et la
// base refuse toute modification. Par la clé de service, APRÈS que l'appelant a créé le concurrent
// dans son dossier et son agence (la base le revérifie). Sans effet sur l'import : un échec part
// au journal et l'import continue.
export async function writeListingCopy(options: {
  agencyId: string;
  projectId: string;
  comparableId: string;
  listingUrl: string | null;
  origin: 'page' | 'search';
  row: ListingCopySource;
  capturedAt?: Date;
}): Promise<void> {
  const copy = buildListingCopy(options.row);
  if (!copy) return;
  const identity = options.listingUrl ? extractListingKey(options.listingUrl) : null;
  try {
    const { error } = await createServiceRoleClient()
      .from('competitor_listing_copies')
      .upsert(
        {
          agency_id: options.agencyId,
          project_id: options.projectId,
          comparable_id: options.comparableId,
          source: options.origin,
          ...(options.capturedAt ? { captured_at: options.capturedAt.toISOString() } : {}),
          portal: identity?.portal ?? null,
          listing_key: identity?.listingKey ?? null,
          price: copy.price,
          photo_urls: copy.photo_urls,
          facts: copy.facts as NonNullable<Json>,
        },
        { onConflict: 'comparable_id', ignoreDuplicates: true },
      );
    if (error) throw new Error(error.message);
  } catch (error) {
    await reportServerError('listing-copy', error);
  }
}

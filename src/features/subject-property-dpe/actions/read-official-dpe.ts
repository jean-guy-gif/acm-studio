'use server';

import { z } from 'zod';

import { getProject } from '@/features/projects/queries/get-project';
import { fetchOfficialDpe } from '@/features/subject-property-dpe/services/fetch-ademe-dpe';
import type { DpeReading } from '@/features/subject-property-dpe/types';

const requestSchema = z.object({
  address: z.string().max(300),
  postal_code: z.string().max(20),
  city: z.string().max(200),
  property_type: z.string().max(100),
  surface_area: z.string().max(20),
});

// MISSION 79 — lit le DPE officiel de l'adresse du bien vendeur. N'écrit rien : la fiche propose,
// le conseiller enregistre. projectId est lié côté serveur ; sans dossier lisible (non connecté,
// autre agence), rien n'est demandé à l'extérieur.
export async function readOfficialDpe(projectId: string, raw: unknown): Promise<DpeReading> {
  const request = requestSchema.safeParse(raw);
  if (!request.success || (await getProject(projectId)) == null) {
    return {};
  }
  return fetchOfficialDpe(request.data);
}

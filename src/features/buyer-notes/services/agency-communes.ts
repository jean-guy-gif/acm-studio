import 'server-only';

import type { GeoProvider } from '@/features/competitor-search/services/geo-provider';
import type { OfficialCommune } from '@/features/buyer-notes/services/verify-communes';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

// Mission 151 — la liste officielle des communes contre laquelle une commune lue se vérifie : celle
// des départements de l'agence, lus sur les codes postaux de ses biens vendeurs et sur son adresse
// postale, par la porte de la M114 (geo.api.gouv.fr pour une agence réelle, la table locale pour
// l'agence de démonstration). null : rien de lisible, ou le service n'a pas répondu — une panne
// n'est jamais lue comme « aucune commune » (M98) : les communes restent « non vérifiées ».

const MAX_DEPARTMENTS = 4;

// « 06140 » → « 06 » ; la Corse (20…) a deux départements ; l'outre-mer (97…) en a trois chiffres.
export function departmentsOfPostalCode(postalCode: string): string[] {
  const code = /\b(\d{5})\b/.exec(postalCode)?.[1];
  if (!code) return [];
  if (code.startsWith('20')) return ['2A', '2B'];
  if (code.startsWith('97') || code.startsWith('98')) return [code.slice(0, 3)];
  return [code.slice(0, 2)];
}

export async function agencyOfficialCommunes(
  agencyId: string,
  geo: GeoProvider,
): Promise<OfficialCommune[] | null> {
  const client = createServiceRoleClient();
  const [properties, branding] = await Promise.all([
    client.from('subject_properties').select('postal_code').eq('agency_id', agencyId).limit(500),
    client.from('agency_branding').select('postal_address').eq('agency_id', agencyId).maybeSingle(),
  ]);
  if (properties.error || branding.error) return null;

  const counts = new Map<string, number>();
  const postals = [
    ...(properties.data ?? []).map((row) => row.postal_code ?? ''),
    branding.data?.postal_address ?? '',
  ];
  for (const postal of postals) {
    for (const department of departmentsOfPostalCode(postal)) {
      counts.set(department, (counts.get(department) ?? 0) + 1);
    }
  }
  const departments = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_DEPARTMENTS)
    .map(([department]) => department);
  if (departments.length === 0) return null;

  const lists = await Promise.all(
    departments.map((department) => geo.fetchDepartmentCommunes(department)),
  );
  if (lists.some((list) => list == null)) return null;
  return lists.flatMap((list) =>
    (list ?? []).map((commune) => ({ nom: commune.nom, code: commune.code })),
  );
}

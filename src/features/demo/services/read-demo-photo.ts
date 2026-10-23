import 'server-only';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { demoPhotoFile } from '@/features/demo/services/demo-urls';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';

// Mission 114 — les octets d'une photo de démonstration, lus sur le disque de l'application
// (`public/demo/photos`, embarqué avec la route par `outputFileTracingIncludes`). Seulement pour
// une adresse qui est l'une de ces photos ET dans l'agence de démonstration ; sinon null, et
// l'appelant suit son chemin ordinaire. Le nom de fichier vient d'une forme stricte : aucun
// chemin ne remonte.
export async function readDemoPhoto(rawUrl: string, agencyId: string): Promise<Uint8Array | null> {
  const file = demoPhotoFile(rawUrl);
  if (!file || !(await isDemoAgency(agencyId))) return null;
  try {
    return new Uint8Array(await readFile(join(process.cwd(), 'public', 'demo', 'photos', file)));
  } catch {
    return null;
  }
}

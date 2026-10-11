import { PROPERTY_PHOTO_BUCKET } from '@/features/subject-property-photos/constants';

// Mission 87 — quand un concurrent (ou tout son dossier vendeur) est supprimé, son dossier de
// prospection part avec lui en base (cascade). Ses photos — la copie de la photo d'annonce,
// « Ma photo », et une photo importée jamais enregistrée — doivent partir aussi du stockage.
// On vide le DOSSIER de stockage du concurrent, lu sur place : on ne se fie pas aux chemins
// notés en base, qui viennent d'être effacés et ignorent les imports abandonnés.
//
// À appeler APRÈS la suppression en base : si elle échoue, les fichiers restent valables.
// Les chemins sont bâtis ici, sous le dossier de l'agence de l'appelant (1er segment, sur lequel
// portent les règles d'accès du stockage) : rien d'une autre agence ne peut être visé.

type StorageEntry = { name: string; id: string | null };

// Le strict nécessaire du stockage Supabase, pour pouvoir le remplacer en test.
export type PhotoStorage = {
  from(bucket: string): {
    list(
      path: string,
      options: { limit: number },
    ): Promise<{ data: StorageEntry[] | null; error: unknown }>;
    remove(paths: string[]): Promise<{ error: unknown }>;
  };
};

const LIST_LIMIT = 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function prospectingFolder(agencyId: string, projectId: string): string {
  return `${agencyId}/${projectId}/prospecting`;
}

async function emptyCompetitorFolder(
  storage: PhotoStorage,
  folder: string,
  competitorId: string,
): Promise<number> {
  const bucket = storage.from(PROPERTY_PHOTO_BUCKET);
  const { data, error } = await bucket.list(`${folder}/${competitorId}`, { limit: LIST_LIMIT });
  if (error || !data) {
    return 0;
  }
  // Un fichier a un identifiant ; un sous-dossier n'en a pas (il n'y en a pas ici).
  const paths = data
    .filter((entry) => entry.id != null)
    .map((entry) => `${folder}/${competitorId}/${entry.name}`);
  if (paths.length === 0) {
    return 0;
  }
  const removed = await bucket.remove(paths);
  return removed.error ? 0 : paths.length;
}

// Les photos des concurrents supprimés. Un identifiant qui n'en est pas un est ignoré.
export async function removeCompetitorPhotos(
  storage: PhotoStorage,
  agencyId: string,
  projectId: string,
  competitorIds: string[],
): Promise<number> {
  const folder = prospectingFolder(agencyId, projectId);
  let removed = 0;
  for (const competitorId of new Set(competitorIds.filter((id) => UUID.test(id)))) {
    removed += await emptyCompetitorFolder(storage, folder, competitorId);
  }
  return removed;
}

// Les photos de TOUS les concurrents d'un dossier vendeur supprimé.
export async function removeProjectCompetitorPhotos(
  storage: PhotoStorage,
  agencyId: string,
  projectId: string,
): Promise<number> {
  const folder = prospectingFolder(agencyId, projectId);
  const { data, error } = await storage
    .from(PROPERTY_PHOTO_BUCKET)
    .list(folder, { limit: LIST_LIMIT });
  if (error || !data) {
    return 0;
  }
  return removeCompetitorPhotos(
    storage,
    agencyId,
    projectId,
    data.map((entry) => entry.name),
  );
}

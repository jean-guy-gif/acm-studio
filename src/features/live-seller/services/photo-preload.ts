import type { LivePage } from '@/features/live-seller/services/build-live-pages';

// Mission 144 — les photos du Live, préchargées dès l'introduction (décision de Jean-Guy, 07/11) :
// seulement les adresses déjà livrées au navigateur (photos du bien, photos des concurrents dans
// leur forme neutre, M51, M107) — rien d'autre n'est demandé au serveur, aucun prix ne voyage.
// L'ordre suit le Live : d'abord la photo principale de chaque écran, dans l'ordre des écrans, puis
// les autres photos ; une adresse n'est demandée qu'une fois. Pur.
export type PreloadComparable = { id: string; photoUrl: string | null; photoUrls: string[] };

export function livePhotoPreloadUrls(
  pages: readonly LivePage[],
  propertyPhotoUrls: readonly string[],
  comparables: readonly PreloadComparable[],
): string[] {
  const photosOf = (page: LivePage): string[] => {
    if (page.type === 'subject_property') return [...propertyPhotoUrls];
    if (page.comparableId == null) return [];
    const comparable = comparables.find((candidate) => candidate.id === page.comparableId);
    if (!comparable) return [];
    return [comparable.photoUrl, ...comparable.photoUrls].filter(
      (url): url is string => typeof url === 'string' && url !== '',
    );
  };
  const seen = new Set<string>();
  const ordered: string[] = [];
  const add = (url: string | undefined) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    ordered.push(url);
  };
  for (const page of pages) add(photosOf(page)[0]);
  for (const page of pages) photosOf(page).forEach(add);
  return ordered;
}

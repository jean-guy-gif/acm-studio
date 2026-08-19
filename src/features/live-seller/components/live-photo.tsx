import { RemoteImage } from '@/components/ui/remote-image';

// Read-only photo display for a comparable. Large main photo + optional gallery,
// with a clean fallback when no accessible photo exists. No upload, no scraping.
// `compact` = vignette de carte (synthèse, conclusion) : hauteur réduite, pas de
// bande de galerie.
export function LivePhoto({
  photoUrl,
  photoUrls,
  alt,
  compact = false,
}: {
  photoUrl: string | null;
  photoUrls: string[];
  alt: string;
  compact?: boolean;
}) {
  if (!photoUrl) {
    return (
      <div
        className={`flex w-full items-center justify-center text-sm text-zinc-400 stage:text-white/40 ${
          compact
            ? 'h-40 border-b border-dashed border-zinc-200 bg-zinc-50 stage:border-white/10 stage:bg-white/5'
            : 'h-56 rounded-card border border-dashed border-zinc-300 sm:h-72 stage:border-white/20'
        }`}
      >
        Photos indisponibles pour cette annonce
      </div>
    );
  }
  const gallery = compact ? [] : photoUrls.filter((url) => url !== photoUrl).slice(0, 6);
  return (
    <div className="flex flex-col gap-3">
      <RemoteImage
        src={photoUrl}
        alt={alt}
        className={
          compact ? 'h-40 w-full object-cover' : 'h-56 w-full rounded-lg object-cover sm:h-80'
        }
        fallbackClassName={compact ? 'h-40 w-full' : 'h-56 w-full rounded-lg sm:h-80'}
        fallbackLabel="Photo indisponible pour cette annonce"
        eager
      />
      {gallery.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto">
          {gallery.map((url) => (
            <RemoteImage
              key={url}
              src={url}
              alt={alt}
              className="h-16 w-24 shrink-0 rounded object-cover sm:h-20 sm:w-28"
              fallbackClassName="h-16 w-24 shrink-0 rounded sm:h-20 sm:w-28"
              fallbackLabel="Indispo."
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

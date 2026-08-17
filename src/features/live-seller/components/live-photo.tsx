/* eslint-disable @next/next/no-img-element */
// Read-only photo display for a comparable. Large main photo + optional gallery,
// with a clean fallback when no accessible photo exists. No upload, no scraping.
export function LivePhoto({
  photoUrl,
  photoUrls,
  alt,
}: {
  photoUrl: string | null;
  photoUrls: string[];
  alt: string;
}) {
  if (!photoUrl) {
    return (
      <div className="flex h-56 w-full items-center justify-center rounded-card border border-dashed border-zinc-300 text-sm text-zinc-500 sm:h-72 dark:border-zinc-700">
        Photos indisponibles pour cette annonce
      </div>
    );
  }
  const gallery = photoUrls.filter((url) => url !== photoUrl).slice(0, 6);
  return (
    <div className="flex flex-col gap-3">
      <img
        src={photoUrl}
        alt={alt}
        className="h-56 w-full rounded-lg object-cover sm:h-80"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
      {gallery.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto">
          {gallery.map((url) => (
            <img
              key={url}
              src={url}
              alt={alt}
              className="h-16 w-24 shrink-0 rounded object-cover sm:h-20 sm:w-28"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

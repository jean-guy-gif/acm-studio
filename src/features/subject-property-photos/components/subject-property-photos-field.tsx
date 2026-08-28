'use client';

import { useRef, useState, useTransition } from 'react';

import { RemoteImage } from '@/components/ui/remote-image';
import { btnSecondary, hintText, softPanel } from '@/components/ui/styles';
import { MAX_PROPERTY_PHOTOS } from '@/features/subject-property-photos/constants';
import type { UpdatePropertyPhotosResult } from '@/features/subject-property-photos/actions/update-property-photos';
import type { UploadPropertyPhotosResult } from '@/features/subject-property-photos/actions/upload-property-photos';
import type { SignedPhoto } from '@/features/subject-property-photos/services/property-photo-storage';

// Real file upload for the seller's own property (drag-and-drop or file picker),
// thumbnails, removal and reordering — the same gesture as the competitor URL
// field, but with files. Each action goes to the server and the page re-renders
// with freshly signed URLs. No business logic here: the server validates,
// stores, signs and enforces every bound.
export function SubjectPropertyPhotosField({
  photos,
  uploadAction,
  updateAction,
}: {
  photos: SignedPhoto[];
  uploadAction: (formData: FormData) => Promise<UploadPropertyPhotosResult>;
  updateAction: (desiredPaths: string[]) => Promise<UpdatePropertyPhotosResult>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const paths = photos.map((photo) => photo.path);
  const full = photos.length >= MAX_PROPERTY_PHOTOS;

  const upload = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }
    const formData = new FormData();
    for (const file of Array.from(files)) {
      formData.append('photos', file);
    }
    setError(null);
    startTransition(async () => {
      const result = await uploadAction(formData);
      if (!result.ok) {
        setError(result.error);
      }
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    });
  };

  const update = (desired: string[]) => {
    setError(null);
    startTransition(async () => {
      const result = await updateAction(desired);
      if (!result.ok) {
        setError(result.error);
      }
    });
  };

  const remove = (path: string) => update(paths.filter((current) => current !== path));
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= paths.length) {
      return;
    }
    const next = [...paths];
    [next[index], next[target]] = [next[target], next[index]];
    update(next);
  };

  return (
    <div className="flex flex-col gap-3">
      {photos.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <li key={photo.path} className={`${softPanel} flex flex-col gap-2 p-2`}>
              <RemoteImage
                src={photo.url ?? ''}
                alt={`Photo ${index + 1} du bien vendeur`}
                className="h-28 w-full rounded-lg object-cover"
                fallbackClassName="h-28 w-full rounded-lg"
                fallbackLabel="Indispo."
              />
              <div className="flex items-center justify-between gap-1">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0 || pending}
                    className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-600 transition-colors hover:border-brand disabled:opacity-40 stage:border-white/15 stage:bg-white/5 stage:text-white/70 stage:hover:border-brand"
                    aria-label="Monter"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === photos.length - 1 || pending}
                    className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-600 transition-colors hover:border-brand disabled:opacity-40 stage:border-white/15 stage:bg-white/5 stage:text-white/70 stage:hover:border-brand"
                    aria-label="Descendre"
                  >
                    ↓
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => remove(photo.path)}
                  disabled={pending}
                  className="rounded-lg border border-red-200 bg-white px-2 py-1 text-sm text-red-600 transition-colors hover:border-red-400 disabled:opacity-40 stage:border-red-400/30 stage:bg-transparent stage:text-red-300"
                  aria-label="Supprimer"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className={hintText}>Aucune photo. Déposez des fichiers ou parcourez ci-dessous.</p>
      )}

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          if (!full) {
            upload(event.dataTransfer.files);
          }
        }}
        className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-5 text-center transition-colors ${
          dragOver ? 'border-brand bg-brand/5' : 'border-zinc-300 stage:border-white/15'
        }`}
      >
        <span className={hintText}>
          {full
            ? `Maximum ${MAX_PROPERTY_PHOTOS} photos atteint.`
            : 'Glissez vos photos ici (JPEG, PNG, WebP)'}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={full || pending}
          onChange={(event) => upload(event.target.files)}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={full || pending}
          className={`${btnSecondary} disabled:opacity-40`}
        >
          {pending ? 'Téléversement…' : 'Parcourir…'}
        </button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600 stage:text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}

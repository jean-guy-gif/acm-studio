'use client';

import { useState } from 'react';

import { RemoteImage } from '@/components/ui/remote-image';
import { btnSecondary, hintText, inputBase, softPanel } from '@/components/ui/styles';

// Manual photo-URL editor: one URL per row with a thumbnail preview, per-photo
// removal and reordering. Accepts pasting several URLs (newline / comma). Only
// http(s) URLs are kept and duplicates are dropped. The current list is mirrored
// into a hidden <input name> (newline-joined) for the server action. No upload.
function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function PhotoUrlsField({
  name,
  initialUrls,
  importedCount,
}: {
  name: string;
  initialUrls: string[];
  importedCount?: number;
}) {
  const [urls, setUrls] = useState<string[]>(() =>
    initialUrls.filter((url) => isHttpUrl(url)).filter((url, i, list) => list.indexOf(url) === i),
  );
  const [draft, setDraft] = useState('');

  const add = () => {
    const candidates = draft
      .split(/[\n,]+/)
      .map((value) => value.trim())
      .filter((value) => value !== '' && isHttpUrl(value));
    if (candidates.length === 0) {
      return;
    }
    setUrls((prev) => {
      const merged = [...prev];
      for (const url of candidates) {
        if (!merged.includes(url)) {
          merged.push(url);
        }
      }
      return merged.slice(0, 20);
    });
    setDraft('');
  };

  const remove = (index: number) => setUrls((prev) => prev.filter((_url, i) => i !== index));
  const move = (index: number, delta: number) =>
    setUrls((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) {
        return prev;
      }
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={urls.join('\n')} />
      {importedCount != null && importedCount > 0 ? (
        <span className={hintText}>{importedCount} photo(s) importée(s)</span>
      ) : null}

      {urls.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {urls.map((url, index) => (
            <li key={url} className={`${softPanel} flex items-center gap-2 p-2`}>
              <RemoteImage
                src={url}
                alt="Photo de l’annonce"
                className="h-12 w-16 shrink-0 rounded-lg object-cover"
                fallbackClassName="h-12 w-16 shrink-0 rounded-lg"
                fallbackLabel="Indispo."
              />
              <span className="min-w-0 flex-1 truncate text-xs text-zinc-500 stage:text-white/50">
                {url}
              </span>
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-600 transition-colors hover:border-brand disabled:opacity-40 stage:border-white/15 stage:bg-white/5 stage:text-white/70 stage:hover:border-brand"
                aria-label="Monter"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === urls.length - 1}
                className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-600 transition-colors hover:border-brand disabled:opacity-40 stage:border-white/15 stage:bg-white/5 stage:text-white/70 stage:hover:border-brand"
                aria-label="Descendre"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => remove(index)}
                className="rounded-lg border border-red-200 bg-white px-2 py-1 text-sm text-red-600 transition-colors hover:border-red-400 stage:border-red-400/30 stage:bg-transparent stage:text-red-300"
                aria-label="Supprimer"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={hintText}>Aucune photo. Collez une ou plusieurs URLs ci-dessous.</p>
      )}

      <div className="flex gap-2">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={2}
          placeholder="https://…/photo.jpg (une URL par ligne)"
          className={`${inputBase} flex-1 font-normal`}
        />
        <button type="button" onClick={add} className={`${btnSecondary} shrink-0 self-start`}>
          Ajouter
        </button>
      </div>
    </div>
  );
}

'use client';

/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';

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
        <span className="text-sm text-zinc-500">{importedCount} photo(s) importée(s)</span>
      ) : null}

      {urls.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {urls.map((url, index) => (
            <li
              key={url}
              className="flex items-center gap-2 rounded border border-zinc-200 p-1.5 dark:border-zinc-800"
            >
              <img
                src={url}
                alt=""
                className="h-12 w-16 shrink-0 rounded object-cover"
                loading="lazy"
              />
              <span className="min-w-0 flex-1 truncate text-xs text-zinc-500">{url}</span>
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                className="rounded border border-zinc-300 px-1.5 text-sm disabled:opacity-40 dark:border-zinc-700"
                aria-label="Monter"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === urls.length - 1}
                className="rounded border border-zinc-300 px-1.5 text-sm disabled:opacity-40 dark:border-zinc-700"
                aria-label="Descendre"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => remove(index)}
                className="rounded border border-zinc-300 px-1.5 text-sm text-red-600 dark:border-zinc-700"
                aria-label="Supprimer"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">
          Aucune photo. Collez une ou plusieurs URLs ci-dessous.
        </p>
      )}

      <div className="flex gap-2">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={2}
          placeholder="https://…/photo.jpg (une URL par ligne)"
          className="flex-1 rounded border px-2 py-1 font-normal"
        />
        <button
          type="button"
          onClick={add}
          className="shrink-0 self-start rounded border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Ajouter
        </button>
      </div>
    </div>
  );
}

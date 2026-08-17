'use client';

import {
  MAX_LIST_ITEM_LENGTH,
  MAX_LIST_ITEMS,
} from '@/features/subject-property/constants/property-options';

// Editable list of short text items (strengths / watch points). Not a big
// textarea pretending to be structured data.
export function PropertyListField({
  label,
  items,
  onChange,
  error,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  error?: string;
}) {
  const updateAt = (index: number, value: string) => {
    onChange(items.map((item, i) => (i === index ? value : item)));
  };
  const removeAt = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };
  const add = () => {
    if (items.length < MAX_LIST_ITEMS) {
      onChange([...items, '']);
    }
  };

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">{label}</legend>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="text"
            value={item}
            maxLength={MAX_LIST_ITEM_LENGTH}
            onChange={(event) => updateAt(index, event.target.value)}
            className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="button"
            onClick={() => removeAt(index)}
            className="rounded border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Retirer
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        disabled={items.length >= MAX_LIST_ITEMS}
        className="self-start rounded border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        Ajouter un élément
      </button>
      <span className="text-xs text-zinc-500">
        {items.length} / {MAX_LIST_ITEMS} éléments · {MAX_LIST_ITEM_LENGTH} caractères max.
      </span>
      {error ? <span className="text-sm text-red-600">{error}</span> : null}
    </fieldset>
  );
}

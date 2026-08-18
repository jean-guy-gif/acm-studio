'use client';

import { btnGhost, btnSecondary, errorText, fieldLabel, inputBase } from '@/components/ui/styles';
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
      <legend className={`${fieldLabel} mb-1.5`}>{label}</legend>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="text"
            value={item}
            maxLength={MAX_LIST_ITEM_LENGTH}
            onChange={(event) => updateAt(index, event.target.value)}
            className={`${inputBase} flex-1`}
          />
          <button type="button" onClick={() => removeAt(index)} className={btnGhost}>
            Retirer
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        disabled={items.length >= MAX_LIST_ITEMS}
        className={`${btnSecondary} self-start`}
      >
        + Ajouter un élément
      </button>
      <span className="text-xs text-zinc-400 stage:text-white/40">
        {items.length} / {MAX_LIST_ITEMS} éléments · {MAX_LIST_ITEM_LENGTH} caractères max.
      </span>
      {error ? <span className={errorText}>{error}</span> : null}
    </fieldset>
  );
}

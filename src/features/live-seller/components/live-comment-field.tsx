'use client';

import { useState } from 'react';

import { fieldInput } from '@/features/live-seller/components/live-stage';
import { useLiveTexts } from '@/features/live-seller/components/live-texts';

// Mission 148 — « Commentaire (facultatif) » devient « + Ajouter un commentaire », qui ouvre le
// champ sur place (réponse 3 de Jean-Guy). Rien ne change à ce qui s'enregistre : fermé, le
// commentaire déjà noté voyage tel quel (champ caché du même nom) ; un commentaire noté ouvre le
// champ d'emblée.
export function LiveCommentField({ name, defaultValue }: { name: string; defaultValue: string }) {
  const { texts } = useLiveTexts();
  const [open, setOpen] = useState(defaultValue.trim() !== '');
  if (!open) {
    return (
      <div>
        <input type="hidden" name={name} value={defaultValue} />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm font-medium text-brand-deep underline underline-offset-4 hover:text-brand-darker stage:text-white/75 stage:hover:text-white"
          data-add-comment
        >
          {texts.common.addComment}
        </button>
      </div>
    );
  }
  return (
    <label className="flex flex-col gap-1">
      <span className="sr-only">{texts.common.commentOptional}</span>
      <textarea
        name={name}
        rows={2}
        defaultValue={defaultValue}
        placeholder={texts.common.commentOptional}
        // Ouvert à la demande : le conseiller tape tout de suite.
        autoFocus={defaultValue.trim() === ''}
        className={`${fieldInput} text-sm`}
      />
    </label>
  );
}

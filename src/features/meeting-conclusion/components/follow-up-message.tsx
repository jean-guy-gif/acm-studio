'use client';

import { useState } from 'react';

import { btnSecondary, errorText, inputBase, link, okText } from '@/components/ui/styles';

// Mission 96 — « Préparer un message » : le texte proposé par le serveur (follow-up-message.ts),
// que le conseiller corrige puis copie. Rien n'est envoyé par l'outil, et le texte modifié
// n'est pas enregistré : il vit le temps de l'écran.
export function FollowUpMessage({ proposed }: { proposed: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(proposed);
  const [copied, setCopied] = useState<'yes' | 'failed' | null>(null);

  if (!open) {
    return (
      <button type="button" className={`${link} text-xs`} onClick={() => setOpen(true)}>
        Préparer un message
      </button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded-xl border border-zinc-200 p-4 stage:border-white/10">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-600 stage:text-white/70">
          Message de relance — modifiez-le avant de le copier ; il n’est ni envoyé ni enregistré.
        </span>
        <textarea
          rows={9}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setCopied(null);
          }}
          className={inputBase}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={btnSecondary}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied('yes');
            } catch {
              setCopied('failed');
            }
          }}
        >
          Copier
        </button>
        <button
          type="button"
          className={link}
          onClick={() => {
            setText(proposed);
            setCopied(null);
          }}
        >
          Reprendre le texte proposé
        </button>
        <button type="button" className={link} onClick={() => setOpen(false)}>
          Fermer
        </button>
        {copied === 'yes' ? <span className={okText}>Message copié.</span> : null}
        {copied === 'failed' ? (
          <span className={errorText}>
            La copie a échoué : sélectionnez le texte et copiez-le à la main.
          </span>
        ) : null}
      </div>
    </div>
  );
}

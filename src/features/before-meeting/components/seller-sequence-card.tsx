'use client';

import { useState, type ReactNode } from 'react';

import { btnSecondary, card, hintText, sectionTitle } from '@/components/ui/styles';
import { durationLabel, type LiveSequence } from '@/features/before-meeting/services/live-sequence';

export type SequenceNote = {
  key: string;
  severity: 'info' | 'warning' | 'blocking';
  message: string;
};

const NOTE_CLASS: Record<SequenceNote['severity'], string> = {
  blocking: 'text-red-700 stage:text-red-300',
  warning: 'text-amber-700 stage:text-amber-300',
  info: 'text-zinc-500 stage:text-white/55',
};

// Mission 91 — « Ce que verra le vendeur » : le déroulé du Live de ce dossier, sa durée
// estimée, les points de vigilance, et le départ vers le Live. « Aperçu côté vendeur » déplie
// la liste des écrans, sans aucun prix : il n'existe pas d'aperçu qui n'enregistre rien.
export function SellerSequenceCard({
  sequence,
  notes,
  rhythmSetting = null,
  launch,
}: {
  sequence: LiveSequence;
  notes: SequenceNote[];
  // Mission 95 — le réglage « Rythme du Live », au-dessus du déroulé qu'il commande.
  rhythmSetting?: ReactNode;
  // Mission 104 — le bouton « Lancer le Live » commun, qui vérifie avant d'ouvrir.
  launch: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const total = sequence.totalScreens;
  return (
    <section className={`${card} @container flex flex-col gap-4 p-5 sm:p-6`}>
      <div className="flex flex-col gap-1">
        <h2 className={sectionTitle}>Ce que verra le vendeur</h2>
        <p className={hintText}>Le déroulé du Live avec ce dossier.</p>
      </div>

      {rhythmSetting}

      <ol className="grid grid-cols-1 gap-x-4 gap-y-1.5 @3xl:grid-cols-2">
        {sequence.parts.map((part) => (
          <li
            key={part.key}
            className="flex items-baseline justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3.5 py-2 text-sm stage:border-white/10 stage:bg-white/[0.04]"
          >
            <span className="font-medium text-zinc-800 stage:text-white/85">{part.label}</span>
            <span className="shrink-0 text-zinc-500 stage:text-white/55">
              {part.screenCount} écran{part.screenCount > 1 ? 's' : ''}
            </span>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-title text-lg font-bold text-brand-deep stage:text-white">
            {total} écran{total > 1 ? 's' : ''} · {durationLabel(sequence)}
          </p>
          {notes.length > 0 ? (
            <ul className="flex flex-col gap-0.5 text-sm">
              {notes.map((note) => (
                <li key={note.key} className={NOTE_CLASS[note.severity]}>
                  {note.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btnSecondary}
            aria-expanded={open}
            aria-controls="apercu-vendeur"
            onClick={() => setOpen((value) => !value)}
          >
            Aperçu côté vendeur
          </button>
          {launch}
        </div>
      </div>

      <div id="apercu-vendeur" hidden={!open} className="flex flex-col gap-2">
        <p className={hintText}>
          Les écrans que le vendeur verra, dans l’ordre. Aucun prix ici&nbsp;: ils se découvrent
          pendant le Live.
        </p>
        <ol className="grid list-inside list-decimal grid-cols-1 gap-x-6 gap-y-1 text-sm text-zinc-700 @3xl:grid-cols-2 stage:text-white/75">
          {sequence.screenTitles.map((title, index) => (
            <li key={`${index}-${title}`}>{title}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}

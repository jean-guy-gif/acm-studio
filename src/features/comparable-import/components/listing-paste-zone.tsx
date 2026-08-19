'use client';

import { useState, useSyncExternalStore } from 'react';

import { hintText } from '@/components/ui/styles';

// Zone de collage de l'annonce.
//
// Terrain (19/08, Laurent) : « Trop complexe de faire Cmd+Option+U […] Cmd+A
// pour tout sélectionner, Cmd+C pour copier, aller dans l'outil, Cmd+V. Enfin,
// c'est trop complexe. » Le coupable, c'est « afficher le code source » : un
// conseiller ne fera jamais ça devant un client.
//
// Ce qu'on garde : les trois raccourcis que TOUT LE MONDE connaît déjà —
// tout sélectionner, copier, coller. Rien à installer, rien à afficher.
//
// Pourquoi ça suffit : quand on copie une page web, le navigateur met dans le
// presse-papiers la page TELLE QU'ELLE S'AFFICHE (`text/html`), et non le code
// envoyé par le serveur. C'est justement ce qui manquait — sur Bien'ici, le
// code source ne contient aucune annonce.

// Le raccourci n'a pas le même nom selon la machine. On lit la plateforme comme
// une source externe : le rendu serveur affiche les deux, le navigateur tranche.
const subscribe = () => () => {};
const getPlatform = (): 'mac' | 'other' =>
  /Mac|iPhone|iPad/i.test(navigator.userAgent) ? 'mac' : 'other';
const getServerPlatform = (): null => null;

type Props = {
  onPaste: (payload: { html: string; text: string }) => void;
  disabled?: boolean;
};

export function ListingPasteZone({ onPaste, disabled = false }: Props) {
  const platform = useSyncExternalStore(subscribe, getPlatform, getServerPlatform);
  const [receivedChars, setReceivedChars] = useState<number | null>(null);

  const key = platform === 'mac' ? 'Cmd' : platform === 'other' ? 'Ctrl' : 'Cmd/Ctrl';

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    // On empêche l'insertion : la page collée peut peser plusieurs centaines de
    // milliers de caractères, l'afficher figerait le navigateur pour rien.
    event.preventDefault();
    if (disabled) {
      return;
    }
    const html = event.clipboardData.getData('text/html');
    const text = event.clipboardData.getData('text/plain');
    const payload = html.trim() !== '' ? html : text;
    if (payload.trim() === '') {
      return;
    }
    setReceivedChars(payload.length);
    onPaste({ html, text });
  };

  return (
    <div className="flex flex-col gap-2">
      <ol className="flex flex-col gap-1 text-sm text-zinc-700 stage:text-white/80">
        <li>
          <strong>1.</strong> Sur la page de l’annonce, appuyez sur <kbd>{key}</kbd> + <kbd>A</kbd>{' '}
          — tout est sélectionné.
        </li>
        <li>
          <strong>2.</strong> <kbd>{key}</kbd> + <kbd>C</kbd> — c’est copié.
        </li>
        <li>
          <strong>3.</strong> Revenez ici, cliquez dans le cadre ci-dessous et faites{' '}
          <kbd>{key}</kbd> + <kbd>V</kbd>.
        </li>
      </ol>
      <div
        role="textbox"
        tabIndex={0}
        aria-label="Coller ici la page de l’annonce"
        contentEditable={!disabled}
        suppressContentEditableWarning
        onPaste={handlePaste}
        className="min-h-24 cursor-text rounded-xl border-2 border-dashed border-brand/40 bg-brand-soft/40 p-4 text-center text-sm text-zinc-500 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30 stage:border-white/25 stage:bg-white/[0.04] stage:text-white/60"
      >
        {receivedChars == null
          ? `Cliquez ici, puis ${key} + V`
          : `Page reçue (${receivedChars.toLocaleString('fr-FR')} caractères) — analyse en cours…`}
      </div>
      <p className={hintText}>
        Rien à installer. Si votre navigateur affiche « coller » dans un menu, cela fonctionne aussi
        — c’est le même geste que pour copier un texte.
      </p>
    </div>
  );
}

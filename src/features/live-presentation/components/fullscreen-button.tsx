const buttonClass =
  'rounded border border-zinc-300 px-4 py-2 text-base hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800';

// Presentational. The Fullscreen API is handled by the shell (client) so the same
// logic is shared with the keyboard shortcut. This button just triggers it.
export function FullscreenButton({
  isFullscreen,
  onToggle,
}: {
  isFullscreen: boolean;
  onToggle: () => void;
}) {
  return (
    <button type="button" className={buttonClass} onClick={onToggle}>
      {isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
    </button>
  );
}

'use client';

import { useFormStatus } from 'react-dom';

// Shared submit button for plain server-action <form>s. Uses useFormStatus to
// disable itself and show a pending label while the action runs, preventing a
// double submission. Must be rendered as a child of the <form> it belongs to.
export function SubmitButton({
  children,
  pendingLabel,
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        className ??
        'rounded border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800'
      }
    >
      {pending ? (pendingLabel ?? children) : children}
    </button>
  );
}

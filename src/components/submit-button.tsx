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
        'inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50'
      }
    >
      {pending ? (pendingLabel ?? children) : children}
    </button>
  );
}

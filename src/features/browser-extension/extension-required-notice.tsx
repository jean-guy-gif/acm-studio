'use client';

import { useState } from 'react';

import { btnPrimary, btnSecondary, card, hintText } from '@/components/ui/styles';
import {
  EXTENSION_ALREADY_INSTALLED_HINT,
  EXTENSION_INSTALL_FALLBACK,
  EXTENSION_INSTALL_LABEL,
  EXTENSION_NO_SITE_ACCESS_STEPS,
  EXTENSION_NO_SITE_ACCESS_TITLE,
  EXTENSION_RETRY_LABEL,
  extensionInstallUrl,
} from '@/features/browser-extension/install-url';

// Mission 74 — le seul message de l'application quand l'extension manque ou est trop ancienne.
// Il remplace les replis par collage : l'extension est obligatoire (mission 73).
// Mission 105 — `no_site_access` : installée, mais sans accès au site ; on dit où le rétablir.
export type ExtensionIssue = 'missing' | 'outdated' | 'no_site_access';

// Mission 108 — « Réessayer » : la détection complète, refaite à la demande (sans extension,
// l'onglet ne refait plus les 5 secondes d'attente à chaque clic).
function RetryButton({ onRetry }: { onRetry: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={`${btnSecondary} self-start`}
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void onRetry().finally(() => setBusy(false));
      }}
    >
      {busy ? 'Vérification…' : EXTENSION_RETRY_LABEL}
    </button>
  );
}

export function ExtensionRequiredNotice({
  reason,
  onRetry,
}: {
  reason: ExtensionIssue;
  onRetry?: () => Promise<void>;
}) {
  const installUrl = extensionInstallUrl();
  if (reason === 'no_site_access') {
    return (
      <div role="alert" className={`${card} flex flex-col gap-2 p-4`}>
        <span className="font-title text-sm font-semibold text-zinc-800 stage:text-white">
          {EXTENSION_NO_SITE_ACCESS_TITLE}
        </span>
        <p className={hintText}>{EXTENSION_NO_SITE_ACCESS_STEPS}</p>
        {onRetry ? <RetryButton onRetry={onRetry} /> : null}
      </div>
    );
  }
  return (
    <div role="alert" className={`${card} flex flex-col gap-2 p-4`}>
      <span className="font-title text-sm font-semibold text-zinc-800 stage:text-white">
        {reason === 'missing'
          ? 'L’extension ACM Studio n’a pas répondu'
          : 'Votre extension ACM Studio est trop ancienne'}
      </span>
      {installUrl ? (
        <>
          <p className={hintText}>
            ACM Studio lit les annonces et vos recherches par son extension Chrome.
          </p>
          <a
            href={installUrl}
            target="_blank"
            rel="noreferrer noopener"
            className={`${btnPrimary} self-start`}
          >
            {EXTENSION_INSTALL_LABEL}
          </a>
        </>
      ) : (
        <p className={hintText}>{EXTENSION_INSTALL_FALLBACK}.</p>
      )}
      {reason === 'missing' ? (
        <p className={hintText}>{EXTENSION_ALREADY_INSTALLED_HINT}.</p>
      ) : null}
      {onRetry ? <RetryButton onRetry={onRetry} /> : null}
    </div>
  );
}

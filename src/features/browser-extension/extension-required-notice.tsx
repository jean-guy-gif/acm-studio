import { btnPrimary, card, hintText } from '@/components/ui/styles';
import {
  EXTENSION_ALREADY_INSTALLED_HINT,
  EXTENSION_INSTALL_FALLBACK,
  EXTENSION_INSTALL_LABEL,
  EXTENSION_NO_SITE_ACCESS_STEPS,
  EXTENSION_NO_SITE_ACCESS_TITLE,
  extensionInstallUrl,
} from '@/features/browser-extension/install-url';

// Mission 74 — le seul message de l'application quand l'extension manque ou est trop ancienne.
// Il remplace les replis par collage : l'extension est obligatoire (mission 73).
// Mission 105 — `no_site_access` : installée, mais sans accès au site ; on dit où le rétablir.
export type ExtensionIssue = 'missing' | 'outdated' | 'no_site_access';

export function ExtensionRequiredNotice({ reason }: { reason: ExtensionIssue }) {
  const installUrl = extensionInstallUrl();
  if (reason === 'no_site_access') {
    return (
      <div role="alert" className={`${card} flex flex-col gap-2 p-4`}>
        <span className="font-title text-sm font-semibold text-zinc-800 stage:text-white">
          {EXTENSION_NO_SITE_ACCESS_TITLE}
        </span>
        <p className={hintText}>{EXTENSION_NO_SITE_ACCESS_STEPS}</p>
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
    </div>
  );
}

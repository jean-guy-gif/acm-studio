import { btnPrimary, card, hintText } from '@/components/ui/styles';
import {
  EXTENSION_INSTALL_FALLBACK,
  EXTENSION_INSTALL_LABEL,
  extensionInstallUrl,
} from '@/features/browser-extension/install-url';

// Mission 74 — le seul message de l'application quand l'extension manque ou est trop ancienne.
// Il remplace les replis par collage : l'extension est obligatoire (mission 73).
export function ExtensionRequiredNotice({ reason }: { reason: 'missing' | 'outdated' }) {
  const installUrl = extensionInstallUrl();
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
    </div>
  );
}

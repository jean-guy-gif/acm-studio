'use client';

import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { link } from '@/components/ui/styles';
import {
  EXTENSION_INSTALL_FALLBACK,
  EXTENSION_INSTALL_LABEL,
  EXTENSION_ALREADY_INSTALLED_HINT,
  EXTENSION_NO_SITE_ACCESS_STEPS,
  EXTENSION_NO_SITE_ACCESS_TITLE,
  extensionInstallUrl,
} from '@/features/browser-extension/install-url';
import { useBrowserExtension } from '@/features/browser-extension/use-browser-extension';
import { pingLocator } from '@/features/competitor-locator/client';
import type { LocatorAvailability } from '@/features/competitor-locator/types';
import {
  isChromeBrowser,
  LOCALISATEUR_STORE_URL,
  locatorInstalled,
} from '@/features/welcome/services/welcome';

type CheckState = 'done' | 'todo' | 'unknown' | 'optional';

const MARK: Record<CheckState, { sign: string; tone: string; label: string }> = {
  done: {
    sign: '✓',
    tone: 'bg-emerald-100 text-emerald-700 stage:bg-emerald-500/20 stage:text-emerald-300',
    label: 'fait',
  },
  todo: {
    sign: '!',
    tone: 'bg-amber-100 text-amber-800 stage:bg-amber-400/20 stage:text-amber-200',
    label: 'à faire',
  },
  unknown: {
    sign: '…',
    tone: 'bg-zinc-100 text-zinc-500 stage:bg-white/10 stage:text-white/60',
    label: 'vérification en cours',
  },
  optional: {
    sign: '+',
    tone: 'bg-zinc-100 text-zinc-500 stage:bg-white/10 stage:text-white/60',
    label: 'facultatif',
  },
};

function Item({
  state,
  title,
  testId,
  children,
}: {
  state: CheckState;
  title: string;
  testId: string;
  children?: React.ReactNode;
}) {
  const mark = MARK[state];
  return (
    <li data-testid={testId} data-state={state} className="flex items-start gap-3">
      <span
        aria-label={mark.label}
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${mark.tone}`}
      >
        {mark.sign}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-medium text-zinc-900 stage:text-white">{title}</span>
        {children ? (
          <span className="text-sm text-zinc-500 stage:text-white/60">{children}</span>
        ) : null}
      </span>
    </li>
  );
}

const subscribe = () => () => {};

// Mission 97 — « Ce qu'il vous faut », coché tout seul quand c'est détectable : le navigateur
// (ce qu'il dit de lui-même), l'extension ACM (le ping existant), le téléphone du profil (lu
// par le serveur). Rien n'est bloquant : l'écran informe.
export function WelcomeChecklist({ hasPhone }: { hasPhone: boolean }) {
  const extension = useBrowserExtension();
  // Connu seulement dans le navigateur ; « inconnu » pendant le rendu du serveur.
  const chrome = useSyncExternalStore<boolean | null>(
    subscribe,
    () => isChromeBrowser(navigator.userAgent),
    () => null,
  );
  const installUrl = extensionInstallUrl();
  // Mission 106 — un Localisateur répond-il (celui du Store ou celui du mode développeur) ?
  const [locator, setLocator] = useState<LocatorAvailability | null>(null);
  useEffect(() => {
    let cancelled = false;
    void pingLocator().then((availability) => {
      if (!cancelled) setLocator(availability);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ul className="flex flex-col gap-3.5">
      <Item
        testId="need-chrome"
        state={chrome == null ? 'unknown' : chrome ? 'done' : 'todo'}
        title="Le navigateur Chrome"
      >
        {chrome === false
          ? 'Ouvrez ACM Studio dans Google Chrome : l’extension ne fonctionne que là.'
          : null}
      </Item>
      <Item
        testId="need-extension"
        state={extension.available == null ? 'unknown' : extension.available ? 'done' : 'todo'}
        title="L’extension ACM Studio"
      >
        {extension.available === false ? (
          extension.noSiteAccess ? (
            // Mission 105 — installée, mais Chrome ne lui laisse pas lire ACM Studio.
            <span data-testid="extension-no-site-access">
              {EXTENSION_NO_SITE_ACCESS_TITLE} : {EXTENSION_NO_SITE_ACCESS_STEPS}.
            </span>
          ) : (
            <>
              {installUrl ? (
                <>
                  Elle lit les annonces et vos recherches sur les portails.{' '}
                  <a href={installUrl} target="_blank" rel="noreferrer noopener" className={link}>
                    {EXTENSION_INSTALL_LABEL}
                  </a>
                </>
              ) : (
                `${EXTENSION_INSTALL_FALLBACK}.`
              )}{' '}
              <span className="block text-xs">{EXTENSION_ALREADY_INSTALLED_HINT}.</span>
            </>
          )
        ) : null}
      </Item>
      <Item
        testId="need-phone"
        state={hasPhone ? 'done' : 'todo'}
        title="Votre téléphone dans votre profil"
      >
        {hasPhone ? null : (
          <>
            Il signe les courriers de prospection.{' '}
            <Link href="/profil" className={link}>
              Compléter mon profil
            </Link>
          </>
        )}
      </Item>
      <Item
        testId="need-locator"
        state={locatorInstalled(locator) ? 'done' : 'optional'}
        title="Facultatif : Localisateur Academia"
      >
        Pour retrouver l’adresse d’un bien.
        {locatorInstalled(locator) ? null : (
          <>
            {' '}
            <a
              href={LOCALISATEUR_STORE_URL}
              target="_blank"
              rel="noreferrer noopener"
              className={link}
            >
              L’installer depuis le Chrome Web Store
            </a>
          </>
        )}
      </Item>
    </ul>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

import { useAppStage } from '@/components/theme/app-stage';
import { softPanel } from '@/components/ui/styles';
import { accountMenuFor } from '@/features/workspace-mode/services/workspace-mode';

// Mission 100 — la pastille des erreurs, pour les seuls opérateurs : le layout ne transmet
// `errorsBadge` que pour eux (la page /erreurs, elle, se garde seule). Elle se tait à zéro.
export type ErrorsBadge = { count: number; label: string };

export const ACCOUNT_MENU_LABEL = 'Mon compte et l’agence';

// Mission 125 — la carte du conseiller, en bas du menu de gauche, est un bouton qui ouvre le menu
// de tout ce qui n'est pas le travail : Mon profil · Administration · Aide · Ma démo (agence de
// démonstration, M114) · Erreurs (opérateurs, M100) · Sombre / Clair · Déconnexion. Fermeture par
// Échap, clic dehors ou choix d'une entrée ; au clavier : flèches, Début, Fin. Il ne change que
// l'affichage : chaque page se garde seule, les adresses ne changent pas.
export function AccountMenu({
  profileName,
  profileEmail,
  agencyName,
  signOutAction,
  errorsBadge = null,
  demoEntry = false,
}: {
  profileName: string;
  profileEmail: string;
  agencyName: string;
  signOutAction: () => Promise<void>;
  errorsBadge?: ErrorsBadge | null;
  demoEntry?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { theme, toggle } = useAppStage();
  const menuId = useId();
  const container = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const links = accountMenuFor({ demo: demoEntry, operator: errorsBadge != null });
  const showBadge = errorsBadge != null && errorsBadge.count > 0;

  const items = (): HTMLElement[] =>
    Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };

  // À l'ouverture, la première entrée prend le focus ; un clic hors de la carte ferme.
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const outside = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, [open]);

  const onMenuKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLElement);
    const focus = (next: number) => {
      event.preventDefault();
      list[(next + list.length) % list.length]?.focus();
    };
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    } else if (event.key === 'ArrowDown') focus(index + 1);
    else if (event.key === 'ArrowUp') focus(index - 1);
    else if (event.key === 'Home') focus(0);
    else if (event.key === 'End') focus(list.length - 1);
    else if (event.key === 'Tab') setOpen(false);
  };

  const entry =
    'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-700 outline-none hover:bg-zinc-100 focus-visible:bg-zinc-100 stage:text-white/80 stage:hover:bg-white/10 stage:focus-visible:bg-white/10';

  return (
    <div ref={container} className="relative">
      <button
        ref={button}
        type="button"
        aria-label={ACCOUNT_MENU_LABEL}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
          }
        }}
        data-testid="account-card"
        className={`${softPanel} flex w-full flex-col gap-0.5 px-3.5 py-3 text-left transition-colors hover:border-zinc-300 stage:hover:border-white/20`}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-zinc-800 stage:text-white">
            {profileName}
          </span>
          {showBadge ? (
            <span
              data-testid="account-errors-badge"
              title={errorsBadge.label}
              className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white"
            >
              {errorsBadge.count}
            </span>
          ) : null}
        </span>
        <span className="truncate text-xs text-zinc-500 stage:text-white/50">{profileEmail}</span>
        <span className="truncate text-xs text-zinc-400 stage:text-white/40">{agencyName}</span>
      </button>

      {open ? (
        <div
          ref={menu}
          id={menuId}
          role="menu"
          aria-label={ACCOUNT_MENU_LABEL}
          onKeyDown={onMenuKey}
          data-testid="account-menu"
          className="absolute right-0 bottom-full left-0 z-50 mb-2 flex flex-col gap-0.5 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg stage:border-white/10 stage:bg-[#0b2233]"
        >
          {links.map((link) => {
            const current = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                role="menuitem"
                tabIndex={-1}
                aria-current={current ? 'page' : undefined}
                onClick={() => close(false)}
                className={entry}
              >
                <span>{link.label}</span>
                {link.href === '/erreurs' && showBadge ? (
                  <span
                    data-testid="account-errors-label"
                    className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white"
                  >
                    {errorsBadge.label}
                  </span>
                ) : null}
              </Link>
            );
          })}
          <div className="my-1 border-t border-zinc-100 stage:border-white/10" />
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              toggle();
              close(true);
            }}
            className={entry}
          >
            {theme === 'dark' ? 'Clair' : 'Sombre'}
          </button>
          <form action={signOutAction}>
            <button type="submit" role="menuitem" tabIndex={-1} className={entry}>
              Déconnexion
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

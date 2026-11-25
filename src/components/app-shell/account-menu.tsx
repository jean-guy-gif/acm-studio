'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

import { initialsOf } from '@/components/socle/initials';
import { useAppStage } from '@/components/theme/app-stage';
import {
  accountMenuFor,
  type AccountLink,
} from '@/features/workspace-mode/services/workspace-mode';

// Mission 100 — la pastille des erreurs, pour les seuls opérateurs : le layout ne transmet
// `errorsBadge` que pour eux (la page /erreurs, elle, se garde seule). Elle se tait à zéro.
export type ErrorsBadge = { count: number; label: string };

export const ACCOUNT_MENU_LABEL = 'Mon compte et l’agence';

const entry =
  'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-700 outline-none hover:bg-zinc-100 focus-visible:bg-zinc-100 stage:text-white/80 stage:hover:bg-white/10 stage:focus-visible:bg-white/10';

// Mission 125 — la carte du conseiller, en bas du menu de gauche, est un bouton qui ouvre le menu
// de tout ce qui n'est pas le travail : Mon profil · Administration · Aide · Ma démo (agence de
// démonstration, M114) · Erreurs (opérateurs, M100) · Sombre / Clair · Déconnexion. Fermeture par
// Échap, clic dehors ou choix d'une entrée ; au clavier : flèches, Début, Fin. Il ne change que
// l'affichage : chaque page se garde seule, les adresses ne changent pas.
//
// La refonte, lot A — le même compte aux trois tailles : sa carte en bas du menu sur ordinateur, un
// rond aux initiales en bas de la colonne d'icônes sur tablette (`variant="menu"`), et un rond en
// haut d'« Aujourd'hui » sur téléphone (`variant="avatar"`). La feuille porte aussi ce que le menu
// ne montre pas à cette taille : Prospection sous 1280 px, Aide sous 768 px ; et, là où le bouton
// n'est qu'un rond, qui est connecté.
export function AccountMenu({
  profileName,
  profileEmail,
  agencyName,
  signOutAction,
  errorsBadge = null,
  demoEntry = false,
  variant = 'menu',
}: {
  profileName: string;
  profileEmail: string;
  agencyName: string;
  signOutAction: () => Promise<void>;
  errorsBadge?: ErrorsBadge | null;
  demoEntry?: boolean;
  variant?: 'menu' | 'avatar';
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

  // Les entrées visibles à cette taille : une entrée que le menu montre déjà est masquée ici.
  const items = (): HTMLElement[] =>
    Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []).filter(
      (element) => element.offsetParent !== null,
    );
  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };

  // À l'ouverture, la première entrée prend le focus ; un clic hors de la carte ferme.
  useEffect(() => {
    if (!open) return;
    items()[0]?.focus();
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

  const initials = initialsOf(profileName);
  const badge = showBadge ? (
    <span
      data-testid={variant === 'avatar' ? 'account-avatar-errors-badge' : 'account-errors-badge'}
      title={errorsBadge.label}
      className={
        variant === 'avatar'
          ? 'absolute -top-1 -right-1 rounded-full bg-red-600 px-1.5 py-px text-[11px] font-semibold text-white'
          : 'absolute -top-1 -right-1 rounded-full bg-red-600 px-1.5 py-px text-[11px] font-semibold text-white xl:static xl:shrink-0 xl:px-2 xl:py-0.5 xl:text-xs'
      }
    >
      {errorsBadge.count}
    </span>
  ) : null;

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
        data-testid={variant === 'avatar' ? 'account-avatar' : 'account-card'}
        className={
          variant === 'avatar'
            ? 'relative flex size-12 items-center justify-center rounded-full border border-[#D5DAEA] bg-white text-[15px] font-extrabold text-brand-deep stage:border-white/15 stage:bg-white/10 stage:text-white'
            : 'relative flex h-12 w-full items-center justify-center rounded-xl text-left transition-colors hover:bg-[#F4F5FA] xl:h-auto xl:items-start xl:justify-between xl:gap-2 xl:border xl:border-zinc-100 xl:bg-zinc-50 xl:px-3.5 xl:py-3 xl:hover:border-zinc-300 stage:hover:bg-white/[0.06] xl:stage:border-white/10 xl:stage:bg-white/[0.04] xl:stage:hover:border-white/20'
        }
      >
        {variant === 'avatar' ? (
          <span aria-hidden>{initials}</span>
        ) : (
          <>
            <span
              aria-hidden
              className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-sm font-extrabold text-brand-deep xl:hidden stage:bg-brand/15 stage:text-brand"
            >
              {initials}
            </span>
            <span className="hidden min-w-0 flex-1 flex-col gap-0.5 xl:flex">
              <span className="truncate text-sm font-semibold text-zinc-800 stage:text-white">
                {profileName}
              </span>
              <span className="truncate text-xs text-zinc-500 stage:text-white/50">
                {profileEmail}
              </span>
              <span className="truncate text-xs text-zinc-500 stage:text-white/40">
                {agencyName}
              </span>
            </span>
          </>
        )}
        {badge}
      </button>

      {open ? (
        <div
          ref={menu}
          id={menuId}
          role="menu"
          aria-label={ACCOUNT_MENU_LABEL}
          onKeyDown={onMenuKey}
          data-testid="account-menu"
          className={`absolute z-50 flex w-60 flex-col gap-0.5 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg stage:border-white/10 stage:bg-[#0b2233] ${
            variant === 'avatar'
              ? 'top-full right-0 mt-2'
              : 'bottom-full left-0 mb-2 xl:right-0 xl:w-auto'
          }`}
        >
          <AccountIdentity
            profileName={profileName}
            profileEmail={profileEmail}
            agencyName={agencyName}
            variant={variant}
          />
          <AccountMenuEntries
            links={links}
            pathname={pathname}
            errorsBadge={errorsBadge}
            themeLabel={theme === 'dark' ? 'Clair' : 'Sombre'}
            onLink={() => close(false)}
            onTheme={() => {
              toggle();
              close(true);
            }}
            signOutAction={signOutAction}
          />
        </div>
      ) : null}
    </div>
  );
}

// Qui est connecté, en tête de la feuille : son nom, son e-mail, son agence (M125). Là où le
// bouton n'est qu'un rond aux initiales — sur téléphone et sur tablette ; sur ordinateur, la carte
// le dit déjà. Ce n'est pas une entrée du menu.
export function AccountIdentity({
  profileName,
  profileEmail,
  agencyName,
  variant,
}: {
  profileName: string;
  profileEmail: string;
  agencyName: string;
  variant: 'menu' | 'avatar';
}) {
  return (
    <div
      role="none"
      data-testid="account-identity"
      className={`mb-1 flex flex-col gap-0.5 border-b border-zinc-100 px-3 pt-1.5 pb-2.5 stage:border-white/10 ${
        variant === 'menu' ? 'xl:hidden' : ''
      }`}
    >
      <span className="truncate text-sm font-semibold text-zinc-800 stage:text-white">
        {profileName}
      </span>
      <span className="truncate text-xs text-zinc-500 stage:text-white/50">{profileEmail}</span>
      <span className="truncate text-xs text-zinc-500 stage:text-white/40">{agencyName}</span>
    </div>
  );
}

// Les entrées du menu ouvert, sans état : les liens du compte (« Erreurs » porte la pastille des
// erreurs depuis hier, pour un opérateur, s'il y en a), puis Sombre / Clair et Déconnexion.
export function AccountMenuEntries({
  links,
  pathname,
  errorsBadge,
  themeLabel,
  onLink,
  onTheme,
  signOutAction,
}: {
  links: AccountLink[];
  pathname: string;
  errorsBadge: ErrorsBadge | null;
  themeLabel: 'Sombre' | 'Clair';
  onLink: () => void;
  onTheme: () => void;
  signOutAction: () => Promise<void>;
}) {
  return (
    <>
      {links.map((link) => {
        const current = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            role="menuitem"
            tabIndex={-1}
            aria-current={current ? 'page' : undefined}
            onClick={onLink}
            className={`${entry} ${link.until === 'tablet' ? 'md:hidden' : ''} ${link.until === 'desktop' ? 'xl:hidden' : ''}`}
          >
            <span>{link.label}</span>
            {link.href === '/erreurs' && errorsBadge != null && errorsBadge.count > 0 ? (
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
      <button type="button" role="menuitem" tabIndex={-1} onClick={onTheme} className={entry}>
        {themeLabel}
      </button>
      <form action={signOutAction}>
        <button type="submit" role="menuitem" tabIndex={-1} className={entry}>
          Déconnexion
        </button>
      </form>
    </>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { btnSecondary } from '@/components/ui/styles';

// Mission 146 — « … » : les actions qui ne sont pas la prochaine étape, rangées hors de la vue
// (un seul bouton plein par écran, M143). Fermeture par Échap, un clic dehors ou le choix d'une
// entrée ; au clavier, flèches, Début et Fin, comme le menu de la carte du conseiller (M125). Une
// entrée « danger » (Supprimer…) est en rouge, en bas, séparée ; elle ouvre sa confirmation dans
// l'écran, jamais la boîte du navigateur.

export const MORE_MENU_LABEL = 'Plus d’actions';

export type MoreMenuItem = {
  key: string;
  label: string;
  // Une précision en gris, sur la même ligne (« il manque : bien vendeur »).
  hint?: string | null;
  danger?: boolean;
  disabled?: boolean;
  // Un lien, ou un geste.
  href?: string;
  onSelect?: () => void;
};

// L'entrée qui prend le focus après une touche : pure, pour être testée seule.
export function nextMenuIndex(key: string, index: number, length: number): number | null {
  if (length === 0) return null;
  if (key === 'ArrowDown') return (index + 1 + length) % length;
  if (key === 'ArrowUp') return (index - 1 + length) % length;
  if (key === 'Home') return 0;
  if (key === 'End') return length - 1;
  return null;
}

// Ce que fait une touche dans le menu ouvert : Échap le ferme (le focus revient au bouton), Tab
// le quitte, les flèches, Début et Fin déplacent le focus. Pur.
export function menuKeyIntent(key: string): 'close' | 'leave' | 'move' | null {
  if (key === 'Escape') return 'close';
  if (key === 'Tab') return 'leave';
  return nextMenuIndex(key, 0, 1) == null ? null : 'move';
}

// Un clic hors du menu (et de son bouton) le ferme. Pur.
export function isOutside(
  container: { contains: (node: Node) => boolean } | null,
  target: Node,
): boolean {
  return !container?.contains(target);
}

const entry =
  'flex w-full items-baseline gap-1.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-700 outline-none hover:bg-zinc-100 focus-visible:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 stage:text-white/80 stage:hover:bg-white/10 stage:focus-visible:bg-white/10';
const dangerEntry =
  'mt-1 flex w-full items-baseline rounded-lg border-t border-zinc-100 px-3 py-2 text-left text-sm font-medium text-red-600 outline-none hover:bg-red-50 focus-visible:bg-red-50 stage:border-white/10 stage:text-red-300 stage:hover:bg-red-500/10';

// Les entrées, sans état : les ordinaires d'abord, les « danger » en bas.
export function MoreMenuEntries({
  items,
  onPick,
}: {
  items: MoreMenuItem[];
  onPick: (item: MoreMenuItem) => void;
}) {
  const ordered = [...items.filter((item) => !item.danger), ...items.filter((i) => i.danger)];
  return (
    <>
      {ordered.map((item) => {
        const className = item.danger ? dangerEntry : entry;
        const body = (
          <>
            <span>{item.label}</span>
            {item.hint ? (
              <span className="text-xs font-normal text-zinc-500 stage:text-white/50">
                · {item.hint}
              </span>
            ) : null}
          </>
        );
        return item.href && !item.disabled ? (
          <Link
            key={item.key}
            href={item.href}
            role="menuitem"
            className={className}
            onClick={() => onPick(item)}
          >
            {body}
          </Link>
        ) : (
          <button
            key={item.key}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            className={className}
            onClick={() => onPick(item)}
          >
            {body}
          </button>
        );
      })}
    </>
  );
}

export function MoreMenu({
  items,
  label = MORE_MENU_LABEL,
  testId,
}: {
  items: MoreMenuItem[];
  label?: string;
  testId?: string;
}): ReactNode {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const container = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const entries = (): HTMLElement[] =>
    Array.from(
      menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? [],
    );
  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus();
    const outside = (event: MouseEvent) => {
      if (isOutside(container.current, event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, [open]);
  const onMenuKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const intent = menuKeyIntent(event.key);
    if (intent === 'close') {
      event.preventDefault();
      close(true);
      return;
    }
    if (intent === 'leave') {
      setOpen(false);
      return;
    }
    const list = entries();
    const next = nextMenuIndex(
      event.key,
      list.indexOf(document.activeElement as HTMLElement),
      list.length,
    );
    if (next != null) {
      event.preventDefault();
      list[next]?.focus();
    }
  };
  if (items.length === 0) return null;
  return (
    <div ref={container} className="relative">
      <button
        ref={button}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        data-testid={testId}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={`${btnSecondary} px-2.5 py-1.5 text-base leading-none tracking-wider`}
      >
        …
      </button>
      {open ? (
        <div
          ref={menu}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          className="absolute top-full right-0 z-40 mt-1.5 flex w-max max-w-80 min-w-56 flex-col gap-0.5 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg stage:border-white/10 stage:bg-[#0b2233]"
        >
          <MoreMenuEntries
            items={items}
            onPick={(item) => {
              if (item.disabled) return;
              close(!item.href);
              item.onSelect?.();
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

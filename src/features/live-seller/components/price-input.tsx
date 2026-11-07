'use client';

import { useRef, useState, type Ref } from 'react';

import type { TextLanguage } from '@/lib/client-texts';

// Mission 143 (I6) — un prix se saisit lisiblement dans le Live : un champ texte au clavier
// numérique (`inputmode="numeric"`), les chiffres groupés pendant la frappe (« 790 000 », « 790,000 »
// en anglais), le curseur gardé à sa place ; la valeur envoyée reste le nombre entier, sans
// séparateur, dans un champ caché du même nom (le serveur la relit comme avant) ; le champ visible se
// désigne par `data-price-for` (les tests e2e le remplissent). `required` marque
// le champ pour la barre du Live, qui grise « Valider » tant qu'il est vide.

const GROUP: Record<TextLanguage, string> = { fr: ' ', en: ',' };
export const MAX_PRICE_DIGITS = 10;

export function priceDigits(raw: string): string {
  return raw
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '')
    .slice(0, MAX_PRICE_DIGITS);
}

export function groupDigits(digits: string, language: TextLanguage): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP[language]);
}

export function PriceInput({
  name,
  language,
  className,
  required = false,
  placeholder = '0',
  defaultValue = null,
  onDigitsChange,
  inputRef,
}: {
  name: string;
  language: TextLanguage;
  className: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: number | null;
  onDigitsChange?: (digits: string) => void;
  // Le champ caché, qui porte la valeur envoyée (sans séparateur).
  inputRef?: Ref<HTMLInputElement>;
}) {
  const [digits, setDigits] = useState(() =>
    defaultValue != null && Number.isFinite(defaultValue)
      ? priceDigits(String(Math.round(defaultValue)))
      : '',
  );
  const visibleRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={visibleRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={groupDigits(digits, language)}
        data-price-input=""
        data-price-for={name}
        data-price-required={required ? 'true' : undefined}
        data-price-empty={digits === '' || Number(digits) === 0 ? 'true' : 'false'}
        onChange={(event) => {
          const element = event.currentTarget;
          // Le curseur reste après le même nombre de chiffres qu'avant le regroupement.
          const caret = element.selectionStart ?? element.value.length;
          const digitsBefore = priceDigits(element.value.slice(0, caret)).length;
          const next = priceDigits(element.value);
          setDigits(next);
          onDigitsChange?.(next);
          requestAnimationFrame(() => {
            const input = visibleRef.current;
            if (!input) return;
            const shown = groupDigits(next, language);
            let position = 0;
            let seen = 0;
            while (position < shown.length && seen < digitsBefore) {
              if (/\d/.test(shown[position]!)) seen += 1;
              position += 1;
            }
            input.setSelectionRange(position, position);
          });
        }}
        className={className}
      />
      <input ref={inputRef} type="hidden" name={name} value={digits} />
    </>
  );
}

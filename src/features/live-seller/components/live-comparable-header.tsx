'use client';

import { useLiveTexts } from '@/features/live-seller/components/live-texts';

// Read-only identity facts shown under the photos. Never editable.
//
// MISSION 51 — l'en-tête ne connaît plus le concurrent, seulement le TITRE déjà choisi
// par l'appelant : un libellé neutre COMPOSÉ avant la révélation (jamais le titre du
// portail, qui porte le prix), le titre réel après. Le type projeté garantit la règle en
// amont — un écran pré-révélation n'a pas de champ `title` à passer.
export function LiveComparableHeader({
  heading,
  city,
  district,
}: {
  heading: string;
  city: string | null;
  district: string | null;
}) {
  const { texts } = useLiveTexts();
  const location = [district, city].filter(Boolean).join(', ') || texts.common.unknownLocation;
  return (
    <div className="flex shrink-0 flex-col">
      <h3 className="font-title text-lg leading-snug font-semibold text-zinc-900 sm:text-xl stage:text-white">
        {heading}
      </h3>
      <p className="text-sm text-zinc-500 stage:text-white/60">{location}</p>
    </div>
  );
}

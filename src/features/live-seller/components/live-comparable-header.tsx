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
  const location = [district, city].filter(Boolean).join(', ') || 'Localisation inconnue';
  return (
    <div className="flex flex-col gap-0.5">
      <h3 className="font-title text-2xl leading-snug font-semibold text-zinc-900 stage:text-white">
        {heading}
      </h3>
      <p className="text-base text-zinc-500 stage:text-white/60">{location}</p>
    </div>
  );
}

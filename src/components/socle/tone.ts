// La refonte, lot A — la teinte d'un bloc du socle. Elle suit CE QU'IL Y A À FAIRE, jamais le nom
// de la personne (maquettes REFONTE-1, 5, 6, 7 et 8) : orange pour ce qui est à regarder avant
// d'agir (« Financement à valider », « 2 prix ont changé »), verte pour une bonne nouvelle (« Veut
// visiter », « Mandat signé »), la couleur de l'agence pour le reste. La couleur ne porte jamais
// le sens seule : le texte le dit (M55, M129).
export type Tone = 'plain' | 'watch' | 'good';

// Le rond aux initiales.
export const MARK_TONES: Record<Tone, string> = {
  plain: 'bg-brand-soft text-brand-deep stage:bg-brand/15 stage:text-brand',
  good: 'bg-[#E3F4EC] text-[#0B6B4A] stage:bg-emerald-400/15 stage:text-emerald-300',
  watch: 'bg-[#FDEBDD] text-[#9A3A0A] stage:bg-orange-400/15 stage:text-orange-300',
};

// Un chiffre.
export const TEXT_TONES: Record<Tone, string> = {
  plain: 'text-brand-darker stage:text-white',
  good: 'text-[#0B6B4A] stage:text-emerald-300',
  watch: 'text-[#9A3A0A] stage:text-orange-300',
};

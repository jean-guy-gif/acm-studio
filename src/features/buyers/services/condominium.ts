// Mission 151 — la copropriété CONNUE d'un bien vendeur : le bloc « Copropriété » de sa fiche
// (`subject_property_condominiums`, écrit seulement si le conseiller l'a touché ou qu'une fiche
// PDF l'a rempli, M77). Sans ligne, elle est inconnue ; un appartement n'est jamais lu comme une
// copropriété connue. La ligne arrive jointe au bien vendeur, en objet ou en liste selon la
// lecture. Pur.
export type CondominiumEmbed =
  { is_condominium: boolean | null } | { is_condominium: boolean | null }[] | null | undefined;

export function knownCondominium(embed: CondominiumEmbed): boolean | null {
  const row = Array.isArray(embed) ? embed[0] : embed;
  return typeof row?.is_condominium === 'boolean' ? row.is_condominium : null;
}

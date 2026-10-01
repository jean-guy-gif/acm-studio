// Mission 59/60 — le rôle décide de la vue manager et des gestes d'équipe.
//
// Mission 60 §4 a nettoyé l'enum : la base ne stocke plus que {manager, advisor} (owner + admin
// sont devenus manager). Le pont « trois valeurs → deux concepts » de la M59 n'est plus un
// report — c'est la vérité en base. Une seule source.
export function isManagerRole(role: string | null | undefined): boolean {
  return role === 'manager';
}

// Le libellé produit d'un rôle stocké (jamais la valeur DB brute à l'écran).
export function roleLabel(role: string | null | undefined): 'Manager' | 'Conseiller' {
  return isManagerRole(role) ? 'Manager' : 'Conseiller';
}

// Mission 59 jalon 1 — la vue manager, gardée par le RÔLE.
//
// Le schéma stocke TROIS valeurs (owner / admin / advisor, table profiles), mais le produit
// n'en connaît que DEUX (§2 : « un seul niveau, conseiller ou manager »). On fait le pont ICI,
// en LECTURE seule : {owner, admin} → manager, advisor → conseiller. L'owner (créateur de
// l'agence, posé par bootstrap_agency_owner) est donc manager d'office.
//
// ⚠️ CETTE CORRESPONDANCE EST UN REPORT, PAS UNE SOLUTION. Elle suffit pour LIRE (jalon 1).
// Le jalon 2 devra ÉCRIRE un rôle quand un manager donnera le droit à quelqu'un — et là il
// faudra trancher LAQUELLE des valeurs écrire. Recommandation à ce moment-là : NETTOYER l'enum
// vers deux valeurs {manager, advisor} (owner + admin → manager) par une migration, pour que la
// base stocke exactement les deux concepts du produit — une seule source, comme la M55. À
// défaut, choisir 'admin' comme la valeur « manager » écrite et réserver 'owner' au bootstrap.
// Tant que le jalon 2 n'existe pas, on ne fait que lire : ce pont suffit et ne ment pas.
const MANAGER_ROLES = new Set(['owner', 'admin']);

export function isManagerRole(role: string | null | undefined): boolean {
  return role != null && MANAGER_ROLES.has(role);
}

// Le libellé produit d'un rôle stocké (jamais la valeur DB brute à l'écran).
export function roleLabel(role: string | null | undefined): 'Manager' | 'Conseiller' {
  return isManagerRole(role) ? 'Manager' : 'Conseiller';
}

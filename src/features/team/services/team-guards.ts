// Mission 60 §3 — les deux gardes NON NÉGOCIABLES sur le rôle, en logique pure et testable.
//
// Une agence sans manager ne peut plus jamais inviter personne : elle est fermée à clé de
// l'intérieur, et personne ne peut la rouvrir. Donc le DERNIER manager (actif) ne peut ni être
// retiré ni être rétrogradé — y compris par lui-même. Un manager ne peut se retirer/rétrograder
// que s'il en reste un autre.
export type MemberRole = { id: string; role: string; removedAt: string | null };

// Les managers ENCORE actifs (un profil retiré ne « tient » plus l'agence).
export function activeManagers(members: MemberRole[]): MemberRole[] {
  return members.filter((member) => member.removedAt == null && member.role === 'manager');
}

// Vrai si ce membre est le SEUL manager actif : toute action qui lui retirerait son rôle de
// manager (retrait de l'agence OU rétrogradation) doit être refusée.
export function isLastManager(members: MemberRole[], memberId: string): boolean {
  const managers = activeManagers(members);
  return managers.length === 1 && managers[0].id === memberId;
}

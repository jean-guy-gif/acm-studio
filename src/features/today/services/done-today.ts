import { formatRelativeMoment } from '@/lib/format';

// Mission 145 (partie B) — « Fait aujourd'hui » : ce qui a été fait aujourd'hui (jour de Paris),
// barré, avec l'heure, lu dans les faits datés qui existent déjà — une relance (M96), un Point
// marché (M127), une relance, un point de la semaine ou un point proposé à un acquéreur (M135,
// M139), les suites d'une offre (M138), un bien proposé (M134), un courrier remis (M86), une visite
// faite (M119, M139). Même périmètre que les tâches ; dans « Toute l'agence », le prénom de qui l'a
// fait, pour ne pas contacter deux fois le même client ; une visite faite et un courrier remis
// n'ont pas d'auteur en base : « dossier de … », le conseiller attitré (décision du 07/11). Pur.

export type DoneFact = {
  at: string;
  title: string;
  // L'auteur en base, s'il y en a un.
  authorId: string | null;
  // Les conseillers attitrés du dossier ou de l'acquéreur : le périmètre « Mes tâches », et
  // « dossier de … » quand le fait n'a pas d'auteur.
  ownerIds: string[];
};

export type DoneLine = { key: string; title: string; detail: string };

export function doneToday(
  facts: readonly DoneFact[],
  options: {
    scope: 'mine' | 'agency';
    advisorId: string;
    firstNames: ReadonlyMap<string, string>;
    now: Date;
  },
): DoneLine[] {
  const nameOf = (id: string | null | undefined) => (id ? options.firstNames.get(id) : undefined);
  return facts
    .filter((fact) => options.scope === 'agency' || fact.ownerIds.includes(options.advisorId))
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((fact, index) => {
      const time = formatRelativeMoment(fact.at, options.now).replace(/^aujourd’hui /, '');
      const author = nameOf(fact.authorId);
      const owner = nameOf(fact.ownerIds[0]);
      const who =
        options.scope !== 'agency'
          ? null
          : author
            ? `par ${author}`
            : owner
              ? `dossier de ${owner}`
              : null;
      return {
        key: `${fact.at}-${index}`,
        title: fact.title,
        detail: [time, who].filter(Boolean).join(' · '),
      };
    });
}

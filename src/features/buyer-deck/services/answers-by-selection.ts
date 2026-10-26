// Essai de Jean-Guy (26/10) — « Ce qu'il a répondu », groupé par sélection : la plus récente en
// premier ; dans chaque groupe, les réponses dans l'ordre reçu (les plus récentes d'abord). Pur.
export type AnswerGroup<T> = { selectionId: string; selectionAt: string; answers: T[] };

export function answersBySelection<T extends { selectionId: string; selectionAt: string }>(
  answers: T[],
): AnswerGroup<T>[] {
  const groups = new Map<string, AnswerGroup<T>>();
  for (const answer of answers) {
    const group = groups.get(answer.selectionId) ?? {
      selectionId: answer.selectionId,
      selectionAt: answer.selectionAt,
      answers: [],
    };
    group.answers.push(answer);
    groups.set(answer.selectionId, group);
  }
  return [...groups.values()].sort((a, b) => b.selectionAt.localeCompare(a.selectionAt));
}

// Lu par pages de 1 000, jusqu'à la dernière (M108) : une liste coupée sans le dire ferait mentir un
// compte ou une tâche. Une page en échec vaut « en échec » pour toute la lecture (M98).
export const PAGE_SIZE = 1000;

export async function readPages<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<{ data: T[]; error: boolean }> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) return { data: [], error: true };
    all.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return { data: all, error: false };
  }
}

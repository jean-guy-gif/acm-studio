// La sauvegarde, étape 3 (Jean-Guy, 28/11) — les fichiers du stockage, bucket par bucket. La copie
// d'un bucket par la CLI s'arrête net à la première erreur passagère (« HttpClientError: Decode
// error (200 GET …/project-photos/….jpg) », sur des fichiers sains : deux échecs de suite le 28/11,
// à 894 puis à 136 photos sur 1 042). Elle se reprend désormais, jusqu'à trois fois, sur les seuls
// fichiers manquants ; l'échec n'est dit qu'après la troisième reprise, avec la liste. Ce qui est
// sauvegardé et la vérification ne changent pas. Pur : la copie et la lecture des fichiers sont
// passées en paramètre.

// Les objets du stockage, en lecture seule : le bucket, le nom, la taille enregistrée par le
// stockage (le 28/11, la même que celle des 1 062 fichiers de la sauvegarde du 25/11).
export const STORAGE_OBJECTS_SQL = `
select bucket_id as b, name as n, (metadata->>'size')::bigint as s
from storage.objects
order by 1, 2`;

/** @typedef {{ name: string, size: number | null }} StorageObject */
/** @typedef {{ kind: 'bucket' | 'dir' | 'file', path: string }} CopyStep */

// Après la copie du bucket entier, au plus trois reprises.
export const STORAGE_RETRIES = 3;

// Les objets dont le fichier manque, ou n'a pas la taille enregistrée (une copie coupée).
// `sizeOf(name)` rend la taille du fichier copié, ou null s'il n'existe pas.
/**
 * @param {StorageObject[]} objects
 * @param {(name: string) => number | null} sizeOf
 * @returns {StorageObject[]}
 */
export function missingObjects(objects, sizeOf) {
  return objects.filter((object) => {
    const size = sizeOf(object.name);
    if (size === null || size === undefined) return true;
    return object.size !== null && object.size !== undefined && size !== object.size;
  });
}

// Le moins de copies possible pour les seuls objets manquants : un dossier dont tout manque se
// copie d'un coup, au plus haut (le bucket entier quand tout manque, la copie d'avant) ; ailleurs,
// fichier par fichier. Rend des pas `{ kind: 'bucket' | 'dir' | 'file', path }`, dans l'ordre des
// noms.
/**
 * @param {StorageObject[]} objects
 * @param {StorageObject[]} missing
 * @returns {CopyStep[]}
 */
export function copyPlan(objects, missing) {
  const lost = new Set(missing.map((object) => object.name));
  /** @type {CopyStep[]} */
  const plan = [];
  /** @param {string} prefix @param {StorageObject[]} under */
  const walk = (prefix, under) => {
    const lostHere = under.filter((object) => lost.has(object.name));
    if (lostHere.length === 0) return;
    if (lostHere.length === under.length) {
      plan.push(prefix === '' ? { kind: 'bucket', path: '' } : { kind: 'dir', path: prefix });
      return;
    }
    const start = prefix === '' ? 0 : prefix.length + 1;
    /** @type {Map<string, StorageObject>} */
    const files = new Map();
    /** @type {Map<string, StorageObject[]>} */
    const dirs = new Map();
    for (const object of under) {
      const rest = object.name.slice(start);
      const slash = rest.indexOf('/');
      if (slash < 0) {
        files.set(rest, object);
      } else {
        const name = rest.slice(0, slash);
        dirs.set(name, [...(dirs.get(name) ?? []), object]);
      }
    }
    for (const name of [...new Set([...files.keys(), ...dirs.keys()])].sort()) {
      const file = files.get(name);
      if (file && lost.has(file.name)) plan.push({ kind: 'file', path: file.name });
      const children = dirs.get(name);
      if (children) walk(prefix === '' ? name : `${prefix}/${name}`, children);
    }
  };
  walk('', objects);
  return plan;
}

// Copie un bucket : d'abord en entier, puis, s'il manque des fichiers, jusqu'à `retries` reprises
// des seuls manquants. Une copie qui échoue ne retient pas les suivantes : la reprise d'après
// reprend ce qui manque encore. `onRetry(reprise, manquants)` est appelé avant chaque reprise.
// Rend les objets encore manquants et le nombre de passages.
/**
 * @param {{
 *   objects: StorageObject[],
 *   copy: (step: CopyStep) => void,
 *   sizeOf: (name: string) => number | null,
 *   retries?: number,
 *   onRetry?: (retry: number, missing: StorageObject[]) => void,
 * }} options
 * @returns {{ missing: StorageObject[], passes: number }}
 */
export function copyBucket({
  objects,
  copy,
  sizeOf,
  retries = STORAGE_RETRIES,
  onRetry = () => {},
}) {
  let missing = missingObjects(objects, sizeOf);
  let passes = 0;
  while (missing.length > 0 && passes <= retries) {
    if (passes > 0) onRetry(passes, missing);
    for (const step of copyPlan(objects, missing)) {
      try {
        copy(step);
      } catch {
        // La reprise suivante dira ce qui manque encore.
      }
    }
    passes += 1;
    missing = missingObjects(objects, sizeOf);
  }
  return { missing, passes };
}

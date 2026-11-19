// Correctifs 161 — un contrôle, pour les tests seulement, d'une réponse d'Academia contre les schémas
// de Laurent (`missions/academia-api-laurent/schema-*.json`, JSON Schema 2020-12). Seuls les mots-clés
// que ces schémas emploient sont lus ; un mot-clé inconnu fait échouer le contrôle, plutôt que de
// laisser passer une réponse sans la vérifier. Sans dépendance.

type Schema = Record<string, unknown>;

const KNOWN = new Set([
  '$id',
  '$schema',
  'title',
  'type',
  'properties',
  'required',
  'additionalProperties',
  'items',
  'anyOf',
  'const',
  'enum',
  'pattern',
  'format',
  'minimum',
  'maximum',
  'multipleOf',
  'propertyNames',
]);

const typeOf = (value: unknown): string =>
  value === null
    ? 'null'
    : Array.isArray(value)
      ? 'array'
      : typeof value === 'number'
        ? Number.isInteger(value)
          ? 'integer'
          : 'number'
        : typeof value;

const matchesType = (value: unknown, type: string) => {
  const actual = typeOf(value);
  return actual === type || (type === 'number' && actual === 'integer');
};

// Les écarts trouvés, un par ligne, avec le chemin du champ (vide : conforme).
export function schemaErrors(schema: Schema, value: unknown, path = '$'): string[] {
  const errors: string[] = [];
  for (const key of Object.keys(schema)) {
    if (!KNOWN.has(key)) errors.push(`${path} : mot-clé non lu « ${key} »`);
  }
  if ('anyOf' in schema) {
    const options = schema.anyOf as Schema[];
    if (!options.some((option) => schemaErrors(option, value, path).length === 0)) {
      errors.push(`${path} : aucune des formes permises`);
    }
  }
  if ('type' in schema) {
    const types = Array.isArray(schema.type) ? (schema.type as string[]) : [schema.type as string];
    if (!types.some((type) => matchesType(value, type))) {
      errors.push(`${path} : ${typeOf(value)} au lieu de ${types.join(' ou ')}`);
      return errors;
    }
  }
  if ('const' in schema && value !== schema.const) errors.push(`${path} : autre que la constante`);
  if ('enum' in schema && !(schema.enum as unknown[]).includes(value)) {
    errors.push(`${path} : « ${String(value)} » hors liste`);
  }
  if (typeof value === 'string' && typeof schema.pattern === 'string') {
    if (!new RegExp(schema.pattern, 'u').test(value)) errors.push(`${path} : forme refusée`);
  }
  if (typeof value === 'number') {
    if (typeof schema.minimum === 'number' && value < schema.minimum)
      errors.push(`${path} : trop petit`);
    if (typeof schema.maximum === 'number' && value > schema.maximum)
      errors.push(`${path} : trop grand`);
    if (typeof schema.multipleOf === 'number' && value % schema.multipleOf !== 0) {
      errors.push(`${path} : pas un multiple de ${schema.multipleOf}`);
    }
  }
  if (Array.isArray(value) && schema.items) {
    value.forEach((item, i) =>
      errors.push(...schemaErrors(schema.items as Schema, item, `${path}[${i}]`)),
    );
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const properties = (schema.properties ?? {}) as Record<string, Schema>;
    for (const name of (schema.required ?? []) as string[]) {
      if (!(name in record)) errors.push(`${path}.${name} : manquant`);
    }
    for (const [name, field] of Object.entries(record)) {
      if (schema.propertyNames) {
        errors.push(...schemaErrors(schema.propertyNames as Schema, name, `${path}{${name}}`));
      }
      if (name in properties) {
        errors.push(...schemaErrors(properties[name]!, field, `${path}.${name}`));
      } else if (schema.additionalProperties === false) {
        errors.push(`${path}.${name} : champ en trop`);
      } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        errors.push(
          ...schemaErrors(schema.additionalProperties as Schema, field, `${path}.${name}`),
        );
      }
    }
  }
  return errors;
}

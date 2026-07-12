// Converts a textarea value (one item per line) into a trimmed string array,
// dropping empty lines. Used for the strengths / weaknesses jsonb columns.
export function textareaToArray(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

// Converts stored jsonb (expected to be a string array) back into textarea text,
// one item per line. Anything that is not a string array yields an empty string.
export function arrayToTextarea(value: unknown): string {
  if (!Array.isArray(value)) {
    return '';
  }
  return value.filter((item): item is string => typeof item === 'string').join('\n');
}

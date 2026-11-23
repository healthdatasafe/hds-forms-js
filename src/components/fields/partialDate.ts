/**
 * A date sub-field whose eventType schema takes a partial date (allergy `lastOccurrence`: `YYYY`, `YYYY-MM` or
 * `YYYY-MM-DD`): a `string` schema with a `pattern` that a year and a month alone match.
 */
export function acceptsPartialDate (schema: any): boolean {
  if (schema?.type !== 'string' || typeof schema.pattern !== 'string') return false;
  try {
    const re = new RegExp(schema.pattern);
    return re.test('2024') && re.test('2024-03') && re.test('2024-03-12');
  } catch {
    return false;
  }
}

export type ValueEvent = { id: string; type: string; time: number; streamIds?: string[]; content?: unknown; trashed?: boolean; clientData?: Record<string, any> };

/** A document's values: those read from it, and those of hers it also prints (already in her record) */
export interface DocumentValues {
  source: ValueEvent[];
  matched: ValueEvent[];
}

/**
 * The values of a document (data-model 4.26.0, PROVENANCE.md): `source`, written from it (its `clientData.related`
 * names it with a `sourceKey` of the document, or the document's `hdsDocumentValues` index lists it); `matched`, values
 * of hers it also prints, found already in her record (`hdsPrintedIn` names it). A dangling index entry is skipped.
 */
export function documentValuesOf (document: { id: string; clientData?: Record<string, any> }, events: readonly ValueEvent[]): DocumentValues {
  const id = document.id;
  const index = document.clientData?.hdsDocumentValues;
  const indexed = new Set(index != null && typeof index === 'object' ? Object.keys(index) : []);
  const marker = `:document:${id}:`;
  const source: ValueEvent[] = [];
  const matched: ValueEvent[] = [];
  for (const e of events) {
    if (e.trashed === true || e.id === id) continue;
    const cd = e.clientData ?? {};
    const fromIt = (cd.related?.[id] === true && typeof cd.sourceKey === 'string' && cd.sourceKey.includes(marker)) || indexed.has(e.id);
    if (fromIt) source.push(e);
    else if (cd.hdsPrintedIn?.[id] === true) matched.push(e);
  }
  const byTime = (a: ValueEvent, b: ValueEvent): number => a.time - b.time;
  return { source: source.sort(byTime), matched: matched.sort(byTime) };
}

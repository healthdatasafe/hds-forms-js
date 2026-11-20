/**
 * A notation picker as a facet filter over a list of candidate records (plan 134).
 *
 * Each candidate is one record the person may save (a Creighton code, a bleeding letter, or both), described by its
 * facets (`base: '6'`, `colour: 'C'`, `sticker: …`). A row of the picker shows the values of one or more facets.
 * Nothing here knows a method: the candidates, rows and orders come from the model data (`methodNotation.ts`).
 *
 * - A value is shown only when some candidate is still possible with it, so a choice "disappears" by construction
 *   and no tap leads to a dead end.
 * - In a facet that has a picked value, only that value is shown; tapping it again releases it and the others return.
 * - A derived row (the sticker) filters, is never required, and shows the resolved record's value as picked.
 */

/** A facet value. An unset facet is absent, never ''. */
export type FacetValue = string;

export interface NotationCandidate {
  id: string;
  facets: Record<string, FacetValue>;
  payload: unknown;
}

export interface NotationRow {
  id: string;
  label?: any;
  facets: string[];
  /** A filter only: never required to resolve a record. */
  derived?: boolean;
}

export type Selection = Record<string, FacetValue>;

/** Candidates still possible: every picked facet equal. */
export function compatible<C extends NotationCandidate> (candidates: C[], selection: Selection): C[] {
  const picked = Object.entries(selection);
  return candidates.filter(c => picked.every(([f, v]) => c.facets[f] === v));
}

/**
 * A facet's values to show, in `order`: the picked one alone when the facet is picked; otherwise every value some
 * candidate compatible with the selection plus that value holds.
 */
export function choices (candidates: NotationCandidate[], selection: Selection, facet: string, order: FacetValue[]): FacetValue[] {
  if (selection[facet] != null) return [selection[facet]];
  const possible = new Set<FacetValue>();
  for (const c of compatible(candidates, selection)) {
    const v = c.facets[facet];
    if (v != null) possible.add(v);
  }
  return order.filter(v => possible.has(v));
}

/** Tap: sets the value, or removes it when it is the picked one. */
export function toggle (selection: Selection, facet: string, value: FacetValue): Selection {
  const next = { ...selection };
  if (next[facet] === value) delete next[facet];
  else next[facet] = value;
  return next;
}

function derivedFacets (rows: NotationRow[]): Set<string> {
  return new Set(rows.filter(r => r.derived).flatMap(r => r.facets));
}

/**
 * The record picked: the one candidate whose non-derived facets are exactly the selection's (a derived value in the
 * selection must match too). Null while the picks are incomplete or match nothing.
 */
export function resolve<C extends NotationCandidate> (candidates: C[], rows: NotationRow[], selection: Selection): C | null {
  const derived = derivedFacets(rows);
  const wanted = Object.entries(selection).filter(([f]) => !derived.has(f));
  if (wanted.length === 0) return null;
  const found = compatible(candidates, selection).filter(c =>
    Object.keys(c.facets).filter(f => !derived.has(f)).length === wanted.length);
  return found.length === 1 ? found[0] : null;
}

/** The selection that shows a candidate as picked (edit, prefill): its non-derived facets. */
export function selectionOf (candidate: NotationCandidate, rows: NotationRow[]): Selection {
  const derived = derivedFacets(rows);
  return Object.fromEntries(Object.entries(candidate.facets).filter(([f]) => !derived.has(f)));
}

/** The value a row's facet shows as picked: the selection's, else (derived row) the resolved record's. */
export function pickedValue (row: NotationRow, facet: string, selection: Selection, resolved: NotationCandidate | null): FacetValue | undefined {
  if (selection[facet] != null) return selection[facet];
  return row.derived ? resolved?.facets[facet] : undefined;
}

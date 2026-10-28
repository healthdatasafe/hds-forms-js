import { useEffect, useRef, useState } from 'react';
import { getHDSModel } from 'hds-lib';

/** Fill all fields or none: shown under a nested group that is started but not complete. */
export const ALL_OR_NOTHING_HINT = { en: 'Fill in all these fields, or none.', fr: 'Remplissez tous ces champs, ou aucun.' };

/** The eventType's JSON schema (object types only), or undefined when the model has none. */
export function eventTypeObjectSchema (eventType?: string): any {
  if (!eventType) return undefined;
  try {
    const typeDef = getHDSModel().eventTypes.getEventTypeDefinition(eventType);
    return typeDef?.type === 'object' ? typeDef : undefined;
  } catch {
    return undefined;
  }
}

function isEmpty (v: any): boolean {
  return v == null || (typeof v === 'object' && Object.keys(v).length === 0);
}

function isComplete (v: any, required: string[]): boolean {
  return required.every((k) => v[k] != null && v[k] !== '');
}

/**
 * A nested object group the eventType declares with `required` keys (e.g. `intake.frequency`:
 * times + period + periodUnit) is all or nothing: the group keeps the person's partial entry as
 * a local draft and reports it upward only once every required key is set, so a partial object
 * is never written. With no `required`, every change goes straight up, as before.
 *
 * `empty` is what the caller emits for "no value" (`null` for composites, `undefined` for
 * companion fields). A value set from outside (edit, pre-fill) replaces the draft.
 */
export function useAllOrNothing (value: any, required: string[] | undefined, onChange: (v: any) => void, empty: null | undefined) {
  const [draft, setDraft] = useState<any>(isEmpty(value) ? empty : value);
  const lastEmitted = useRef<any>(isEmpty(value) ? empty : value);
  useEffect(() => {
    // A parent drops an emptied key, so `undefined` comes back for an emitted `null`: same value.
    // (Hence a host clearing the form while a group holds a partial draft leaves that draft.)
    if (value !== lastEmitted.current && !(isEmpty(value) && isEmpty(lastEmitted.current))) {
      lastEmitted.current = value;
      setDraft(isEmpty(value) ? empty : value);
    }
  }, [value, empty]);

  const gated = Array.isArray(required) && required.length > 0;
  const started = !isEmpty(draft);
  const incomplete = gated && started && !isComplete(draft, required!);

  function update (next: any) {
    const normalized = isEmpty(next) ? empty : next;
    setDraft(normalized);
    const out = gated && !isEmpty(normalized) && !isComplete(normalized, required!) ? empty : normalized;
    lastEmitted.current = out;
    onChange(out);
  }

  /** A required key is required on screen once the group is started. */
  function isFieldRequired (key: string): boolean {
    return gated && started && required!.includes(key);
  }

  return { draft: draft ?? {}, update, incomplete, isFieldRequired };
}

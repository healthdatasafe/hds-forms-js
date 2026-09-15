import { getHDSModel, localizeText } from 'hds-lib';
import { getCompanionSchema, extractCompanionDefaults } from './companionFields';

const l = localizeText;

/**
 * A datasource concept fixed by the form author, so the respondent is not asked
 * to find it themselves.
 *
 * An intake form asking "how many IVF cycles have you had?" wants one numeric
 * field. The model's answer is `treatment-coded` with the regimen pinned to IVF
 * and `count: N` — but without a pin the respondent is shown a concept search
 * box and has to locate "In vitro fertilization" before the count field appears.
 *
 * Stored at `section.itemCustomizations[itemKey].pin`, alongside `labels` and
 * `context`. `ItemCustomization` carries an index signature, so this needs no
 * hds-lib change.
 *
 * ## Why the concept is stored, not just its id
 *
 * The obvious shape is `{ datasource, hdsId }` resolved at render time. There is
 * no route to resolve it with: datasets-service exposes `GET /<kind>?search=` and
 * `GET /<kind>/sources`, and nothing that looks a concept up by id (checked
 * 2026-09-15). An id-only pin would need a new endpoint plus a deploy before any
 * form could use it, and would put a network round-trip in front of a field whose
 * value is already known.
 *
 * Storing the resolved concept also matches what the form already persists: on
 * selection `DatasetSearch` copies the datasource's `valueFields` into the event,
 * so a pinned answer and a searched-for answer submit byte-identical values. The
 * concept id travels inside the snapshot, since `hdsId` is one of those
 * `valueFields` on every datasource.
 *
 * The cost is that a pin does not follow an upstream relabelling — it holds the
 * label as it read at authoring time. That is the same staleness every already-
 * submitted event carries, and codes/`hdsId` stay correct regardless.
 */
export interface ItemPin {
  /**
   * Datasource key the concept belongs to. Must equal the item's own
   * `datasource`; a mismatch is a form-authoring error and renders as one
   * rather than silently falling back to the search box.
   */
  datasource: string;
  /**
   * The concept, in the shape a respondent's selection would have produced —
   * the datasource's `valueFields` copied off the search result.
   */
  value: Record<string, any>;
}

/** Narrow an untyped `itemCustomizations[key].pin` to an ItemPin. */
export function asItemPin (raw: unknown): ItemPin | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const pin = raw as Partial<ItemPin>;
  if (typeof pin.datasource !== 'string' || !pin.datasource) return undefined;
  if (!pin.value || typeof pin.value !== 'object') return undefined;
  return { datasource: pin.datasource, value: pin.value as Record<string, any> };
}

/**
 * Display label for a pinned concept, read through the datasource's own
 * `displayFields.label` so it matches what the search dropdown would have shown.
 */
export function pinDisplayLabel (pin: ItemPin): string {
  let labelField = 'label';
  try {
    const config = getHDSModel().datasources.forKey(pin.datasource, false);
    const raw = config?.displayFields?.label;
    if (typeof raw === 'string') labelField = raw;
    else if (raw && typeof raw === 'object') labelField = l(raw as any) || 'label';
  } catch { /* model not loaded — fall back to `label` */ }
  const text = pin.value[labelField];
  if (typeof text === 'object' && text !== null) return l(text as any) || '';
  return String(text ?? '');
}

/**
 * The value a pinned field submits when the respondent never touches it, with
 * companion defaults (route, doseUnit, …) pre-filled off the concept exactly as
 * `handleSelect` does for a searched-for selection.
 *
 * Returns the companion-wrapped object when the event type has companions, and
 * the bare concept when it does not.
 */
export function buildPinnedValue (pin: ItemPin, eventType?: string): Record<string, any> {
  const companionSchema = getCompanionSchema(eventType);
  if (!companionSchema) return pin.value;
  const combined: Record<string, any> = { [companionSchema.datasourceProp]: pin.value };
  for (const [key, obj] of Object.entries(extractCompanionDefaults(companionSchema, pin.value))) {
    combined[key] = obj;
  }
  return combined;
}

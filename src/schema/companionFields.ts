import { getHDSModel, localizeText } from 'hds-lib';

const l = localizeText;

export interface CompanionProperty {
  key: string;
  schema: any;
}

export interface CompanionSchema {
  datasourceProp: string;
  companions: CompanionProperty[];
  /** Top-level properties not asked for, whose values an edit carries through unchanged. */
  hidden: string[];
}

/**
 * Medication properties a datasource search does not ask for (data-model 3.46.0). The host's own screens write a
 * dose's status and skip reason, a stop, an order's status and the regimen's timing and course; rendered here they
 * would be raw inputs on every coded medication form, and a half-filled `bounds` (its `dependencies` / `not` rules
 * are not all-or-nothing) would write an invalid event. `subKeys` are hidden inside each object companion
 * (`intake`, `posology`). Both are kept as they are on edit.
 */
const MEDICATION_SUB_KEYS = ['timeOfDay', 'when', 'bounds'];
const HIDDEN_COMPANIONS: Record<string, { companions: string[]; subKeys: string[] }> = {
  'medication/coded-v1': { companions: ['status', 'skipReason', 'stopReason'], subKeys: MEDICATION_SUB_KEYS },
  'medication/prescription-v1': { companions: ['status', 'statusChanged', 'stopReason'], subKeys: MEDICATION_SUB_KEYS }
};

function withoutSubKeys (schema: any, subKeys: string[]): any {
  if (schema?.type !== 'object' || !schema.properties) return schema;
  const properties = Object.fromEntries(Object.entries(schema.properties).filter(([k]) => !subKeys.includes(k)));
  return { ...schema, properties };
}

/**
 * Discover companion properties from an event type schema.
 * For datasource-search items, the event type is an object with multiple properties.
 * The first required property (e.g. "drug") is filled by the datasource search.
 * Other properties (e.g. "intake") are companion fields the user fills manually.
 */
export function getCompanionSchema (eventType?: string): CompanionSchema | null {
  if (!eventType) return null;
  try {
    const model = getHDSModel();
    const typeDef = model.eventTypes.getEventTypeDefinition(eventType);
    if (!typeDef || typeDef.type !== 'object' || !typeDef.properties) return null;
    const required = typeDef.required || [];
    const datasourceProp = required[0];
    if (!datasourceProp) return null;
    const hiding = HIDDEN_COMPANIONS[eventType];
    const companions: CompanionProperty[] = [];
    const hidden: string[] = [];
    for (const [key, schema] of Object.entries(typeDef.properties)) {
      if (key === datasourceProp) continue;
      if (hiding?.companions.includes(key)) {
        hidden.push(key);
        continue;
      }
      companions.push({ key, schema: hiding ? withoutSubKeys(schema, hiding.subKeys) : schema as any });
    }
    if (companions.length === 0) return null;
    return { datasourceProp, companions, hidden };
  } catch {
    return null;
  }
}

/**
 * Extract pre-fill values for companion fields from a datasource search result item.
 * Matches top-level properties of the item against sub-properties of each companion schema.
 * e.g. item.route → intake.route, item.doseUnit → intake.doseUnit
 */
export function extractCompanionDefaults (companionSchema: CompanionSchema, item: Record<string, any>): Record<string, any> {
  const defaults: Record<string, any> = {};
  for (const { key, schema } of companionSchema.companions) {
    if (schema.type !== 'object' || !schema.properties) continue;
    const obj: Record<string, any> = {};
    for (const prop of Object.keys(schema.properties)) {
      if (item[prop] !== undefined) obj[prop] = item[prop];
    }
    if (Object.keys(obj).length > 0) defaults[key] = obj;
  }
  return defaults;
}

/**
 * Get localized label for an enum value using event type extras.
 * Falls back to the raw value if no extra is found.
 */
export function getEnumLabel (enumValue: string): string {
  try {
    const model = getHDSModel();
    const extra = model.eventTypes.getEventTypeExtra(enumValue);
    if (extra?.name) return l(extra.name) || extra.symbol || enumValue;
    if (extra?.symbol) return extra.symbol;
  } catch { /* ignore */ }
  return enumValue;
}

/** Convert a schema property key to a human-readable label */
export function keyToLabel (key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
}

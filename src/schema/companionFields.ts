import { getHDSModel, localizeText } from 'hds-lib';

const l = localizeText;

export interface CompanionProperty {
  key: string;
  schema: any;
}

export interface CompanionSchema {
  datasourceProp: string;
  companions: CompanionProperty[];
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
    const companions: CompanionProperty[] = [];
    for (const [key, schema] of Object.entries(typeDef.properties)) {
      if (key === datasourceProp) continue;
      companions.push({ key, schema: schema as any });
    }
    if (companions.length === 0) return null;
    return { datasourceProp, companions };
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

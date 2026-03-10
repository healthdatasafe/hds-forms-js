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
export declare function getCompanionSchema(eventType?: string): CompanionSchema | null;
/**
 * Extract pre-fill values for companion fields from a datasource search result item.
 * Matches top-level properties of the item against sub-properties of each companion schema.
 * e.g. item.route → intake.route, item.doseUnit → intake.doseUnit
 */
export declare function extractCompanionDefaults(companionSchema: CompanionSchema, item: Record<string, any>): Record<string, any>;
/**
 * Get localized label for an enum value using event type extras.
 * Falls back to the raw value if no extra is found.
 */
export declare function getEnumLabel(enumValue: string): string;
/** Convert a schema property key to a human-readable label */
export declare function keyToLabel(key: string): string;

import type { ItemDef } from './itemDefToSchema';
/**
 * Prefill form values from existing Pryv events.
 * Maps events back to form field values using itemDef keys.
 */
export declare function prefillFromEvents(itemDefs: Array<{
    key: string;
    itemDef: ItemDef;
}>, events: Array<{
    type: string;
    streamIds: string[];
    content: any;
    time?: number;
}>): Record<string, any>;
/**
 * Match events to item defs and return both values and event references.
 * Used for prefilling and for knowing which events to update/delete on submit.
 */
export declare function matchEventsToItemDefs(itemDefs: Array<{
    key: string;
    itemDef: ItemDef;
}>, events: Array<{
    id?: string;
    type: string;
    streamIds: string[];
    content: any;
    time?: number;
}>): {
    values: Record<string, any>;
    eventIds: Record<string, string>;
    eventTypes: Record<string, string>;
};
/**
 * Compute the list of API actions (create/update/delete) for a form submission.
 * Compares current form data against existing event IDs to determine the right action.
 */
export declare function formDataToActions(itemDefs: Array<{
    key: string;
    itemDef: ItemDef;
}>, formData: Record<string, any>, existingEventIds: Record<string, string>, time?: number): Array<{
    action: 'create' | 'update' | 'delete';
    key: string;
    params: Record<string, any>;
}>;
/**
 * Convert form submission data to a batch of Pryv event API calls.
 * Returns an array of event objects ready for Pryv batch creation.
 * @deprecated Use formDataToActions for create/update/delete support
 */
export declare function formDataToEventBatch(itemDefs: Array<{
    key: string;
    itemDef: ItemDef;
}>, formData: Record<string, any>, time?: number): Array<{
    streamIds: string[];
    type: string;
    content: any;
    time?: number;
}>;

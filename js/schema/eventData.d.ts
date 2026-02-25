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
 * Convert form submission data to a batch of Pryv event API calls.
 * Returns an array of event objects ready for Pryv batch creation.
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

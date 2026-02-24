import type { ItemDef } from './itemDefToSchema';

/**
 * Prefill form values from existing Pryv events.
 * Maps events back to form field values using itemDef keys.
 */
export function prefillFromEvents (
  itemDefs: Array<{ key: string; itemDef: ItemDef }>,
  events: Array<{ type: string; streamIds: string[]; content: any; time?: number }>
): Record<string, any> {
  const values: Record<string, any> = {};

  for (const { key, itemDef } of itemDefs) {
    const eventType = itemDef.data.eventType;
    const streamId = (itemDef.data as any).streamId;

    if (!eventType || !streamId) continue;

    // Find the most recent matching event
    const matching = events
      .filter(e => e.type === eventType && e.streamIds.includes(streamId))
      .sort((a, b) => (b.time || 0) - (a.time || 0));

    if (matching.length > 0) {
      values[key] = matching[0].content;
    }
  }

  return values;
}

/**
 * Convert form submission data to a batch of Pryv event API calls.
 * Returns an array of event objects ready for Pryv batch creation.
 */
export function formDataToEventBatch (
  itemDefs: Array<{ key: string; itemDef: ItemDef }>,
  formData: Record<string, any>,
  time?: number
): Array<{ streamIds: string[]; type: string; content: any; time?: number }> {
  const events: Array<{ streamIds: string[]; type: string; content: any; time?: number }> = [];
  const eventTime = time || Math.floor(Date.now() / 1000);

  for (const { key, itemDef } of itemDefs) {
    const value = formData[key];
    if (value === undefined || value === null) continue;

    const template = itemDef.eventTemplate();
    events.push({
      streamIds: template.streamIds as string[],
      type: template.type as string,
      content: value,
      time: eventTime
    });
  }

  return events;
}

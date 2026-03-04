import type { ItemDef } from './itemDefToSchema';

/**
 * Get the possible event types for an item def.
 * Falls back to eventTemplate().type if data.eventType is not set.
 * For items with variations, includes all variation event types.
 */
function getEventTypes (itemDef: ItemDef): string[] {
  if (itemDef.data.eventType) return [itemDef.data.eventType];
  const variations = (itemDef.data as any).variations?.eventType;
  if (variations?.options) {
    return variations.options.map((o: any) => o.value).filter(Boolean);
  }
  const template = itemDef.eventTemplate();
  if (template.type) return [template.type as string];
  return [];
}

/**
 * Prefill form values from existing Pryv events.
 * Maps events back to form field values using itemDef keys.
 */
export function prefillFromEvents (
  itemDefs: Array<{ key: string; itemDef: ItemDef }>,
  events: Array<{ type: string; streamIds: string[]; content: any; time?: number }>
): Record<string, any> {
  const result = matchEventsToItemDefs(itemDefs, events);
  return result.values;
}

/**
 * Match events to item defs and return both values and event references.
 * Used for prefilling and for knowing which events to update/delete on submit.
 */
export function matchEventsToItemDefs (
  itemDefs: Array<{ key: string; itemDef: ItemDef }>,
  events: Array<{ id?: string; type: string; streamIds: string[]; content: any; time?: number }>
): { values: Record<string, any>; eventIds: Record<string, string>; eventTypes: Record<string, string> } {
  const values: Record<string, any> = {};
  const eventIds: Record<string, string> = {};
  const eventTypes: Record<string, string> = {};

  for (const { key, itemDef } of itemDefs) {
    const possibleTypes = getEventTypes(itemDef);
    const streamId = itemDef.data.streamId;

    if (possibleTypes.length === 0 || !streamId) continue;

    // Find the most recent matching event (any of the variation types)
    const matching = events
      .filter(e => possibleTypes.includes(e.type) && e.streamIds?.includes(streamId))
      .sort((a, b) => (b.time || 0) - (a.time || 0));

    if (matching.length > 0) {
      const event = matching[0];
      // activity/plain has null content — represent as checked checkbox
      if (event.type === 'activity/plain') {
        values[key] = true;
      } else {
        values[key] = event.content;
      }
      if (event.id) {
        eventIds[key] = event.id;
      }
      // Track matched event type (useful for prefilling variation selectors)
      eventTypes[key] = event.type;
    }
  }

  return { values, eventIds, eventTypes };
}

/**
 * Compute the list of API actions (create/update/delete) for a form submission.
 * Compares current form data against existing event IDs to determine the right action.
 */
export function formDataToActions (
  itemDefs: Array<{ key: string; itemDef: ItemDef }>,
  formData: Record<string, any>,
  existingEventIds: Record<string, string>,
  time?: number
): Array<{ action: 'create' | 'update' | 'delete'; key: string; params: Record<string, any> }> {
  const actions: Array<{ action: 'create' | 'update' | 'delete'; key: string; params: Record<string, any> }> = [];
  const eventTime = time || Math.floor(Date.now() / 1000);

  for (const { key, itemDef } of itemDefs) {
    const value = formData[key];
    const existingId = existingEventIds[key];
    const template = itemDef.eventTemplate();
    // Use variation override from formData if present, otherwise default template type
    const eventType = formData[`${key}__eventType`] || template.type as string;

    // activity/plain: checkbox true = create/keep, false/undefined = delete if exists
    if (eventType === 'activity/plain') {
      if (value === true) {
        if (existingId) {
          // Already exists — no action needed
          continue;
        }
        actions.push({
          action: 'create',
          key,
          params: {
            streamIds: template.streamIds,
            type: eventType,
            content: null,
            time: eventTime
          }
        });
      } else {
        if (existingId) {
          actions.push({ action: 'delete', key, params: { id: existingId } });
        }
      }
      continue;
    }

    // Value cleared or empty — delete existing if any
    if (value === undefined || value === null || value === '') {
      if (existingId) {
        actions.push({ action: 'delete', key, params: { id: existingId } });
      }
      continue;
    }

    // Has value
    if (existingId) {
      // Update existing event (include type if variation override is set)
      const update: Record<string, any> = { content: value };
      if (formData[`${key}__eventType`]) update.type = eventType;
      actions.push({
        action: 'update',
        key,
        params: { id: existingId, update }
      });
    } else {
      // Create new event
      actions.push({
        action: 'create',
        key,
        params: {
          streamIds: template.streamIds as string[],
          type: eventType,
          content: value,
          time: eventTime
        }
      });
    }
  }

  return actions;
}

/**
 * Convert form submission data to a batch of Pryv event API calls.
 * Returns an array of event objects ready for Pryv batch creation.
 * @deprecated Use formDataToActions for create/update/delete support
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
    const eventType = template.type as string;

    // activity/plain expects null content; checkbox true = create event, false = skip
    if (eventType === 'activity/plain') {
      if (value === false) continue;
      events.push({
        streamIds: template.streamIds as string[],
        type: eventType,
        content: null,
        time: eventTime
      });
      continue;
    }

    events.push({
      streamIds: template.streamIds as string[],
      type: eventType,
      content: value,
      time: eventTime
    });
  }

  return events;
}

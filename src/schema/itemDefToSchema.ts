import { localizeText } from 'hds-lib';
import { schemaFor, type ItemData, type JSONSchema } from './schemas';

type localizableText = { en: string; fr?: string; es?: string };

const l = localizeText;

// --- Type definitions ---

interface VariationOption {
  value: string;
  label: localizableText;
}

interface Variations {
  eventType?: {
    label: localizableText;
    options: VariationOption[];
  };
}

export interface ItemDefData {
  type: ItemData['type'];
  label: localizableText;
  description?: localizableText;
  canBeNull?: boolean;
  streamId?: string;
  eventType?: string;
  options?: Array<{ value: string | number; label: localizableText }>;
  variations?: Variations;
  composite?: Record<string, ItemData>;
  datasource?: string;
}

export interface ItemDef {
  data: ItemDefData;
  /**
   * Returns a `{ streamIds, type }` template event. Optional `context`
   * (Plan 46 §2.1 / D3) lets the caller emit events placed at a descendant
   * streamId of the itemDef's canonical home — must be `streamId` or
   * descendant; throws otherwise.
   */
  eventTemplate: (opts?: { context?: string }) => Record<string, unknown>;
  /**
   * Plan 46 D3 — D3-aware event matching. Returns true if the event resolves
   * to this itemDef via the parent walk-up resolution rule.
   */
  matchesEvent?: (event: { type?: string; streamIds?: string[] }) => boolean;
}

interface ProcessDataResult {
  createEvent?: boolean;
}

interface JsonFormResult {
  schema: JSONSchema | Record<string, unknown>;
  processData?: (data: Record<string, unknown> | boolean) => ProcessDataResult;
}

export interface JsonFormForItemDefResult {
  schema: JSONSchema | Record<string, unknown>;
  eventDataForFormData: (formData: Record<string, unknown>) => Record<string, unknown> | null;
}

// --- Functions ---

export function jsonFormForItemDef (itemDef: ItemDef, opts: { context?: string } = {}): JsonFormForItemDefResult {
  const jsonFrom = _jsonFormForItemDef(itemDef);

  function eventDataForFormData (formData: Record<string, unknown>): Record<string, unknown> | null {
    const copyFormData = structuredClone(formData);
    if (jsonFrom.processData) {
      const status = jsonFrom.processData(copyFormData);
      if (status.createEvent === false) return null;
    }
    const eventData = itemDef.eventTemplate(opts.context ? { context: opts.context } : undefined);
    Object.assign(eventData, copyFormData);
    return eventData;
  }
  return { schema: jsonFrom.schema, eventDataForFormData };
}

function _jsonFormForItemDef (itemDef: ItemDef): JsonFormResult {
  const type = itemDef.data.type;
  const content = schemaFor(itemDef.data as ItemData);

  // special cases ----

  if (type === 'checkbox' && itemDef.data.eventType === 'activity/plain') {
    return {
      schema: content,
      processData: (data: Record<string, unknown> | boolean): ProcessDataResult => {
        if (data === true) return {};
        return { createEvent: false };
      }
    };
  }

  if (type === 'select' && itemDef.data.eventType === 'ratio/generic') {
    const relativeTo = Math.max(...(itemDef.data.options || []).map(o => Number(o.value)));
    return {
      schema: {
        title: '',
        type: 'object',
        properties: {
          content: {
            title: '',
            type: 'object',
            properties: {
              value: content
            },
            required: ['value']
          }
        }
      },
      processData: (data: Record<string, unknown> | boolean): ProcessDataResult => {
        const objData = data as Record<string, unknown>;
        if (objData.content == null) return { createEvent: false };
        (objData.content as Record<string, unknown>).relativeTo = relativeTo;
        return {};
      }
    };
  }

  // ---------- standard case

  const result: JsonFormResult = {
    schema: {
      title: '',
      type: 'object',
      properties: {
        content
      },
      required: ['content']
    }
  };

  if (itemDef.data?.variations?.eventType) {
    const eventTypesV = itemDef.data.variations.eventType;
    (result.schema as Record<string, unknown>).properties = {
      ...((result.schema as Record<string, unknown>).properties as Record<string, unknown>),
      type: {
        title: l(eventTypesV.label) || '',
        type: 'string',
        oneOf: eventTypesV.options.map((o) => ({ const: o.value, title: l(o.label) || '' }))
      }
    };
  }
  return result;
}

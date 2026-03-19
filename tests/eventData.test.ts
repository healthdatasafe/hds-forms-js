import { describe, it, expect } from 'vitest';
import { prefillFromEvents, matchEventsToItemDefs, formDataToActions, formDataToEventBatch } from '../src/schema/eventData';
import type { ItemDef } from '../src/schema/itemDefToSchema';

function makeItemDef (overrides: Partial<ItemDef['data']> & { streamId?: string }): ItemDef {
  const { streamId, ...dataOverrides } = overrides;
  return {
    data: {
      type: 'number',
      label: { en: 'Test' },
      eventType: 'note/txt',
      ...dataOverrides,
      ...(streamId ? { streamId } : {})
    } as any,
    eventTemplate: () => ({
      streamIds: [streamId || 'stream-1'],
      type: dataOverrides.eventType || 'note/txt'
    })
  };
}

describe('prefillFromEvents', () => {
  it('finds most recent matching event', () => {
    const itemDefs = [
      { key: 'temp', itemDef: makeItemDef({ eventType: 'temperature/c', streamId: 's1' }) }
    ];
    const events = [
      { type: 'temperature/c', streamIds: ['s1'], content: 36.5, time: 100 },
      { type: 'temperature/c', streamIds: ['s1'], content: 37.2, time: 200 }
    ];
    const result = prefillFromEvents(itemDefs, events);
    expect(result.temp).toBe(37.2);
  });

  it('returns empty for no matches', () => {
    const itemDefs = [
      { key: 'temp', itemDef: makeItemDef({ eventType: 'temperature/c', streamId: 's1' }) }
    ];
    const events = [
      { type: 'note/txt', streamIds: ['s2'], content: 'hello', time: 100 }
    ];
    const result = prefillFromEvents(itemDefs, events);
    expect(result).toEqual({});
  });

  it('handles multiple itemDefs', () => {
    const itemDefs = [
      { key: 'temp', itemDef: makeItemDef({ eventType: 'temperature/c', streamId: 's1' }) },
      { key: 'note', itemDef: makeItemDef({ eventType: 'note/txt', streamId: 's2' }) }
    ];
    const events = [
      { type: 'temperature/c', streamIds: ['s1'], content: 37.0, time: 100 },
      { type: 'note/txt', streamIds: ['s2'], content: 'feeling ok', time: 150 }
    ];
    const result = prefillFromEvents(itemDefs, events);
    expect(result.temp).toBe(37.0);
    expect(result.note).toBe('feeling ok');
  });

  it('skips itemDefs without eventType or streamId', () => {
    const noType = makeItemDef({});
    delete (noType.data as any).eventType;
    const itemDefs = [{ key: 'x', itemDef: noType }];
    const result = prefillFromEvents(itemDefs, [{ type: 'note/txt', streamIds: ['s1'], content: 'hi' }]);
    expect(result).toEqual({});
  });
});

describe('formDataToEventBatch', () => {
  it('creates correct event objects', () => {
    const itemDefs = [
      { key: 'temp', itemDef: makeItemDef({ eventType: 'temperature/c', streamId: 's1' }) }
    ];
    const formData = { temp: 37.5 };
    const events = formDataToEventBatch(itemDefs, formData, 1000);
    expect(events).toEqual([
      { streamIds: ['s1'], type: 'temperature/c', content: 37.5, time: 1000 }
    ]);
  });

  it('skips null/undefined values', () => {
    const itemDefs = [
      { key: 'a', itemDef: makeItemDef({ eventType: 'note/txt', streamId: 's1' }) },
      { key: 'b', itemDef: makeItemDef({ eventType: 'temperature/c', streamId: 's2' }) }
    ];
    const formData = { a: null, b: undefined };
    const events = formDataToEventBatch(itemDefs, formData, 1000);
    expect(events).toEqual([]);
  });

  it('uses provided time', () => {
    const itemDefs = [
      { key: 'x', itemDef: makeItemDef({ eventType: 'note/txt', streamId: 's1' }) }
    ];
    const events = formDataToEventBatch(itemDefs, { x: 'hello' }, 42);
    expect(events[0].time).toBe(42);
  });

  it('defaults to current time when not provided', () => {
    const before = Math.floor(Date.now() / 1000);
    const itemDefs = [
      { key: 'x', itemDef: makeItemDef({ eventType: 'note/txt', streamId: 's1' }) }
    ];
    const events = formDataToEventBatch(itemDefs, { x: 'hello' });
    const after = Math.floor(Date.now() / 1000);
    expect(events[0].time).toBeGreaterThanOrEqual(before);
    expect(events[0].time).toBeLessThanOrEqual(after);
  });
});

// Helper for items with variations (no single eventType, uses variations.eventType)
function makeVariationItemDef (streamId: string, options: Array<{ value: string; label: any }>): ItemDef {
  return {
    data: {
      type: 'number',
      label: { en: 'Weight' },
      streamId,
      variations: {
        eventType: {
          label: { en: 'Unit' },
          options
        }
      }
    } as any,
    eventTemplate: () => ({
      streamIds: [streamId],
      type: options[0].value // default to first option
    })
  };
}

describe('matchEventsToItemDefs — variations', () => {
  it('returns matched event type for variation items', () => {
    const itemDef = makeVariationItemDef('body', [
      { value: 'mass/kg', label: { en: 'kg' } },
      { value: 'mass/lb', label: { en: 'lb' } }
    ]);
    const itemDefs = [{ key: 'weight', itemDef }];
    const events = [
      { id: 'e1', type: 'mass/lb', streamIds: ['body'], content: 150, time: 100 }
    ];
    const result = matchEventsToItemDefs(itemDefs, events);
    expect(result.values.weight).toBe(150);
    expect(result.eventIds.weight).toBe('e1');
    expect(result.eventTypes.weight).toBe('mass/lb');
  });

  it('picks most recent among variation types', () => {
    const itemDef = makeVariationItemDef('body', [
      { value: 'mass/kg', label: { en: 'kg' } },
      { value: 'mass/lb', label: { en: 'lb' } }
    ]);
    const itemDefs = [{ key: 'weight', itemDef }];
    const events = [
      { id: 'e1', type: 'mass/kg', streamIds: ['body'], content: 70, time: 100 },
      { id: 'e2', type: 'mass/lb', streamIds: ['body'], content: 155, time: 200 }
    ];
    const result = matchEventsToItemDefs(itemDefs, events);
    expect(result.values.weight).toBe(155);
    expect(result.eventTypes.weight).toBe('mass/lb');
  });
});

describe('formDataToActions — variations', () => {
  it('uses __eventType override for create', () => {
    const itemDef = makeVariationItemDef('body', [
      { value: 'mass/kg', label: { en: 'kg' } },
      { value: 'mass/lb', label: { en: 'lb' } }
    ]);
    const itemDefs = [{ key: 'weight', itemDef }];
    const formData = { weight: 155, weight__eventType: 'mass/lb' };
    const actions = formDataToActions(itemDefs, formData, {}, 1000);
    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe('create');
    expect(actions[0].params.type).toBe('mass/lb');
    expect(actions[0].params.content).toBe(155);
  });

  it('uses __eventType override for update (includes type in update)', () => {
    const itemDef = makeVariationItemDef('body', [
      { value: 'mass/kg', label: { en: 'kg' } },
      { value: 'mass/lb', label: { en: 'lb' } }
    ]);
    const itemDefs = [{ key: 'weight', itemDef }];
    const formData = { weight: 70, weight__eventType: 'mass/kg' };
    const actions = formDataToActions(itemDefs, formData, { weight: 'e1' }, 1000);
    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe('update');
    expect(actions[0].params.update.content).toBe(70);
    expect(actions[0].params.update.type).toBe('mass/kg');
  });

  it('defaults to template type when no __eventType', () => {
    const itemDef = makeVariationItemDef('body', [
      { value: 'mass/kg', label: { en: 'kg' } },
      { value: 'mass/lb', label: { en: 'lb' } }
    ]);
    const itemDefs = [{ key: 'weight', itemDef }];
    const formData = { weight: 70 };
    const actions = formDataToActions(itemDefs, formData, {}, 1000);
    expect(actions[0].params.type).toBe('mass/kg'); // first option = template default
  });

  it('does not include type in update when no __eventType', () => {
    const itemDef = makeVariationItemDef('body', [
      { value: 'mass/kg', label: { en: 'kg' } },
      { value: 'mass/lb', label: { en: 'lb' } }
    ]);
    const itemDefs = [{ key: 'weight', itemDef }];
    const formData = { weight: 70 };
    const actions = formDataToActions(itemDefs, formData, { weight: 'e1' }, 1000);
    expect(actions[0].params.update.type).toBeUndefined();
  });
});

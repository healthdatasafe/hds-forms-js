import { describe, it, expect } from 'vitest';
import { prefillFromEvents, formDataToEventBatch } from '../src/schema/eventData';
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

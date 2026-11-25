// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import creighton from './fixtures/creighton-v1.json';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/** A proposed cervical-fluid observation: said as it was read, corrected in the method it was read in. */
let lang: 'en' | 'fr' = 'en';
const ITEM = 'body-vulva-mucus-inspect';
const TYPE = 'vulva-mucus-inspect/9d-vector';
const settings: Record<string, unknown> = {};
const methodDefs: Record<string, any> = {
  creighton: structuredClone(creighton),
  billings: { methodId: 'billings', name: { en: 'Billings' }, components: [{ field: 'mucus', options: [{ value: 'dry', label: { en: 'Dry' } }, { value: 'peak', label: { en: 'Peak' } }] }] }
};
let loaded = true;
const engine = {
  methodIds: ['creighton', 'billings'],
  getMethodDef: (id: string) => methodDefs[id],
  dimensionNames: [],
  dimensions: {},
  fromVector: () => ({ data: 'peak', matchDistance: 0.1 })
};
const itemDef = {
  key: ITEM,
  data: { type: 'convertible', label: { en: 'Cervical fluid' }, streamId: ITEM, eventType: TYPE, 'converter-engine': { key: 'euclidian-distance', version: 'v0', models: 'cervical-fluid' } }
};

vi.mock('hds-lib', async (importOriginal) => {
  const real: any = await importOriginal();
  return {
    ...real,
    localizeText: (t: any) => (typeof t === 'string' ? t : (t?.[lang] ?? t?.en ?? '')),
    HDSSettings: { isHooked: true, get: (k: string) => settings[k] },
    getHDSModel: () => ({
      itemsDefs: { forKey: (k: string) => (k === ITEM ? itemDef : null) },
      eventTypes: { getEventTypeDefinition: () => null },
      converters: {
        getEngine: () => (loaded ? engine : undefined),
        ensureEngine: async () => engine,
        convertMethodToEvent: async (_k: string, method: string, observation: any) => ({ content: { vectors: { v: 1 }, source: { key: method, sourceData: observation } } })
      }
    }),
    eventToShortText: () => 'Peak (Billings <- Creighton)',
    cmcConversation: { ...real.cmcConversation, checkValueProposal: () => null }
  };
});

const { proposalText } = await import('../src/conversation/labels');
const { ValueCorrectionEditor } = await import('../src/conversation/ValueCorrectionEditor');

const value = (sourceData: any, annotations?: any) => ({ vectors: { wetness: 1 }, source: { key: 'creighton', sourceData, ...(annotations ? { annotations } : {}) } });
const textOf = (content: any, itemKey = ITEM) => proposalText({ itemKey, type: TYPE, content });

let root: Root | null = null;
let container: HTMLElement | null = null;
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  lang = 'en';
  loaded = true;
  for (const k of Object.keys(settings)) delete settings[k];
});
async function edit (content: any, onSubmit: (c: any) => void = () => {}): Promise<HTMLElement> {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(<ValueCorrectionEditor proposal={{ itemKey: ITEM, type: TYPE, content }} onSubmit={onSubmit} onCancel={() => {}} />); });
  for (let i = 0; i < 4; i++) await act(async () => {});
  return container;
}
const button = (c: HTMLElement, name: RegExp) => Array.from(c.querySelectorAll('button')).find(b => name.test(b.getAttribute('aria-label') ?? b.textContent ?? ''));

describe('proposalText of an observation', () => {
  it('says the frequency, each differently, and nothing when there is none', () => {
    expect(textOf(value('10KL', { frequency: 'X2' }))).toBe('10KL — Stretchy, clear, lubricative · X2 — seen twice (Creighton)');
    expect(textOf(value('10KL', { frequency: 'X1' }))).toContain(' · X1 — seen once (');
    expect(textOf(value('10KL'))).toBe('10KL — Stretchy, clear, lubricative (Creighton)');
    lang = 'fr';
    expect(textOf(value('10KL', { frequency: 'AD' }))).toContain(' · AD — toute la journée (4 fois ou plus) (');
  });

  it('is never the observation converted to the method she displays', () => {
    settings[`preferred-display-${ITEM}`] = 'billings';
    expect(textOf(value('10KL', { frequency: 'X2' }))).not.toContain('Billings');
  });

  it('reads the { mucus } shape, and says an annotation this version does not know', () => {
    expect(textOf(value({ mucus: '10KL' }, { frequency: 'X2' }))).toContain('10KL — Stretchy');
    expect(textOf(value('10KL', { frequency: 'X9', other: 'abc' }))).toContain(' · X9 · abc (');
  });

  it('says the code and the frequency while the converter is not loaded', () => {
    loaded = false;
    expect(textOf(value('10KL', { frequency: 'X2' }))).toBe('10KL · X2 (creighton)');
    expect(textOf(value({ mucus: '10KL' }))).toBe('Peak (Billings <- Creighton)');
  });

  it('leaves a value without a method, and any other item, to hds-lib', () => {
    expect(textOf({ vectors: { wetness: 1 } })).toBe('Peak (Billings <- Creighton)');
    expect(textOf(value('10KL'), 'other-item')).toBe('Peak (Billings <- Creighton)');
  });
});

describe('correcting an observation', () => {
  it('opens in the method it was read in, over her own', async () => {
    settings[`preferred-input-${ITEM}`] = 'billings';
    const out = vi.fn();
    const c = await edit(value('10KL', { frequency: 'X2' }), out);
    expect(c.textContent).toContain('Creighton');
    expect(c.querySelector('select')).toBeNull();
    expect(button(c, /^Peak$/)).toBeUndefined();
    expect(button(c, /X2 — seen twice/)!.getAttribute('aria-pressed')).toBe('true');
    await act(async () => { button(c, /X2 — seen twice/)!.click(); });
    await act(async () => { button(c, /X3 — seen three times/)!.click(); });
    for (let i = 0; i < 3; i++) await act(async () => {});
    await act(async () => { c.querySelector('form')!.requestSubmit(); });
    expect(out.mock.calls[0][0].content.source).toEqual({ key: 'creighton', sourceData: '10KL', annotations: { frequency: 'X3' } });
  });

  it('opens in her own method when the value names none, or one the converter does not know', async () => {
    settings[`preferred-input-${ITEM}`] = 'billings';
    const unknown = await edit({ vectors: { wetness: 1 }, source: { key: 'gone', sourceData: 'x' } });
    expect(unknown.textContent).toContain('Billings');
    act(() => root?.unmount());
    const none = await edit({ vectors: { wetness: 1 } });
    expect(none.textContent).toContain('Billings');
    expect(button(none, /Peak/)).toBeDefined();
    expect(button(none, /seen/)).toBeUndefined();
  });
});

// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * B-2026-10-26-10: editing a cervical-fluid observation recorded in another method (a Mira
 * reading) must keep the person's own method (Creighton), not switch to the recorded one;
 * the recorded method is shown as a note. The method is read from hds-lib's key
 * (`preferred-input-body-vulva-mucus-inspect`), with the converter-model key as a fallback.
 */
const settings: Record<string, unknown> = {};
const mockSettings = {
  isHooked: true,
  get: (key: string) => settings[key]
};

const methodDefs: Record<string, any> = {
  creighton: {
    methodId: 'creighton',
    name: { en: 'Creighton' },
    components: [{ field: 'mucus', options: [{ value: '8C', label: { en: '8C — Cloudy' } }, { value: '10KL', label: { en: '10KL — Stretchy, clear' } }] }]
  },
  mira: {
    methodId: 'mira',
    name: { en: 'Mira' },
    components: [{ field: 'mucus', options: [{ value: 'creamy', label: { en: 'Creamy' } }, { value: 'eggwhite', label: { en: 'Egg white' } }] }]
  },
  _raw: { methodId: '_raw', name: { en: 'HDS native' } }
};

const engine = {
  methodIds: ['creighton', 'mira'],
  getMethodDef: (id: string) => methodDefs[id],
  dimensionNames: [],
  dimensions: {},
  fromVector: vi.fn((methodId: string) => ({ data: methodId === 'creighton' ? '8C' : 'creamy', matchDistance: 0.1 }))
};

const convertMethodToEvent = vi.fn(async (_itemKey: string, method: string, observation: any) => ({
  content: { vectors: { v: 1 }, source: { key: method, sourceData: observation } }
}));

vi.mock('hds-lib', async (importOriginal) => {
  const orig: any = await importOriginal();
  return {
    ...orig,
    HDSSettings: mockSettings,
    getHDSModel: () => ({
      converters: {
        ensureEngine: async () => engine,
        convertMethodToEvent
      }
    })
  };
});

vi.mock('../src/components/StampGridPicker', () => ({
  StampGridPicker: () => null,
  isRepresentationAvailable: () => false
}));

const { Convertible } = await import('../src/components/fields/Convertible');
const { preferredMethodKeys, readPreferredMethod, initialConvertibleMethod, observationLabel } = await import('../src/schema/convertibleMethod');
const { CERVICAL_FLUID_METHOD_KEY, CERVICAL_FLUID_METHOD_LEGACY_KEY } = await import('hds-lib');

const MIRA_VALUE = { vectors: { v: 0.4 }, source: { key: 'mira', sourceData: 'creamy' } };
const converterEngine = { key: 'euclidian-distance', version: 'v1', models: 'cervical-fluid' };

let root: Root | null = null;
let container: HTMLElement | null = null;

async function mount (node: React.ReactNode): Promise<HTMLElement> {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(node); });
  await act(async () => {}); // engine load effect
  return container;
}

beforeEach(() => {
  for (const k of Object.keys(settings)) delete settings[k];
  mockSettings.isHooked = true;
  engine.fromVector.mockClear();
  convertMethodToEvent.mockClear();
});

afterEach(() => {
  act(() => { root?.unmount(); });
  container?.remove();
  root = null;
  container = null;
});

describe('preferred method keys', () => {
  it('reads the canonical hds-lib key, then the legacy converter-model key', () => {
    expect(CERVICAL_FLUID_METHOD_KEY).toBe('preferred-input-body-vulva-mucus-inspect');
    expect(preferredMethodKeys(undefined, 'cervical-fluid')).toEqual([CERVICAL_FLUID_METHOD_KEY, CERVICAL_FLUID_METHOD_LEGACY_KEY]);
    expect(preferredMethodKeys('body-vulva-mucus-inspect', 'cervical-fluid')).toEqual([CERVICAL_FLUID_METHOD_KEY, CERVICAL_FLUID_METHOD_LEGACY_KEY]);
    expect(preferredMethodKeys('mood-item', 'mood')).toEqual(['preferred-input-mood-item', 'preferred-input-mood']);
  });

  it('prefers the canonical key over the legacy one', () => {
    settings[CERVICAL_FLUID_METHOD_LEGACY_KEY] = 'mira';
    expect(readPreferredMethod(undefined, 'cervical-fluid')).toBe('mira');
    settings[CERVICAL_FLUID_METHOD_KEY] = 'creighton';
    expect(readPreferredMethod(undefined, 'cervical-fluid')).toBe('creighton');
  });

  it('reads nothing when settings are not hooked or empty', () => {
    settings[CERVICAL_FLUID_METHOD_KEY] = '';
    expect(readPreferredMethod(undefined, 'cervical-fluid')).toBeUndefined();
    settings[CERVICAL_FLUID_METHOD_KEY] = 'creighton';
    mockSettings.isHooked = false;
    expect(readPreferredMethod(undefined, 'cervical-fluid')).toBeUndefined();
  });
});

describe('initialConvertibleMethod', () => {
  const methodIds = ['creighton', 'mira'];
  it('keeps the preferred method over the recorded one', () => {
    expect(initialConvertibleMethod({ preferred: 'creighton', sourceKey: 'mira', methodIds })).toBe('creighton');
  });
  it('falls back to the recorded method without a preference', () => {
    expect(initialConvertibleMethod({ sourceKey: 'mira', methodIds })).toBe('mira');
  });
  it('ignores a preference the engine does not know', () => {
    expect(initialConvertibleMethod({ preferred: 'gone', sourceKey: 'mira', methodIds })).toBe('mira');
    expect(initialConvertibleMethod({ preferred: 'gone', methodIds })).toBe('');
  });
  it('accepts _raw', () => {
    expect(initialConvertibleMethod({ preferred: '_raw', sourceKey: 'mira', methodIds })).toBe('_raw');
  });
});

describe('observationLabel', () => {
  it('localizes a single-component observation', () => {
    expect(observationLabel(methodDefs.mira, 'creamy')).toBe('Creamy');
    expect(observationLabel(methodDefs.mira, 'unknown')).toBe('unknown');
  });
  it('joins the components of a multi-component observation', () => {
    const def = { components: [{ field: 'a', options: [{ value: 1, label: { en: 'One' } }] }, { field: 'b', options: [{ value: 'x', label: { en: 'Ex' } }] }] };
    expect(observationLabel(def, { a: 1, b: 'x' })).toBe('One · Ex');
  });
});

describe('Convertible — editing an observation recorded in another method', () => {
  it('keeps the preferred method, highlights her words and notes the recorded method', async () => {
    settings[CERVICAL_FLUID_METHOD_KEY] = 'creighton';
    const onChange = vi.fn();
    const c = await mount(<Convertible label='Cervical fluid' value={MIRA_VALUE} onChange={onChange} converterEngine={converterEngine} />);

    // No method picker (her method is set): its name is shown
    expect(c.textContent).toContain('Creighton');
    expect(c.querySelectorAll('select').length).toBe(1);
    // The observation select is Creighton's, on the closest match of the stored vector
    const select = c.querySelector('select')!;
    expect(Array.from(select.options).map(o => o.value)).toContain('8C');
    expect(select.value).toBe('8C');
    expect(engine.fromVector).toHaveBeenCalledWith('creighton', MIRA_VALUE.vectors);
    // The recorded method is a note
    expect(c.textContent).toContain('Recorded as: Creamy');
    expect(c.textContent).toContain('(Mira)');
    // Opening alone does not rewrite the stored value
    expect(onChange).not.toHaveBeenCalled();
  });

  it('honours the legacy key when the canonical one is not set', async () => {
    settings[CERVICAL_FLUID_METHOD_LEGACY_KEY] = 'creighton';
    const c = await mount(<Convertible label='Cervical fluid' value={MIRA_VALUE} onChange={() => {}} converterEngine={converterEngine} />);
    expect(c.querySelector('select')!.value).toBe('8C');
  });

  it("reads the field's own item key first", async () => {
    settings['preferred-input-my-mucus-item'] = 'mira';
    settings[CERVICAL_FLUID_METHOD_KEY] = 'creighton';
    const c = await mount(<Convertible label='Cervical fluid' itemKey='my-mucus-item' value={MIRA_VALUE} onChange={() => {}} converterEngine={converterEngine} />);
    expect(c.querySelector('select')!.value).toBe('creamy');
    expect(c.textContent).toContain('Source: Creamy');
    expect(c.textContent).not.toContain('Recorded as');
  });

  it('writes a new choice in her method', async () => {
    settings[CERVICAL_FLUID_METHOD_KEY] = 'creighton';
    const onChange = vi.fn();
    const c = await mount(<Convertible label='Cervical fluid' value={MIRA_VALUE} onChange={onChange} converterEngine={converterEngine} />);
    const select = c.querySelector('select')!;
    await act(async () => {
      select.value = '10KL';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(convertMethodToEvent).toHaveBeenCalledWith('cervical-fluid', 'creighton', '10KL');
    expect(onChange).toHaveBeenCalledWith({ vectors: { v: 1 }, source: { key: 'creighton', sourceData: '10KL' } });
  });

  it('opens on the recorded method when no method is set (picker shown)', async () => {
    const c = await mount(<Convertible label='Cervical fluid' value={MIRA_VALUE} onChange={() => {}} converterEngine={converterEngine} />);
    const selects = c.querySelectorAll('select');
    expect(selects.length).toBe(2);
    expect((selects[0] as HTMLSelectElement).value).toBe('mira');
    expect((selects[1] as HTMLSelectElement).value).toBe('creamy');
    expect(c.textContent).toContain('Source: Creamy');
  });
});

// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import creightonFixture from './fixtures/creighton-v2.json';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Plan 134 B4: the Creighton three-row entry, built from the generated definition (tests/fixtures/creighton-v2.json).
 */
const creighton: any = structuredClone(creightonFixture);
const femm = {
  methodId: 'femm',
  name: { en: 'FEMM' },
  components: [{ field: 'mucus', options: [{ value: '1', label: { en: 'Dry' } }, { value: '2', label: { en: 'Moist' } }] }]
};
const methodDefs: Record<string, any> = { creighton, femm };

const settings: Record<string, unknown> = {};
const engine = {
  methodIds: ['creighton', 'femm'],
  getMethodDef: (id: string) => methodDefs[id],
  dimensionNames: [],
  dimensions: {},
  fromVector: vi.fn(() => ({ data: '8C' }))
};
const convertMethodToEvent = vi.fn(async (_itemKey: string, method: string, observation: any) => ({
  content: { vectors: { v: 1 }, source: { key: method, sourceData: observation } }
}));

vi.mock('hds-lib', async (importOriginal) => {
  const orig: any = await importOriginal();
  return {
    ...orig,
    localizeText: (t: any) => (typeof t === 'string' ? t : (t?.en ?? '')),
    HDSSettings: { isHooked: true, get: (k: string) => settings[k] },
    getHDSModel: () => ({ converters: { ensureEngine: async () => engine, convertMethodToEvent } })
  };
});

const { MethodNotationPicker } = await import('../src/components/MethodNotationPicker');
const { useMethodNotation } = await import('../src/components/useMethodNotation');
const { Convertible } = await import('../src/components/fields/Convertible');
const { CERVICAL_FLUID_METHOD_KEY } = await import('hds-lib');

const MUCUS = 'body-vulva-mucus-inspect';
const BLEEDING = 'body-vulva-bleeding';
const BROWN = 'body-vulva-bleeding-browndark';

let root: Root | null = null;
let container: HTMLElement | null = null;
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  convertMethodToEvent.mockClear();
  for (const k of Object.keys(settings)) delete settings[k];
});

async function mount (node: React.ReactNode): Promise<HTMLElement> {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(node); });
  for (let i = 0; i < 4; i++) await act(async () => {});
  return container;
}

const row = (el: HTMLElement, id: string) => el.querySelector(`[data-hds-notation-row="${id}"]`) as HTMLElement | null;
const shown = (el: HTMLElement, id: string) => Array.from(row(el, id)?.querySelectorAll('button') ?? []).map(b => b.getAttribute('data-hds-notation-choice'));
const button = (el: HTMLElement, id: string, value: string) => row(el, id)!.querySelector(`[data-hds-notation-choice="${value}"]`) as HTMLButtonElement;
async function tap (el: HTMLElement, id: string, value: string) {
  await act(async () => { button(el, id, value).click(); });
  await act(async () => {});
}

/** The picker as a ⭐ page uses it. */
function Star ({ itemKeys, values = {}, onChange }: { itemKeys: string[]; values?: Record<string, unknown>; onChange: (p: any, s: any) => void }) {
  const notation = useMethodNotation(itemKeys);
  if (notation.status !== 'ready') return <p data-status={notation.status} />;
  return <MethodNotationPicker notation={notation} values={values} onChange={onChange} />;
}

describe('useMethodNotation', () => {
  function Probe ({ itemKeys, methodId }: { itemKeys: string[]; methodId?: string }) {
    const n = useMethodNotation(itemKeys, { methodId });
    return <pre data-n={JSON.stringify({ status: n.status, methodId: n.methodId, covers: n.covers, writes: n.writes })} />;
  }
  const read = (el: HTMLElement) => JSON.parse(el.querySelector('pre')!.getAttribute('data-n')!);

  it('ready for a method with notation: covers mucus and bleeding, writes brown bleeding too', async () => {
    settings[CERVICAL_FLUID_METHOD_KEY] = 'creighton';
    const el = await mount(<Probe itemKeys={[MUCUS, BLEEDING]} />);
    expect(read(el)).toEqual({ status: 'ready', methodId: 'creighton', covers: [MUCUS, BLEEDING], writes: [MUCUS, BLEEDING, BROWN] });
  });

  it('none for a method without notation, or no method', async () => {
    settings[CERVICAL_FLUID_METHOD_KEY] = 'femm';
    expect(read(await mount(<Probe itemKeys={[MUCUS]} />)).status).toBe('none');
    act(() => root?.unmount());
    delete settings[CERVICAL_FLUID_METHOD_KEY];
    expect(read(await mount(<Probe itemKeys={[MUCUS]} />)).status).toBe('none');
  });

  it('a given method wins over hers, and needs no setting (a professional typing a chart)', async () => {
    expect(read(await mount(<Probe itemKeys={[MUCUS, BLEEDING]} methodId='creighton' />)))
      .toEqual({ status: 'ready', methodId: 'creighton', covers: [MUCUS, BLEEDING], writes: [MUCUS, BLEEDING, BROWN] });
    act(() => root?.unmount());
    settings[CERVICAL_FLUID_METHOD_KEY] = 'creighton';
    expect(read(await mount(<Probe itemKeys={[MUCUS]} methodId='femm' />)).status).toBe('none');
  });
});

describe('MethodNotationPicker', () => {
  it('renders the rows from the model, named groups and choices', async () => {
    settings[CERVICAL_FLUID_METHOD_KEY] = 'creighton';
    const el = await mount(<Star itemKeys={[MUCUS, BLEEDING]} onChange={() => {}} />);
    expect(Array.from(el.querySelectorAll('[data-hds-notation-row]')).map(r => r.getAttribute('data-hds-notation-row')))
      .toEqual(['sticker', 'bleeding', 'number', 'letters', 'frequency']);
    expect(shown(el, 'frequency')).toEqual(['X1', 'X2', 'X3', 'AD']);
    expect(button(el, 'frequency', 'AD').getAttribute('aria-label')).toBe('AD — all day (4 times or more)');
    expect(row(el, 'number')!.getAttribute('role')).toBe('group');
    expect(row(el, 'number')!.getAttribute('aria-label')).toBe('Number');
    expect(shown(el, 'number')).toEqual(['0', '2', '2W', '4', '6', '8', '10']);
    expect(shown(el, 'bleeding')).toEqual(['H', 'M', 'L', 'VL', 'B']);
    expect(button(el, 'number', '6').getAttribute('aria-label')).toBe('6 — sticky');
    expect(button(el, 'letters', 'CK').textContent).toBe('C/K');
    for (const b of Array.from(el.querySelectorAll('button'))) expect(b.getAttribute('aria-label')).toBeTruthy();
  });

  it('hides invalid choices; a second tap releases; incomplete patches are all undefined', async () => {
    settings[CERVICAL_FLUID_METHOD_KEY] = 'creighton';
    const calls: any[] = [];
    const el = await mount(<Star itemKeys={[MUCUS, BLEEDING]} onChange={(p, s) => calls.push([p, s])} />);
    await tap(el, 'number', '6');
    expect(shown(el, 'number')).toEqual(['6']);
    expect(button(el, 'number', '6').getAttribute('aria-pressed')).toBe('true');
    // `6` alone is not a record (a stretch number needs a letter)
    expect(calls.at(-1)).toEqual([{ [MUCUS]: undefined, [BLEEDING]: undefined, [BROWN]: undefined }, { empty: false, valid: false, text: undefined }]);
    expect(el.querySelector('[data-hds-notation-record]')!.getAttribute('data-hds-notation-record')).toBe('incomplete');
    expect(convertMethodToEvent).not.toHaveBeenCalled();
    await tap(el, 'letters', 'P');
    expect(shown(el, 'letters')).toEqual(['P', 'C', 'Y']);
    await tap(el, 'letters', 'P');
    await tap(el, 'number', '6');
    expect(shown(el, 'number')).toEqual(['0', '2', '2W', '4', '6', '8', '10']);
    expect(calls.at(-1)[1]).toEqual({ empty: true, valid: false, text: undefined });
  });

  it('a complete record: code and frequency, mucus content with source.annotations, bleeding value, record text', async () => {
    settings[CERVICAL_FLUID_METHOD_KEY] = 'creighton';
    const calls: any[] = [];
    const el = await mount(<Star itemKeys={[MUCUS, BLEEDING]} onChange={(p, s) => calls.push([p, s])} />);
    await tap(el, 'number', '6');
    await tap(el, 'letters', 'C');
    // The code alone is incomplete: the frequency is required (plan 131, Q11)
    expect(calls.at(-1)).toEqual([{ [MUCUS]: undefined, [BLEEDING]: undefined, [BROWN]: undefined }, { empty: false, valid: false, text: undefined }]);
    expect(convertMethodToEvent).not.toHaveBeenCalled();
    expect(el.querySelector('[data-hds-notation-record]')!.getAttribute('data-hds-notation-record')).toBe('incomplete');
    await tap(el, 'frequency', 'X2');
    expect(shown(el, 'frequency')).toEqual(['X2']);
    expect(convertMethodToEvent).toHaveBeenLastCalledWith('cervical-fluid', 'creighton', '6C');
    expect(calls.at(-1)).toEqual([
      { [MUCUS]: { vectors: { v: 1 }, source: { key: 'creighton', sourceData: '6C', annotations: { frequency: 'X2' } } }, [BLEEDING]: undefined, [BROWN]: undefined },
      { empty: false, valid: true, text: '6C X2' }
    ]);
    expect(el.querySelector('[data-hds-notation-record]')!.textContent).toContain('6C X2');
    await tap(el, 'bleeding', 'L');
    expect(calls.at(-1)[0][BLEEDING]).toBe(0.35);
    expect(calls.at(-1)[1].text).toBe('L 6C X2');
    await tap(el, 'bleeding', 'L');
    await tap(el, 'bleeding', 'B');
    expect(calls.at(-1)[0][BROWN]).toBe(true);
    expect(calls.at(-1)[0][BLEEDING]).toBeUndefined();
    await tap(el, 'frequency', 'X2');
    expect(calls.at(-1)[1].valid).toBe(false);
  });

  it('a bleeding letter alone (H) needs no frequency, and the frequency row hides', async () => {
    settings[CERVICAL_FLUID_METHOD_KEY] = 'creighton';
    const calls: any[] = [];
    const el = await mount(<Star itemKeys={[MUCUS, BLEEDING]} onChange={(p, s) => calls.push([p, s])} />);
    await tap(el, 'bleeding', 'H');
    expect(row(el, 'frequency')).toBeNull();
    expect(calls.at(-1)).toEqual([{ [MUCUS]: undefined, [BLEEDING]: 0.75, [BROWN]: undefined }, { empty: false, valid: true, text: 'H' }]);
  });

  it('dry 0 takes no frequency (converter v2, practitioner Q1): the row hides, a frequency picked before is not stored', async () => {
    settings[CERVICAL_FLUID_METHOD_KEY] = 'creighton';
    const calls: any[] = [];
    const el = await mount(<Star itemKeys={[MUCUS, BLEEDING]} onChange={(p, s) => calls.push([p, s])} />);
    await tap(el, 'frequency', 'X2');
    await tap(el, 'number', '0');
    expect(row(el, 'frequency')).toBeNull();
    expect(convertMethodToEvent).toHaveBeenLastCalledWith('cervical-fluid', 'creighton', '0');
    expect(calls.at(-1)).toEqual([
      { [MUCUS]: { vectors: { v: 1 }, source: { key: 'creighton', sourceData: '0' } }, [BLEEDING]: undefined, [BROWN]: undefined },
      { empty: false, valid: true, text: '0' }
    ]);
    // 2 (damp) still takes one
    await tap(el, 'number', '0');
    await tap(el, 'number', '2');
    expect(shown(el, 'frequency')).toEqual(['X2']);
    expect(calls.at(-1)[1]).toEqual({ empty: false, valid: true, text: '2 X2' });
    await tap(el, 'frequency', 'X2');
    expect(calls.at(-1)[1].valid).toBe(false);
  });

  it('opens a stored record as picked: a code not offered (10), its frequency and a bleeding flow', async () => {
    settings[CERVICAL_FLUID_METHOD_KEY] = 'creighton';
    const values = { [MUCUS]: { vectors: {}, source: { key: 'creighton', sourceData: { mucus: '10' }, annotations: { frequency: 'AD' } } }, [BLEEDING]: 0.35 };
    const el = await mount(<Star itemKeys={[MUCUS, BLEEDING]} values={values} onChange={() => {}} />);
    expect(shown(el, 'number')).toEqual(['10']);
    expect(button(el, 'number', '10').getAttribute('aria-pressed')).toBe('true');
    expect(button(el, 'bleeding', 'L').getAttribute('aria-pressed')).toBe('true');
    expect(button(el, 'frequency', 'AD').getAttribute('aria-pressed')).toBe('true');
    expect(el.querySelector('[data-hds-notation-record]')!.textContent).toContain('L 10 AD');
  });

  it('[MNP-REC] a stored record the picker does not offer (H with a mucus code) is shown as recorded, nothing picked (B-2026-11-23-10)', async () => {
    settings[CERVICAL_FLUID_METHOD_KEY] = 'creighton';
    const values = { [MUCUS]: { vectors: {}, source: { key: 'creighton', sourceData: '6C', annotations: { frequency: 'AD' } } }, [BLEEDING]: 0.75 };
    const calls: any[] = [];
    const el = await mount(<Star itemKeys={[MUCUS, BLEEDING]} values={values} onChange={(p, s) => calls.push([p, s])} />);
    expect(el.querySelector('[data-hds-notation-recorded]')!.getAttribute('data-hds-notation-recorded')).toBe('H 6C AD');
    expect(el.textContent).toContain('Recorded as: H 6C AD');
    expect(button(el, 'bleeding', 'H').getAttribute('aria-pressed')).not.toBe('true');
    expect(calls).toEqual([]);
    await tap(el, 'bleeding', 'L');
    expect(el.querySelector('[data-hds-notation-recorded]')).toBeNull();
  });

  it('a stored record that is offered shows no "recorded as" line', async () => {
    settings[CERVICAL_FLUID_METHOD_KEY] = 'creighton';
    const values = { [MUCUS]: { vectors: {}, source: { key: 'creighton', sourceData: '6C', annotations: { frequency: 'AD' } } }, [BLEEDING]: 0.35 };
    const el = await mount(<Star itemKeys={[MUCUS, BLEEDING]} values={values} onChange={() => {}} />);
    expect(el.querySelector('[data-hds-notation-recorded]')).toBeNull();
  });

  it('a stored record without frequency (before plan 131) opens incomplete: the frequency is asked', async () => {
    settings[CERVICAL_FLUID_METHOD_KEY] = 'creighton';
    const values = { [MUCUS]: { vectors: {}, source: { key: 'creighton', sourceData: '6C' } } };
    const el = await mount(<Star itemKeys={[MUCUS, BLEEDING]} values={values} onChange={() => {}} />);
    expect(button(el, 'letters', 'C').getAttribute('aria-pressed')).toBe('true');
    expect(shown(el, 'frequency')).toEqual(['X1', 'X2', 'X3', 'AD']);
    expect(el.querySelector('[data-hds-notation-record]')!.getAttribute('data-hds-notation-record')).toBe('incomplete');
  });
});

describe('Convertible with a method that has notation', () => {
  const converterEngine = { key: 'euclidian-distance', version: 'v1', models: 'cervical-fluid' };

  it('mucus alone on rows with the frequency; incomplete clears the value; complete converts the code', async () => {
    settings[CERVICAL_FLUID_METHOD_KEY] = 'creighton';
    const onChange = vi.fn();
    const el = await mount(<Convertible label='Mucus' value={undefined} onChange={onChange} converterEngine={converterEngine} itemKey={MUCUS} />);
    expect(Array.from(el.querySelectorAll('[data-hds-notation-row]')).map(r => r.getAttribute('data-hds-notation-row')))
      .toEqual(['sticker', 'number', 'letters', 'frequency']);
    await tap(el, 'number', '10');
    expect(onChange).toHaveBeenLastCalledWith(undefined);
    await tap(el, 'letters', 'D');
    expect(shown(el, 'letters')).toEqual(['D', 'true']);
    await tap(el, 'letters', 'true');
    expect(onChange).toHaveBeenLastCalledWith(undefined);
    expect(convertMethodToEvent).not.toHaveBeenCalled();
    await tap(el, 'frequency', 'X1');
    expect(convertMethodToEvent).toHaveBeenLastCalledWith('cervical-fluid', 'creighton', '10DL');
    expect(onChange).toHaveBeenLastCalledWith({ vectors: { v: 1 }, source: { key: 'creighton', sourceData: '10DL', annotations: { frequency: 'X1' } } });
  });

  it('a stored code opens as picked, untouched, with its frequency', async () => {
    settings[CERVICAL_FLUID_METHOD_KEY] = 'creighton';
    const onChange = vi.fn();
    const value = { vectors: {}, source: { key: 'creighton', sourceData: { mucus: '6gckl' }, annotations: { frequency: 'X3' } } };
    const el = await mount(<Convertible label='Mucus' value={value} onChange={onChange} converterEngine={converterEngine} itemKey={MUCUS} />);
    for (const [r, v] of [['number', '6'], ['letters', 'G'], ['letters', 'CK'], ['letters', 'true'], ['frequency', 'X3']]) {
      expect(button(el, r, v).getAttribute('aria-pressed'), v).toBe('true');
    }
    expect(onChange).not.toHaveBeenCalled();
  });

  it('a method without notation (FEMM) keeps the stamp grid', async () => {
    settings[CERVICAL_FLUID_METHOD_KEY] = 'femm';
    const el = await mount(<Convertible label='Mucus' value={undefined} onChange={() => {}} converterEngine={converterEngine} itemKey={MUCUS} />);
    expect(el.querySelector('[data-hds-notation]')).toBeNull();
    expect(el.querySelector('button[aria-label="Dry"]')).not.toBeNull();
  });
});

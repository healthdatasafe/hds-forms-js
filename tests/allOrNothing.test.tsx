// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * A nested group whose eventType object lists `required` keys (`intake.frequency`: times +
 * period + periodUnit, data-model 3.23.0) is all or nothing: a partial entry stays a draft on
 * screen and is never emitted, in the composite form and in the coded form's companion fields.
 */
const FREQUENCY = {
  type: 'object',
  required: ['times', 'period', 'periodUnit'],
  properties: {
    times: { type: 'number' },
    period: { type: 'number' },
    periodUnit: { type: 'string', enum: ['h', 'd', 'wk', 'mo', 'y'] }
  }
};
const INTAKE = { type: 'object', properties: { doseValue: { type: 'number' }, frequency: FREQUENCY, note: { type: 'string' } } };
const eventTypeDefs: Record<string, any> = {
  'medication/basic': { type: 'object', required: ['name'], properties: { name: { type: 'string' }, intake: INTAKE } },
  'medication/coded-v1': { type: 'object', required: ['drug'], properties: { drug: { type: 'object' }, intake: INTAKE } }
};

vi.mock('hds-lib', () => ({
  localizeText: (t: any) => (typeof t === 'string' ? t : (t?.en ?? '')),
  getHDSModel: () => ({
    datasources: { forKey: () => ({ endpoint: 'https://example.invalid/medication', queryParam: 'search', resultKey: 'medications', displayFields: { label: 'label' }, valueFields: ['label', 'codes'] }) },
    eventTypes: {
      getEventTypeDefinition: (t: string) => eventTypeDefs[t],
      getEventTypeExtra: () => undefined
    }
  }),
  HDSSettings: { isHooked: false, get: () => undefined },
  appTemplates: {},
  getPreferredInput: () => undefined
}));

const { HDSFormField } = await import('../src/components/HDSFormField');
const { DatasetSearch } = await import('../src/components/fields/DatasetSearch');

const unitOptions = ['h', 'd', 'wk', 'mo', 'y'].map((v) => ({ value: v, label: { en: v } }));
const intakeBasicItem: any = {
  type: 'composite',
  eventType: 'medication/basic',
  label: { en: 'Medication' },
  composite: {
    name: { label: { en: 'Name' }, type: 'text' },
    intake: {
      label: { en: 'Intake' },
      type: 'composite',
      canBeNull: true,
      composite: {
        doseValue: { label: { en: 'Dose' }, type: 'number', canBeNull: true },
        frequency: {
          label: { en: 'How often' },
          type: 'composite',
          canBeNull: true,
          composite: {
            times: { label: { en: 'Times' }, type: 'number', canBeNull: true },
            period: { label: { en: 'Every' }, type: 'number', canBeNull: true },
            periodUnit: { label: { en: 'Period' }, type: 'select', canBeNull: true, options: unitOptions }
          }
        }
      }
    }
  }
};

let root: Root | null = null;
let container: HTMLElement | null = null;

async function mount (node: React.ReactNode): Promise<HTMLElement> {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(node); });
  return container;
}

afterEach(() => {
  act(() => { root?.unmount(); });
  container?.remove();
  root = null;
  container = null;
});

async function setInput (el: HTMLInputElement | HTMLSelectElement, value: string, event: 'input' | 'change'): Promise<void> {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')!.set!;
    setter.call(el, value);
    el.dispatchEvent(new Event(event, { bubbles: true }));
  });
}

function hint (c: HTMLElement): boolean {
  return [...c.querySelectorAll('[role="alert"]')].some((e) => e.textContent?.includes('or none'));
}

describe('all-or-nothing nested groups', () => {
  it('composite: a partial frequency is kept on screen and never emitted', async () => {
    const emitted: any[] = [];
    function Host () {
      const [v, setV] = useState<any>(null);
      return <HDSFormField itemData={intakeBasicItem} value={v} onChange={(x) => { emitted.push(x); setV(x); }} />;
    }
    const c = await mount(<Host />);
    const numbers = [...c.querySelectorAll('input[type="number"]')] as HTMLInputElement[];
    expect(numbers.length).toBe(3); // dose, times, period
    const [dose, times, period] = numbers;
    const unit = c.querySelector('select') as HTMLSelectElement;

    await setInput(dose, '2', 'input');
    expect(emitted.at(-1)).toEqual({ intake: { doseValue: 2 } });

    await setInput(times, '2', 'input');
    expect(emitted.at(-1)?.intake?.frequency).toBeUndefined();
    expect(times.value).toBe('2');
    expect(hint(c)).toBe(true);
    expect(period.required).toBe(true);

    await setInput(period, '1', 'input');
    expect(emitted.at(-1)?.intake?.frequency).toBeUndefined();

    await setInput(unit, 'd', 'change');
    expect(emitted.at(-1)).toEqual({ intake: { doseValue: 2, frequency: { times: 2, period: 1, periodUnit: 'd' } } });
    expect(hint(c)).toBe(false);

    await setInput(times, '', 'input');
    expect(emitted.at(-1)).toEqual({ intake: { doseValue: 2 } });
    expect(period.value).toBe('1');
  });

  it('composite: a group with no required keys still reports every change (intake itself)', async () => {
    const emitted: any[] = [];
    function Host () {
      const [v, setV] = useState<any>(null);
      return <HDSFormField itemData={intakeBasicItem} value={v} onChange={(x) => { emitted.push(x); setV(x); }} />;
    }
    const c = await mount(<Host />);
    const dose = c.querySelector('input[type="number"]') as HTMLInputElement;
    await setInput(dose, '5', 'input');
    expect(emitted.at(-1)).toEqual({ intake: { doseValue: 5 } });
    expect(hint(c)).toBe(false);
  });

  it('composite: a complete value set from outside shows without the hint', async () => {
    const value = { name: 'Levothyroxine', intake: { frequency: { times: 1, period: 1, periodUnit: 'd' } } };
    const c = await mount(<HDSFormField itemData={intakeBasicItem} value={value} onChange={() => {}} />);
    const numbers = [...c.querySelectorAll('input[type="number"]')] as HTMLInputElement[];
    expect(numbers[1].value).toBe('1');
    expect(hint(c)).toBe(false);
  });

  it('coded form companions: frequency renders as a group and is all or nothing', async () => {
    const emitted: any[] = [];
    function Host () {
      const [v, setV] = useState<any>({ drug: { label: { en: 'Levothyroxine' }, codes: [] } });
      return <DatasetSearch label='Medication' value={v} onChange={(x) => { emitted.push(x); setV(x); }} datasource='medication' eventType='medication/coded-v1' />;
    }
    const c = await mount(<Host />);
    const group = [...c.querySelectorAll('fieldset')].find((f) => f.querySelector('legend')?.textContent?.toLowerCase().includes('frequency'));
    expect(group).toBeTruthy();
    const [times, period] = [...group!.querySelectorAll('input[type="number"]')] as HTMLInputElement[];
    const unit = group!.querySelector('select') as HTMLSelectElement;

    await setInput(times, '3', 'input');
    expect(emitted.at(-1)?.intake?.frequency).toBeUndefined();
    expect(hint(c)).toBe(true);

    await setInput(period, '1', 'input');
    await setInput(unit, 'wk', 'change');
    expect(emitted.at(-1)?.intake?.frequency).toEqual({ times: 3, period: 1, periodUnit: 'wk' });
    expect(hint(c)).toBe(false);
  });
});

// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The generic entry form on an allergy (B-2026-11-21-9, -6, -10): checkbox ids per field, a partial
 * `lastOccurrence` shown at its precision, and the required parts a host checks before saving.
 */
const PARTIAL = '^[0-9]{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12][0-9]|3[01]))?)?$';
const eventTypeDefs: Record<string, any> = {
  'allergy/basic-v1': {
    type: 'object',
    required: ['name', 'status'],
    properties: {
      name: { type: 'string', minLength: 1 },
      status: { type: 'string', enum: ['active', 'inactive', 'resolved'] },
      categories: { type: 'array', minItems: 1, items: { type: 'string' } },
      lastOccurrence: { type: 'string', pattern: PARTIAL },
      notes: { type: 'string' }
    }
  },
  'test/dated-v1': { type: 'object', required: ['name'], properties: { name: { type: 'string' }, since: { type: 'string', minLength: 1 } } }
};

vi.mock('hds-lib', () => ({
  localizeText: (t: any) => (typeof t === 'string' ? t : (t?.en ?? '')),
  getHDSModel: () => ({
    datasources: { forKey: () => undefined },
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
const { MultiSelect } = await import('../src/components/fields/MultiSelect');
const { missingRequiredParts } = await import('../src/schema/requiredParts');
const { schemaFor } = await import('../src/schema/schemas');
const { acceptsPartialDate } = await import('../src/components/fields/partialDate');

const categories = [{ value: 'food', label: 'Food' }, { value: 'medication', label: 'Medication' }];
const allergyItem: any = {
  type: 'composite',
  eventType: 'allergy/basic-v1',
  label: { en: 'Allergy' },
  composite: {
    name: { label: { en: 'Allergen' }, type: 'text' },
    status: { label: { en: 'Status' }, type: 'select', options: [{ value: 'active', label: { en: 'Active' } }, { value: 'resolved', label: { en: 'Resolved' } }] },
    categories: { label: { en: 'Category' }, type: 'multi-select', canBeNull: true, options: categories.map(o => ({ value: o.value, label: { en: o.label } })) },
    lastOccurrence: { label: { en: 'Last reaction' }, type: 'date', canBeNull: true },
    notes: { label: { en: 'Notes' }, type: 'text', canBeNull: true }
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

function mountHost (initial: any, emitted: any[]): Promise<HTMLElement> {
  function Host () {
    const [v, setV] = useState<any>(initial);
    return <HDSFormField itemData={allergyItem} value={v} onChange={(x) => { emitted.push(x); setV(x); }} />;
  }
  return mount(<Host />);
}

const byLabel = (c: HTMLElement, name: string) => c.querySelector(`[aria-label="${name}"]`) as HTMLSelectElement | HTMLInputElement | null;

describe('MultiSelect checkbox ids (B-2026-11-21-9)', () => {
  it('two multi-selects with a shared option value get distinct ids, and a label toggles its own field', async () => {
    const a: any[] = [];
    const b: any[] = [];
    const c = await mount(
      <>
        <MultiSelect label='A' value={null} onChange={(v) => a.push(v)} options={categories} />
        <MultiSelect label='B' value={null} onChange={(v) => b.push(v)} options={categories} />
      </>
    );
    const boxes = [...c.querySelectorAll('input[type="checkbox"]')] as HTMLInputElement[];
    const ids = boxes.map(x => x.id);
    expect(new Set(ids).size).toBe(4);
    const labels = [...c.querySelectorAll('label')] as HTMLLabelElement[];
    expect(labels.map(l => l.htmlFor)).toEqual(ids);
    await act(async () => { labels[2].click(); });
    expect(a).toEqual([]);
    expect(b).toEqual([['food']]);
  });
});

describe('a partial date part (B-2026-11-21-10)', () => {
  it('takes the eventType pattern of YYYY, YYYY-MM and YYYY-MM-DD; not a plain string', () => {
    expect(acceptsPartialDate({ type: 'string', pattern: PARTIAL })).toBe(true);
    expect(acceptsPartialDate({ type: 'string', minLength: 1 })).toBe(false);
    expect(acceptsPartialDate({ type: 'string', pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' })).toBe(false);
    expect(acceptsPartialDate(undefined)).toBe(false);
  });

  for (const [stored, precision] of [['2022', 'year'], ['2024-03', 'month'], ['2024-03-12', 'day']] as const) {
    it(`shows a stored ${stored} at its precision (${precision})`, async () => {
      const c = await mountHost({ name: 'Peanut', status: 'active', lastOccurrence: stored }, []);
      expect((byLabel(c, 'Last reaction: how precisely') as HTMLSelectElement).value).toBe(precision);
      const field = byLabel(c, `Last reaction: ${precision === 'year' ? 'Year' : precision === 'month' ? 'Month' : 'Day'}`);
      expect(field?.value).toBe(stored);
    });
  }

  it('changing the precision keeps what fits, and Not known drops the key', async () => {
    const emitted: any[] = [];
    const c = await mountHost({ name: 'Peanut', status: 'active', lastOccurrence: '2024-03-12' }, emitted);
    const precision = byLabel(c, 'Last reaction: how precisely') as HTMLSelectElement;
    await setInput(precision, 'month', 'change');
    expect(emitted.at(-1).lastOccurrence).toBe('2024-03');
    await setInput(precision, 'year', 'change');
    expect(emitted.at(-1).lastOccurrence).toBe('2024');
    await setInput(precision, 'unknown', 'change');
    expect(emitted.at(-1)).toEqual({ name: 'Peanut', status: 'active' });
  });

  it('a date part without the partial pattern stays a plain date input', async () => {
    const dated: any = { type: 'composite', eventType: 'test/dated-v1', label: { en: 'Dated' }, composite: { name: { label: { en: 'Name' }, type: 'text' }, since: { label: { en: 'Since' }, type: 'date', canBeNull: true } } };
    const c = await mount(<HDSFormField itemData={dated} value={{ name: 'x', since: '2024-03-12' }} onChange={() => {}} />);
    expect((c.querySelector('input[type="date"]') as HTMLInputElement).value).toBe('2024-03-12');
    expect(byLabel(c, 'Since: how precisely')).toBeNull();
  });
});

describe('the generated schema of a partial date part (B-2026-11-24-1)', () => {
  it('carries the eventType pattern, so a stored year or month is valid', () => {
    const part = schemaFor(allergyItem).properties!.lastOccurrence;
    expect(part).toEqual({ title: 'Last reaction', type: 'string', pattern: PARTIAL });
    for (const stored of ['2022', '2024-03', '2024-03-12']) expect(new RegExp(part.pattern!).test(stored)).toBe(true);
  });

  it('a date part without the partial pattern, or with no eventType schema, stays a full date', () => {
    const dated: any = { type: 'composite', eventType: 'test/dated-v1', label: { en: 'Dated' }, composite: { since: { label: { en: 'Since' }, type: 'date' } } };
    const full = { title: 'Since', type: 'string', format: 'date', dateSaveFormat: 'YYYY-MM-DD' };
    expect(schemaFor(dated).properties!.since).toEqual(full);
    expect(schemaFor({ ...dated, eventType: 'unknown/type' }).properties!.since).toEqual(full);
  });
});

describe('missingRequiredParts (B-2026-11-21-6)', () => {
  it('lists the eventType required parts left blank', () => {
    expect(missingRequiredParts(allergyItem, { name: 'Peanut' })).toEqual(['status']);
    expect(missingRequiredParts(allergyItem, { name: '', status: 'active' })).toEqual(['name']);
    expect(missingRequiredParts(allergyItem, null)).toEqual(['name', 'status']);
    expect(missingRequiredParts(allergyItem, { name: 'Peanut', status: 'active' })).toEqual([]);
  });

  it('without an eventType schema, the parts not marked canBeNull', () => {
    const item = { ...allergyItem, eventType: 'unknown/type' };
    expect(missingRequiredParts(item, { name: 'Peanut', categories: [] })).toEqual(['status']);
  });

  it('nothing for an item that is not a composite', () => {
    expect(missingRequiredParts({ type: 'text', label: { en: 'x' } } as any, null)).toEqual([]);
    expect(missingRequiredParts(undefined, null)).toEqual([]);
  });
});

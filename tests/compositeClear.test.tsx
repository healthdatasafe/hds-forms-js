// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Clearing an optional text or date sub-field of a composite drops its key: closed eventTypes declare
 * their strings `minLength: 1` (`encounter/visit-v1` `reason`, `notes`), so `''` would be stored
 * as invalid content. Stored keys that are not form fields (an importer's participants, codings)
 * survive an edit; a required text sub-field keeps `''` as before.
 */
const eventTypeDefs: Record<string, any> = {
  'encounter/visit-v1': {
    type: 'object',
    required: ['kind'],
    properties: {
      kind: { type: 'string', enum: ['consultation', 'teleconsultation'] },
      reason: { type: 'string', minLength: 1 },
      notes: { type: 'string', minLength: 1 },
      participants: { type: 'array' },
      specialty: { type: 'object' }
    }
  },
  'medication/basic': { type: 'object', required: ['name'], properties: { name: { type: 'string' }, note: { type: 'string' } } },
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

const visitItem: any = {
  type: 'composite',
  eventType: 'encounter/visit-v1',
  label: { en: 'Visit' },
  composite: {
    kind: {
      label: { en: 'Kind' },
      type: 'select',
      options: [
        { value: 'consultation', label: { en: 'Consultation' } },
        { value: 'teleconsultation', label: { en: 'Teleconsultation' } }
      ]
    },
    reason: { label: { en: 'Reason' }, type: 'text', canBeNull: true },
    notes: { label: { en: 'Notes' }, type: 'text', canBeNull: true }
  }
};

const medicationItem: any = {
  type: 'composite',
  eventType: 'medication/basic',
  label: { en: 'Medication' },
  composite: {
    name: { label: { en: 'Name' }, type: 'text' },
    note: { label: { en: 'Note' }, type: 'text', canBeNull: true }
  }
};

const datedItem: any = {
  type: 'composite',
  eventType: 'test/dated-v1',
  label: { en: 'Dated' },
  composite: {
    name: { label: { en: 'Name' }, type: 'text' },
    since: { label: { en: 'Since' }, type: 'date', canBeNull: true }
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

function mountHost (itemData: any, initial: any, emitted: any[]): Promise<HTMLElement> {
  function Host () {
    const [v, setV] = useState<any>(initial);
    return <HDSFormField itemData={itemData} value={v} onChange={(x) => { emitted.push(x); setV(x); }} />;
  }
  return mount(<Host />);
}

describe('composite: clearing a text sub-field', () => {
  it('an optional text sub-field cleared drops its key', async () => {
    const emitted: any[] = [];
    const c = await mountHost(visitItem, { kind: 'consultation', reason: 'Follow-up', notes: 'Fasting' }, emitted);
    const [reason] = [...c.querySelectorAll('input[type="text"]')] as HTMLInputElement[];
    expect(reason.value).toBe('Follow-up');

    await setInput(reason, '', 'input');
    expect(emitted.at(-1)).toEqual({ kind: 'consultation', notes: 'Fasting' });
    expect('reason' in emitted.at(-1)).toBe(false);
    expect(reason.value).toBe('');
  });

  it('an edit keeps the stored keys that are not form fields', async () => {
    const participants = [{ eventId: 'e1', name: 'Dr A' }];
    const specialty = { system: 'http://snomed.info/sct', code: '394579002' };
    const emitted: any[] = [];
    const c = await mountHost(visitItem, { kind: 'consultation', reason: 'Follow-up', participants, specialty }, emitted);
    const kind = c.querySelector('select') as HTMLSelectElement;

    await setInput(kind, 'teleconsultation', 'change');
    const out = emitted.at(-1);
    expect(out).toEqual({ kind: 'teleconsultation', reason: 'Follow-up', participants, specialty });
    expect(out.participants).toBe(participants);
    expect(out.specialty).toBe(specialty);
  });

  it('a required text sub-field cleared keeps an empty string, as before', async () => {
    const emitted: any[] = [];
    const c = await mountHost(medicationItem, { name: 'Aspirin', note: 'With food' }, emitted);
    const [name] = [...c.querySelectorAll('input[type="text"]')] as HTMLInputElement[];
    expect(name.required).toBe(true);

    await setInput(name, '', 'input');
    expect(emitted.at(-1)).toEqual({ name: '', note: 'With food' });
  });

  it('an optional date sub-field cleared drops its key too', async () => {
    const emitted: any[] = [];
    const c = await mountHost(datedItem, { name: 'Aspirin', since: '2024-03-12' }, emitted);
    const since = c.querySelector('input[type="date"]') as HTMLInputElement;
    expect(since.value).toBe('2024-03-12');
    expect(since.required).toBe(false);

    await setInput(since, '', 'input');
    expect(emitted.at(-1)).toEqual({ name: 'Aspirin' });
    expect('since' in emitted.at(-1)).toBe(false);
    expect(since.value).toBe('');
  });
});

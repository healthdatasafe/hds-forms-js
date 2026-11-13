// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Every field a screen reader reaches has a name (B-2026-11-13-6): a composite's parts are tied to their visible
 * labels, and the duration picker is a group named "Duration" whose unit select is named too.
 */
vi.mock('hds-lib', () => ({
  localizeText: (t: any) => (typeof t === 'string' ? t : (t?.en ?? '')),
  durationToLabel: (s: number) => `${s} s`,
  getHDSModel: () => ({
    datasources: { forKey: () => undefined },
    eventTypes: { getEventTypeDefinition: () => undefined, getEventTypeExtra: () => undefined }
  }),
  HDSSettings: { isHooked: false, get: () => undefined },
  appTemplates: {},
  getPreferredInput: () => undefined
}));

const { HDSFormField } = await import('../src/components/HDSFormField');
const { EventDurationInput } = await import('../src/components/EventDurationInput');

const visitItem: any = {
  type: 'composite',
  eventType: 'encounter/visit-v1',
  label: { en: 'Visit' },
  composite: {
    kind: { label: { en: 'Type of visit' }, type: 'select', options: [{ value: 'consultation', label: { en: 'Consultation' } }] },
    reason: { label: { en: 'Reason' }, type: 'text', canBeNull: true },
    since: { label: { en: 'Since' }, type: 'date', canBeNull: true },
    done: { label: { en: 'Done' }, type: 'checkbox', canBeNull: true }
  }
};

let root: Root | null = null;
afterEach(() => { act(() => root?.unmount()); root = null; document.body.innerHTML = ''; });
async function mount (node: React.ReactNode): Promise<HTMLElement> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(node); });
  return container;
}

/** The control a visible label names, through its `for` */
function controlOf (container: HTMLElement, text: string): Element | null {
  const label = [...container.querySelectorAll('label')].find(l => l.textContent?.replace(' *', '').trim() === text);
  const id = label?.getAttribute('for');
  return id ? container.querySelector(`[id="${id}"]`) : null;
}

describe('accessible names', () => {
  it('ties each composite part to its label', async () => {
    const c = await mount(<HDSFormField itemData={visitItem} value={{}} onChange={() => {}} />);
    expect(controlOf(c, 'Type of visit')?.tagName).toBe('SELECT');
    expect(controlOf(c, 'Reason')?.getAttribute('type')).toBe('text');
    expect(controlOf(c, 'Since')?.getAttribute('type')).toBe('date');
    expect(controlOf(c, 'Done')?.getAttribute('type')).toBe('checkbox');
    // ids are unique on the page
    const ids = [...c.querySelectorAll('[id]')].map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('names the duration group and its unit select', async () => {
    const c = await mount(<EventDurationInput value={1800} onChange={() => {}} />);
    const group = c.querySelector('[role="group"]')!;
    const name = c.querySelector(`[id="${group.getAttribute('aria-labelledby')}"]`);
    expect(name?.textContent).toBe('Duration');
    expect(c.querySelector('select')?.getAttribute('aria-label')).toBe('Unit');
    expect(c.querySelector('input[type="number"]')?.getAttribute('aria-label')).toBe('Length');
  });
});

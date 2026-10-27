// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * DatasetSearch: the person's own entries first, and a free-text fallback when the search
 * finds nothing (the needs behind hds-webapp's one medication entry).
 */
const datasources: Record<string, any> = {
  medication: {
    endpoint: 'https://example.invalid/medication',
    queryParam: 'search',
    minQueryLength: 3,
    resultKey: 'medications',
    displayFields: { label: 'label', description: 'description' },
    valueFields: ['label', 'description', 'codes', 'hdsId']
  }
};

const eventTypeDefs: Record<string, any> = {
  'medication/coded-v1': {
    type: 'object',
    required: ['drug'],
    properties: {
      drug: { type: 'object' },
      intake: { type: 'object', properties: { doseValue: { type: 'number' } } }
    }
  }
};

vi.mock('hds-lib', () => ({
  localizeText: (t: any) => (typeof t === 'string' ? t : (t?.en ?? '')),
  getHDSModel: () => ({
    datasources: { forKey: (key: string) => datasources[key] },
    eventTypes: {
      getEventTypeDefinition: (t: string) => eventTypeDefs[t],
      getEventTypeExtra: () => undefined
    }
  }),
  HDSSettings: { isHooked: false, get: () => undefined },
  appTemplates: {},
  getPreferredInput: () => undefined
}));

const { DatasetSearch } = await import('../src/components/fields/DatasetSearch');
const { ItemSearchPicker } = await import('../src/components/ItemSearchPicker');

const LEVO = { label: { en: 'Levothyroxine' }, codes: [{ system: 'ATC', code: 'H03AA01' }], hdsId: 'hds:med:levo' };
const IBU = { label: { en: 'Ibuprofen' }, codes: [{ system: 'ATC', code: 'M01AE01' }], hdsId: 'hds:med:ibu' };
const PARA = { label: { en: 'Paracetamol' }, codes: [{ system: 'ATC', code: 'N02BE01' }], hdsId: 'hds:med:para' };

let searchResponse: any[] = [];
let root: Root | null = null;
let container: HTMLElement | null = null;

async function mount (node: React.ReactNode): Promise<HTMLElement> {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(node); });
  return container;
}

async function type (input: HTMLInputElement, text: string): Promise<void> {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')!.set!;
    setter.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => { vi.advanceTimersByTime(350); });
  await act(async () => {});
}

beforeEach(() => {
  vi.useFakeTimers();
  searchResponse = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
    json: async () => (String(url).endsWith('/sources') ? { sources: {} } : { medications: searchResponse })
  })));
});

afterEach(() => {
  act(() => { root?.unmount(); });
  container?.remove();
  root = null;
  container = null;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const base = { label: 'Medication', required: false, disabled: false, datasource: 'medication', eventType: 'medication/coded-v1' };

describe('DatasetSearch — own entries first', () => {
  const recent = [
    { drug: LEVO, intake: { doseValue: 50 } },
    { drug: IBU },
    { drug: LEVO, intake: { doseValue: 75 } } // older duplicate
  ];

  it('offers her entries on focus, deduped, before anything is typed', async () => {
    const c = await mount(<DatasetSearch {...base} value={null} onChange={() => {}} recentEntries={recent} />);
    const input = c.querySelector('input')!;
    await act(async () => { input.focus(); });
    expect(c.textContent).toContain('Your entries');
    const buttons = Array.from(c.querySelectorAll('button')).map(b => b.textContent);
    expect(buttons.filter(t => t === 'Levothyroxine').length).toBe(1);
    expect(buttons).toContain('Ibuprofen');
  });

  it('lists matching own entries above the search results, without duplicates', async () => {
    searchResponse = [PARA, LEVO];
    const c = await mount(<DatasetSearch {...base} value={null} onChange={() => {}} recentEntries={recent} />);
    await type(c.querySelector('input')!, 'levo');
    const text = c.textContent || '';
    expect(text.indexOf('Your entries')).toBeLessThan(text.indexOf('Search results'));
    expect(text.indexOf('Levothyroxine')).toBeLessThan(text.indexOf('Paracetamol'));
    expect(text.split('Levothyroxine').length - 1).toBe(1);
    expect(text).not.toContain('Ibuprofen');
  });

  it('matches an own entry by its code', async () => {
    const c = await mount(<DatasetSearch {...base} value={null} onChange={() => {}} recentEntries={recent} />);
    await type(c.querySelector('input')!, 'm01ae01');
    expect(c.textContent).toContain('Ibuprofen');
  });

  it('selects the concept only, not her old dose', async () => {
    const onChange = vi.fn();
    const c = await mount(<DatasetSearch {...base} value={null} onChange={onChange} recentEntries={recent} />);
    await act(async () => { c.querySelector('input')!.focus(); });
    const levo = Array.from(c.querySelectorAll('button')).find(b => b.textContent === 'Levothyroxine')!;
    await act(async () => { levo.click(); });
    expect(onChange).toHaveBeenCalledWith({ drug: LEVO });
  });

  it('shows nothing extra without recentEntries (unchanged for existing hosts)', async () => {
    const c = await mount(<DatasetSearch {...base} value={null} onChange={() => {}} />);
    await act(async () => { c.querySelector('input')!.focus(); });
    expect(c.textContent).not.toContain('Your entries');
  });
});

describe('DatasetSearch — free-text fallback', () => {
  it('offers the typed text when nothing is found, without changing the value', async () => {
    const onFreeText = vi.fn();
    const onChange = vi.fn();
    const c = await mount(<DatasetSearch {...base} value={null} onChange={onChange} onFreeText={onFreeText} />);
    await type(c.querySelector('input')!, 'Grandma tea ');
    const use = Array.from(c.querySelectorAll('button')).find(b => b.textContent?.startsWith('Use'))!;
    expect(use.textContent).toBe('Use “Grandma tea”');
    await act(async () => { use.click(); });
    expect(onFreeText).toHaveBeenCalledWith('Grandma tea');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('says nothing was found when the host takes no free text', async () => {
    const c = await mount(<DatasetSearch {...base} value={null} onChange={() => {}} />);
    await type(c.querySelector('input')!, 'zzzz');
    expect(c.textContent).toContain('Nothing found');
    expect(Array.from(c.querySelectorAll('button')).some(b => b.textContent?.startsWith('Use'))).toBe(false);
  });

  it('does not offer free text while results exist', async () => {
    searchResponse = [PARA];
    const c = await mount(<DatasetSearch {...base} value={null} onChange={() => {}} onFreeText={() => {}} />);
    await type(c.querySelector('input')!, 'para');
    expect(c.textContent).toContain('Paracetamol');
    expect(c.textContent).not.toContain('Use “');
  });

  it('does not offer free text below the minimum query length', async () => {
    const c = await mount(<DatasetSearch {...base} value={null} onChange={() => {}} onFreeText={() => {}} />);
    await type(c.querySelector('input')!, 'ab');
    expect(c.textContent).not.toContain('Use “');
    expect(c.textContent).not.toContain('Nothing found');
  });
});

describe('DatasetSearch — label', () => {
  it('ties the field label to the search input', async () => {
    const c = await mount(<DatasetSearch {...base} value={null} onChange={() => {}} />);
    const label = c.querySelector('label')!;
    const input = c.querySelector('input')!;
    expect(label.getAttribute('for')).toBe(input.id);
    expect(input.id).not.toBe('');
  });
});

describe('ItemSearchPicker — accessibility (B-2026-10-27-11)', () => {
  const items = [{ key: 'body-weight', label: 'Weight' }, { key: 'body-height', label: 'Height' }];

  it('names the search box with a default label', async () => {
    const c = await mount(<ItemSearchPicker items={items} onSelect={() => {}} />);
    expect(c.querySelector('input')!.getAttribute('aria-label')).toBe('Search items');
  });

  it('takes a host label', async () => {
    const c = await mount(<ItemSearchPicker items={items} onSelect={() => {}} searchLabel='Chercher une donnée' />);
    expect(c.querySelector('input')!.getAttribute('aria-label')).toBe('Chercher une donnée');
  });

  it('draws count badges in gray-700 on gray-200 (≥ 4.5:1)', async () => {
    const c = await mount(<ItemSearchPicker items={items} onSelect={() => {}} />);
    const badge = c.querySelector('span.rounded-full')!;
    expect(badge.className).toContain('text-gray-700');
    expect(badge.className).not.toContain('text-gray-500');
  });
});

// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { Select } from '../src/components/fields/Select';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * A required `Select` used to render no empty option at all. With a null value the browser then
 * showed the first real option while the field value stayed null, so the form looked filled and
 * its Save stayed disabled (hds-webapp's "No known allergies" form, a required `scope` with no
 * default, showed "All allergens"). A required field with no value now shows a disabled `--`
 * placeholder, which disappears once a value is chosen.
 */
const OPTIONS = [
  { value: 'all', label: 'All allergens' },
  { value: 'drug', label: 'Drugs' },
  { value: 3, label: 'Three' }
];

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

async function choose (el: HTMLSelectElement, value: string): Promise<void> {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')!.set!;
    setter.call(el, value);
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function mountHost (required: boolean, initial: any, onChange: (v: any) => void): Promise<HTMLElement> {
  function Host () {
    const [v, setV] = useState<any>(initial);
    return (
      <Select
        label='Scope'
        value={v}
        options={OPTIONS}
        required={required}
        disabled={false}
        onChange={(x) => { onChange(x); setV(x); }}
      />
    );
  }
  return mount(<Host />);
}

describe('Select: required with no value', () => {
  it('shows a disabled empty placeholder, selected, and calls no onChange', async () => {
    const onChange = vi.fn();
    const c = await mountHost(true, null, onChange);
    const select = c.querySelector('select') as HTMLSelectElement;
    const first = select.options[0];
    expect(first.value).toBe('');
    expect(first.textContent).toBe('--');
    expect(first.disabled).toBe(true);
    expect(select.value).toBe('');
    expect(select.selectedIndex).toBe(0);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('treats an empty string like null', async () => {
    const onChange = vi.fn();
    const c = await mountHost(true, '', onChange);
    const select = c.querySelector('select') as HTMLSelectElement;
    expect(select.options[0].disabled).toBe(true);
    expect(select.value).toBe('');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('choosing an option calls onChange with its value and drops the placeholder', async () => {
    const onChange = vi.fn();
    const c = await mountHost(true, null, onChange);
    const select = c.querySelector('select') as HTMLSelectElement;

    await choose(select, 'drug');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith('drug');
    expect(select.value).toBe('drug');
    expect([...select.options].map((o) => o.value)).toEqual(['all', 'drug', '3']);
  });

  it('keeps a numeric option value a number', async () => {
    const onChange = vi.fn();
    const c = await mountHost(true, null, onChange);
    await choose(c.querySelector('select') as HTMLSelectElement, '3');
    expect(onChange).toHaveBeenLastCalledWith(3);
  });

  it('renders no placeholder when a value is already set', async () => {
    const c = await mountHost(true, 'all', vi.fn());
    const select = c.querySelector('select') as HTMLSelectElement;
    expect([...select.options].map((o) => o.value)).toEqual(['all', 'drug', '3']);
    expect(select.value).toBe('all');
  });
});

describe('Select: not required, unchanged', () => {
  it('shows a selectable `--` option first, with or without a value', async () => {
    const c = await mountHost(false, 'all', vi.fn());
    const select = c.querySelector('select') as HTMLSelectElement;
    expect([...select.options].map((o) => o.value)).toEqual(['', 'all', 'drug', '3']);
    expect(select.options[0].disabled).toBe(false);
    expect(select.value).toBe('all');
  });

  it('selects `--` for a null value and clears back to null', async () => {
    const onChange = vi.fn();
    const c = await mountHost(false, null, onChange);
    const select = c.querySelector('select') as HTMLSelectElement;
    expect(select.value).toBe('');
    expect(onChange).not.toHaveBeenCalled();

    await choose(select, 'all');
    expect(onChange).toHaveBeenLastCalledWith('all');
    await choose(select, '');
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(select.options[0].value).toBe('');
  });
});

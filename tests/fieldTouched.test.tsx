// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { HDSFormField } from '../src/components/HDSFormField';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * `prefilled` + `onFieldTouched` let a host tint the values it pre-filled (from the person's
 * last entry) until she touches them, without reaching into the field's DOM.
 */
const weightItem: any = { type: 'number', label: { en: 'Weight' } };
const selectItem: any = {
  type: 'select',
  label: { en: 'Flow' },
  options: [{ value: 1, label: { en: 'Light' } }, { value: 2, label: { en: 'Heavy' } }]
};

let root: Root | null = null;
let container: HTMLElement | null = null;

function mount (node: React.ReactNode): HTMLElement {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => { root!.render(node); });
  return container;
}

afterEach(() => {
  act(() => { root?.unmount(); });
  container?.remove();
  root = null;
  container = null;
});

function marked (c: HTMLElement): boolean {
  return c.querySelector('[data-hds-prefilled="true"]') != null;
}

describe('HDSFormField — prefilled and onFieldTouched', () => {
  it('adds no wrapper when neither prop is set (unchanged DOM for existing hosts)', () => {
    const plain = renderToStaticMarkup(<HDSFormField itemData={weightItem} value={72} onChange={() => {}} />);
    expect(plain.startsWith('<div><label')).toBe(true);
    expect(plain).not.toContain('data-hds-prefilled');
  });

  it('marks a prefilled field until it is focused, and reports the touch once', () => {
    const touched = vi.fn();
    const c = mount(<HDSFormField itemData={weightItem} itemKey='body-weight' value={72.5} onChange={() => {}} prefilled onFieldTouched={touched} />);
    expect(marked(c)).toBe(true);

    const input = c.querySelector('input')!;
    act(() => { input.focus(); });
    expect(marked(c)).toBe(false);
    expect(touched).toHaveBeenCalledTimes(1);
    expect(touched).toHaveBeenCalledWith('body-weight');

    act(() => { input.blur(); input.focus(); });
    expect(touched).toHaveBeenCalledTimes(1);
  });

  it('counts a change on a select as a touch', () => {
    const touched = vi.fn();
    const onChange = vi.fn();
    const c = mount(<HDSFormField itemData={selectItem} itemKey='flow' value={1} onChange={onChange} prefilled onFieldTouched={touched} />);
    const select = c.querySelector('select')!;
    act(() => {
      select.value = '2';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(touched).toHaveBeenCalledTimes(1);
    expect(marked(c)).toBe(false);
  });

  it('reports touches without marking when prefilled is false', () => {
    const touched = vi.fn();
    const c = mount(<HDSFormField itemData={weightItem} value={72} onChange={() => {}} prefilled={false} onFieldTouched={touched} />);
    expect(marked(c)).toBe(false);
    act(() => { c.querySelector('input')!.focus(); });
    expect(touched).toHaveBeenCalledTimes(1);
  });

  it('starts a new untouched period when prefilled turns on again', () => {
    const c = mount(<HDSFormField itemData={weightItem} value={72} onChange={() => {}} prefilled />);
    act(() => { c.querySelector('input')!.focus(); });
    expect(marked(c)).toBe(false);
    act(() => { root!.render(<HDSFormField itemData={weightItem} value={72} onChange={() => {}} prefilled={false} />); });
    act(() => { root!.render(<HDSFormField itemData={weightItem} value={73} onChange={() => {}} prefilled />); });
    expect(marked(c)).toBe(true);
  });
});

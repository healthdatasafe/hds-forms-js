// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { formDataToActions } from '../src/schema/eventData';
import { EventDurationInput } from '../src/components/EventDurationInput';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * An item with a `duration` block (sleep, a treatment, a pregnancy) is entered with its duration (plan 124 1.6): the
 * host hands `formDataToActions` a per-item duration, written on the event.
 */
const def = (type: string) => ({
  key: 'it',
  itemDef: { data: { streamId: 's', eventType: type }, eventTemplate: () => ({ streamIds: ['s'], type }) } as any
});

describe('formDataToActions durations', () => {
  it('writes a span or ongoing on a new event, and leaves none out', () => {
    expect(formDataToActions([def('count/generic')], { it: 7 }, {}, 100, undefined, { it: 3600 })[0].params)
      .toEqual({ streamIds: ['s'], type: 'count/generic', content: 7, time: 100, duration: 3600 });
    expect(formDataToActions([def('count/generic')], { it: 7 }, {}, 100, undefined, { it: null })[0].params.duration).toBeNull();
    expect('duration' in formDataToActions([def('count/generic')], { it: 7 }, {}, 100, undefined, { it: 0 })[0].params).toBe(false);
    expect('duration' in formDataToActions([def('count/generic')], { it: 7 }, {}, 100)[0].params).toBe(false);
  });

  it('a checked activity gets its duration too', () => {
    expect(formDataToActions([def('activity/plain')], { it: true }, {}, 100, undefined, { it: 86400 })[0].params.duration).toBe(86400);
  });

  it('an update writes the duration given, 0 included (the span cleared), and only then', () => {
    expect(formDataToActions([def('count/generic')], { it: 7 }, { it: 'e1' }, 100, undefined, { it: 0 })[0].params.update)
      .toEqual({ content: 7, time: 100, duration: 0 });
    expect('duration' in formDataToActions([def('count/generic')], { it: 7 }, { it: 'e1' }, 100, undefined, { it: undefined })[0].params.update).toBe(false);
  });
});

let root: Root | null = null;
afterEach(() => { act(() => root?.unmount()); root = null; document.body.innerHTML = ''; });
function mount (node: React.ReactNode): HTMLElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => { root!.render(node); });
  return container;
}

describe('EventDurationInput', () => {
  it('a required duration that may be ongoing starts on Ongoing and says so', () => {
    const onChange = vi.fn();
    mount(<EventDurationInput value={undefined} onChange={onChange} mandatory allowNull />);
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('starts on No duration, quietly, when none is required', () => {
    const onChange = vi.fn();
    const el = mount(<EventDurationInput value={undefined} onChange={onChange} />);
    expect(onChange).not.toHaveBeenCalled();
    expect(el.textContent).toContain('No duration');
    expect(el.textContent).toContain('Duration');
  });

  it('a length in hours gives seconds', () => {
    const onChange = vi.fn();
    const el = mount(<EventDurationInput value={undefined} onChange={onChange} mandatory allowNull={false} />);
    const input = el.querySelector('input[type=number]') as HTMLInputElement;
    const select = el.querySelector('select') as HTMLSelectElement;
    act(() => {
      select.value = 'hours';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(input, '7.5');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(onChange).toHaveBeenLastCalledWith(27000);
  });
});

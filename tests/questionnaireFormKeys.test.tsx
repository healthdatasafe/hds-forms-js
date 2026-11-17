// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/** Question keys named like Object.prototype members survive the form's answer state (B-2026-11-16-21). */
vi.mock('hds-lib', () => ({
  localizeText: (t: any) => (typeof t === 'string' ? t : (t?.en ?? '')),
  appTemplates: {}
}));

const { HDSQuestionnaireForm } = await import('../src/components/HDSQuestionnaireForm');

const KEYS = ['__proto__', 'constructor', 'toString', 'valueOf', 'hasOwnProperty'];
const question = { label: { en: 'Weight' }, itemRef: 'body-weight', scope: { type: 'ever' } };

let root: Root | null = null;
afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = '';
});

describe('HDSQuestionnaireForm answer state', () => {
  it('keeps every answer whatever its key', async () => {
    const request: any = JSON.parse('{"questions":{}}');
    for (const k of KEYS) Object.defineProperty(request.questions, k, { value: question, enumerable: true });
    const onSubmit = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => { root!.render(<HDSQuestionnaireForm request={request} onSubmit={onSubmit} />); });

    for (const k of KEYS) {
      const radios = container.querySelectorAll<HTMLInputElement>(`input[name="__q::${k}::status"]`);
      await act(async () => { radios[1].click(); });
    }
    await act(async () => { container.querySelector('form')!.requestSubmit(); });

    const answers = onSubmit.mock.calls[0][0];
    expect(Object.keys(answers)).toEqual(KEYS);
    expect(Object.getPrototypeOf(answers)).toBe(Object.prototype);
    expect(Object.getOwnPropertyDescriptor(answers, '__proto__')?.value).toEqual({ status: 'no' });
  });
});

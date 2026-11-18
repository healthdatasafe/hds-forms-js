// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('hds-lib', () => ({
  localizeText: (t: any) => (typeof t === 'string' ? t : (t?.en ?? '')),
  getHDSModel: () => ({ itemsDefs: { getAllActive: () => [] } }),
  appTemplates: {}
}));

const { QuestionnaireBuilder } = await import('../src/components/QuestionnaireBuilder');

function fakeQuestionnaire (questions: Record<string, any>): any {
  return {
    title: { en: 'Intake' },
    description: null,
    get questionKeys () { return Object.keys(questions); },
    getQuestion: (k: string) => questions[k],
    addQuestion: (k: string, q: any) => { questions[k] = q; },
    removeQuestion: (k: string) => { delete questions[k]; }
  };
}

let root: Root | null = null;
afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = '';
});

async function mount (questionnaire: any): Promise<HTMLElement> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(<QuestionnaireBuilder questionnaire={questionnaire} />); });
  const toggle = [...container.querySelectorAll('button')].find((b) => b.textContent === '+')!;
  await act(async () => { toggle.click(); });
  return container;
}

async function type (input: HTMLInputElement, text: string): Promise<void> {
  await act(async () => {
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')!.set!.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

const drugInputs = (c: HTMLElement) => {
  const box = [...c.querySelectorAll('div')].find((d) => d.firstElementChild?.textContent === 'Drug filter')!;
  return [...box.querySelectorAll<HTMLInputElement>('input')];
};

describe('QuestionnaireBuilder drug filter', () => {
  it('[QBD-1] defaults the code system to ATC, the case datasets-service uses', async () => {
    const questions: Record<string, any> = { ibu: { label: { en: 'Ibuprofen?' }, itemRef: 'medication-intake', scope: { type: 'ever' } } };
    const c = await mount(fakeQuestionnaire(questions));
    const [system, code] = drugInputs(c);
    expect(system.value).toBe('ATC');
    await type(code, ' M01AE01 ');
    expect(questions.ibu.params).toEqual({ drug: { codes: [{ system: 'ATC', code: 'M01AE01' }] } });
  });

  it('[QBD-2] keeps a system already stored on the request', async () => {
    const questions: Record<string, any> = {
      ibu: { label: { en: 'Ibuprofen?' }, itemRef: 'medication-intake', scope: { type: 'ever' }, params: { drug: { codes: [{ system: 'atc', code: 'M01AE01' }] } } }
    };
    const c = await mount(fakeQuestionnaire(questions));
    const [system, code] = drugInputs(c);
    expect(system.value).toBe('atc');
    await type(code, 'M01AE02');
    expect(questions.ibu.params.drug.codes).toEqual([{ system: 'atc', code: 'M01AE02' }]);
  });
});

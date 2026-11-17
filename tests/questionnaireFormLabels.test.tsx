// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('hds-lib', () => ({
  localizeText: (t: any) => (typeof t === 'string' ? t : (t?.fr ?? t?.en ?? '')),
  appTemplates: {}
}));

const { HDSQuestionnaireForm } = await import('../src/components/HDSQuestionnaireForm');
const { DEFAULT_QUESTIONNAIRE_LABELS } = await import('../src/components/questionnaireLabels');

const request: any = {
  questions: {
    weight: { label: { en: 'Weight', fr: 'Poids' }, itemRef: 'body-weight', scope: { type: 'ever' } },
    height: { label: { en: 'Height', fr: 'Taille' }, itemRef: 'body-height', scope: { type: 'ever' } }
  }
};
const FR = { answered: 'Oui', no: 'Non', unknown: 'Je ne sais pas', declined: 'Je préfère ne pas répondre', reason: 'Raison (facultatif)', reasonPlaceholder: 'ex. confidentialité' };

let root: Root | null = null;
afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = '';
});

async function mount (props: any) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(<HDSQuestionnaireForm request={request} {...props} />); });
  return container;
}
const radios = (c: HTMLElement, key: string) => [...c.querySelectorAll<HTMLInputElement>(`input[name="__q::${key}::status"]`)];
const choiceTexts = (c: HTMLElement, key: string) => radios(c, key).map((r) => r.parentElement!.textContent);

describe('HDSQuestionnaireForm texts', () => {
  it('[QFL-1] shows the English defaults when no labels are given', async () => {
    const c = await mount({ onSubmit: vi.fn() });
    expect(choiceTexts(c, 'weight')).toEqual(['Yes', 'No', "I don't know", "I'd rather not say"]);
    await act(async () => { radios(c, 'weight')[3].click(); });
    expect(c.textContent).toContain(DEFAULT_QUESTIONNAIRE_LABELS.reason);
    expect(c.querySelector<HTMLInputElement>('input[type="text"]')!.placeholder).toBe('e.g. privacy');
  });

  it('[QFL-2] shows the labels it is given, and the English default for one left out', async () => {
    const { reasonPlaceholder: _left, ...partial } = FR;
    const c = await mount({ onSubmit: vi.fn(), labels: partial });
    expect(choiceTexts(c, 'height')).toEqual(['Oui', 'Non', 'Je ne sais pas', 'Je préfère ne pas répondre']);
    await act(async () => { radios(c, 'height')[3].click(); });
    expect(c.textContent).toContain('Raison (facultatif)');
    expect(c.querySelector<HTMLInputElement>('input[type="text"]')!.placeholder).toBe('e.g. privacy');
  });
});

describe('HDSQuestionnaireForm references of a prefilled "yes"', () => {
  it('[QFL-3] going back to "yes" restores the records the prefill found; a question with none stays at none', async () => {
    const onSubmit = vi.fn();
    const initialAnswers = { weight: { status: 'answered', references: ['w1', 'w2'] } };
    const c = await mount({ onSubmit, initialAnswers, labels: FR });
    await act(async () => { radios(c, 'weight')[1].click(); });
    await act(async () => { radios(c, 'weight')[0].click(); });
    await act(async () => { radios(c, 'height')[0].click(); });
    await act(async () => { c.querySelector('form')!.requestSubmit(); });
    const answers = onSubmit.mock.calls[0][0];
    expect(answers.weight).toEqual({ status: 'answered', references: ['w1', 'w2'] });
    expect(answers.height).toEqual({ status: 'answered', references: [] });
    expect(initialAnswers.weight.references).toEqual(['w1', 'w2']);
  });
});

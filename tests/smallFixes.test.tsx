// @vitest-environment happy-dom
// B-2026-11-24-9: reminder editor, questionnaire key errors, typed text, consent and questionnaire default texts
import { describe, it, expect, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { settings } from 'hds-lib';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('hds-lib', async (importOriginal) => ({
  ...(await importOriginal<typeof import('hds-lib')>()),
  getHDSModel: () => ({ itemsDefs: { getAllActive: () => [{ key: 'body-weight' }], forKey: () => null } })
}));

const { ReminderEditor } = await import('../src/components/ReminderEditor');
const { QuestionnaireBuilder } = await import('../src/components/QuestionnaireBuilder');
const { ConsentPanel } = await import('../src/components/ConsentPanel');
const { questionnaireFormLabels, DEFAULT_QUESTIONNAIRE_LABELS } = await import('../src/components/questionnaireLabels');
const { DEFAULT_CONSENT_LABELS } = await import('../src/components/consentLabels');

const noop = (): void => {};
let root: Root | null = null;
afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = '';
  settings.setPreferredLocales(['en']);
});

async function mount (element: React.ReactElement): Promise<HTMLElement> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(element); });
  return container;
}

const items = [{ key: 'menstrual-period', label: 'Period' }, { key: 'body-weight', label: 'Weight' }];

describe('[SMFX] ReminderEditor', () => {
  it('[SMFX1] a duration not in the list is selected and shown; the model default reads in words', async () => {
    const c = await mount(
      <ReminderEditor defaultReminder={{ cooldown: 'P10D', expectedInterval: { min: 'P1W', max: 'P1M' } }} override={undefined} onChange={noop} />
    );
    const selects = [...c.querySelectorAll('select')];
    expect(selects.some(s => s.value === 'P10D'), 'P10D selected').toBe(true);
    expect(c.textContent).toContain('1 week');
    expect(c.textContent).toContain('1 month');
  });

  it('[SMFX2] relative to an item: a picker of the form\'s items, labels in the description, no "[undefined]"', async () => {
    const onChange = vi.fn();
    const c = await mount(
      <ReminderEditor defaultReminder={{ relativeTo: 'menstrual-period' }} override={undefined} onChange={onChange} availableItemKeys={items} />
    );
    expect(c.textContent).not.toContain('undefined');
    expect(c.textContent).toContain('Period');
    const picker = [...c.querySelectorAll('select')].find(s => s.value === 'menstrual-period')!;
    expect(picker, 'item picker').toBeTruthy();
    expect([...picker.options].map(o => o.value)).toEqual(['', 'menstrual-period', 'body-weight']);
    await act(async () => {
      picker.value = 'body-weight';
      picker.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(onChange).toHaveBeenLastCalledWith({ relativeTo: 'body-weight' });
  });
});

describe('[SMFQ] QuestionnaireBuilder', () => {
  it('[SMFQ1] a key already used is refused in the builder\'s language, not with hds-lib\'s English text', async () => {
    settings.setPreferredLocales(['fr']);
    const questions: Record<string, any> = { q1: { label: { en: 'q1' }, itemRef: 'body-weight', scope: { type: 'ever' } } };
    const questionnaire: any = {
      title: { en: 'Intake' },
      description: null,
      get questionKeys () { return Object.keys(questions); },
      getQuestion: (k: string) => questions[k] ?? null,
      addQuestion: () => { throw new Error("Questionnaire already has a question with key 'q1'"); },
      removeQuestion: noop
    };
    const c = await mount(<QuestionnaireBuilder questionnaire={questionnaire} />);
    const input = [...c.querySelectorAll<HTMLInputElement>('input')].at(-1)!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')!.set!.call(input, 'q1');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const add = input.nextElementSibling as HTMLButtonElement;
    await act(async () => { add.click(); });
    expect(c.textContent).toContain('Une question a déjà cette clé');
    expect(c.textContent).not.toContain('already has');
  });
});

describe('[SMFL] default texts follow the language', () => {
  it('[SMFL1] ConsentPanel defaults to French, labels it is not given included', () => {
    settings.setPreferredLocales(['fr']);
    const html = renderToStaticMarkup(
      <ConsentPanel
        app={{ name: 'Mira' }}
        permissions={[{ streamId: 'body-weight', level: 'read', name: 'Poids' }]}
        expireAfterSeconds={60}
        mismatchWarning
        onAccept={noop}
        onRefuse={noop}
        labels={{ accept: 'Autoriser et connecter' }}
      />
    );
    expect(html).toContain('Mira demande l’autorisation de :');
    expect(html).toContain('Expire après : 60 s');
    expect(html).toContain('Cette application a déjà un accès');
    expect(html).toContain('>Refuser<');
    expect(html).toContain('Autoriser et connecter');
  });

  it('[SMFL2] the questionnaire form texts in French; the English exports stay English', () => {
    settings.setPreferredLocales(['fr']);
    expect(questionnaireFormLabels().declined).toBe('Je préfère ne pas répondre');
    expect(DEFAULT_QUESTIONNAIRE_LABELS.declined).toBe("I'd rather not say");
    expect(DEFAULT_CONSENT_LABELS.accept).toBe('Allow');
  });
});

// @vitest-environment happy-dom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { appTemplates, settings } from 'hds-lib';
import { shownLang, withShownText } from '../src/textUtils';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('hds-lib', async (importOriginal) => ({
  ...(await importOriginal<typeof import('hds-lib')>()),
  getHDSModel: () => ({ itemsDefs: { getAllActive: () => [], forKey: () => null } })
}));

const { QuestionnaireBuilder } = await import('../src/components/QuestionnaireBuilder');
const { default: FormBuilder } = await import('../src/components/FormBuilder');

let root: Root | null = null;
beforeEach(() => settings.setPreferredLocales(['fr']));
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

/** The input showing `shown`, then typed over */
async function retype (container: HTMLElement, shown: string, text: string): Promise<void> {
  const input = [...container.querySelectorAll<HTMLInputElement>('input')].find((i) => i.value === shown)!;
  expect(input, `an input showing "${shown}"`).toBeTruthy();
  await act(async () => {
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')!.set!.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function questionnaire (): any {
  return new appTemplates.Questionnaire({
    title: { en: 'Intake', fr: 'Accueil' },
    description: { en: 'About you', fr: 'Sur vous' },
    questions: {
      pain: {
        label: { en: 'Pain?', fr: 'Douleur ?' },
        itemRef: 'symptom-pain',
        scope: { type: 'ever' },
        subField: { type: 'select-segmented', label: { en: 'Where?', fr: 'Où ?' }, options: [{ value: 'b', label: { en: 'Back', fr: 'Dos' } }] }
      }
    }
  } as any);
}

describe('builders keep the other languages of a text', () => {
  it('[BLG-1] the edit goes to the language shown', () => {
    expect(shownLang({ en: 'a', fr: 'b' })).toBe('fr');
    expect(shownLang({ en: 'a' })).toBe('en');
    expect(shownLang({ de: 'a' })).toBe('de');
    expect(shownLang(null)).toBe('en');
    expect(withShownText({ en: 'a', fr: 'b' }, 'c')).toEqual({ en: 'a', fr: 'c' });
    expect(withShownText({ en: 'a' }, 'c')).toEqual({ en: 'c' });
    expect(withShownText(undefined, 'c')).toEqual({ en: 'c' });
  });

  it('[BLG-2] a questionnaire: title, description, question, sub-field and option', async () => {
    const q = questionnaire();
    const c = await mount(<QuestionnaireBuilder questionnaire={q} />);
    await retype(c, 'Accueil', 'Entrée');
    await retype(c, 'Sur vous', 'De vous');
    await act(async () => { [...c.querySelectorAll('button')].find((b) => b.textContent === '+')!.click(); });
    await retype(c, 'Douleur ?', 'Mal ?');
    await retype(c, 'Où ?', 'À quel endroit ?');
    await retype(c, 'Dos', 'Le dos');
    expect(q.title).toEqual({ en: 'Intake', fr: 'Entrée' });
    expect(q.description).toEqual({ en: 'About you', fr: 'De vous' });
    const question = q.getQuestion('pain');
    expect(question.label).toEqual({ en: 'Pain?', fr: 'Mal ?' });
    expect(question.subField.label).toEqual({ en: 'Where?', fr: 'À quel endroit ?' });
    expect(question.subField.options).toEqual([{ value: 'b', label: { en: 'Back', fr: 'Le dos' } }]);
  });

  it('[BLG-3] a section name is shown and edited in the language shown', async () => {
    const request: any = new appTemplates.CollectorRequest({} as any);
    request.createSection('s1', 'permanent').setName({ en: 'Profile', fr: 'Profil' });
    const c = await mount(<FormBuilder request={request} />);
    await retype(c, 'Profil', 'Mon profil');
    expect(request.getSectionByKey('s1').name).toMatchObject({ en: 'Profile', fr: 'Mon profil' });
  });

  it('[BLG-4] a text in English only stays in English only', async () => {
    const request: any = new appTemplates.CollectorRequest({} as any);
    request.createSection('s1', 'permanent').setName({ en: 'Profile' });
    const c = await mount(<FormBuilder request={request} />);
    await retype(c, 'Profile', 'Cycle');
    const { name } = request.getSectionByKey('s1').getData();
    expect(name.en).toBe('Cycle');
    expect(name.fr ?? null).toBeNull();
  });
});

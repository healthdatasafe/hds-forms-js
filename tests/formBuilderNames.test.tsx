// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { appTemplates, settings } from 'hds-lib';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

/** FormBuilder: the groups' names, a new questionnaire and its first question, in the language shown. */
const item = (key: string) => ({ key, label: key, description: '', data: { streamId: key, label: { en: key }, type: 'text' } });
const ITEMS = [item('body-weight'), item('activity-yoga'), item('condition-x'), item('odd-y')];
const STREAMS: Record<string, any> = {
  body: { id: 'body', name: 'Body', label: { en: 'Body', fr: 'Corps' } },
  activity: { id: 'activity', name: 'Physical Activity', label: { en: 'Physical Activity', fr: 'Activité physique' } },
  condition: { id: 'condition', name: 'Condition' }
};

vi.mock('hds-lib', async (importOriginal) => ({
  ...(await importOriginal<typeof import('hds-lib')>()),
  getHDSModel: () => ({
    itemsDefs: { getAllActive: () => ITEMS, forKey: (k: string) => ITEMS.find((i) => i.key === k) ?? null },
    streams: { getDataById: (id: string) => STREAMS[id] }
  })
}));

const { default: FormBuilder } = await import('../src/components/FormBuilder');

let root: Root | null = null;
afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = '';
  settings.setPreferredLocales(['en']);
});

async function mount (lang: string) {
  settings.setPreferredLocales([lang]);
  const request = new appTemplates.CollectorRequest({});
  const container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(<FormBuilder request={request} />); });
  return { container, request };
}

const groups = (c: HTMLElement) => [...c.querySelectorAll('span')].map((s) => s.textContent ?? '').filter((t) => t.startsWith('▸')).map((t) => t.slice(2));

describe('[FBNM] FormBuilder names in the language shown', () => {
  it('[FBNM1] groups by the label of their stream, in its order; its name, then the group, without one', async () => {
    expect(groups((await mount('fr')).container)).toEqual(['Activité physique', 'Condition', 'Corps', 'odd']);
  });

  it('[FBNM2] in English', async () => {
    expect(groups((await mount('en')).container)).toEqual(['Body', 'Condition', 'odd', 'Physical Activity']);
  });

  it.each([['fr', 'Nouveau questionnaire', 'Nouvelle question', /Ajouter un questionnaire/], ['en', 'New questionnaire', 'New question', /Add questionnaire/]])('[FBNM3] %s: a new questionnaire starts in the language shown, in one text', async (lang, title, question, button) => {
    const { container, request } = await mount(lang);
    const add = [...container.querySelectorAll('button')].find((b) => button.test(b.textContent ?? ''))!;
    await act(async () => { add.click(); });
    const q = request.questionnaires[0] as any;
    expect(q.title).toEqual({ en: title });
    expect(q.questions.q1.label).toEqual({ en: question });
  });
});

// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('hds-lib', () => ({
  localizeText: (t: any) => (typeof t === 'string' ? t : (t?.fr ?? t?.en ?? ''))
}));

const { EntryList } = await import('../src/components/EntryList');
const { FORM_TEXTS } = await import('../src/components/formTexts');
const builderTexts = await import('../src/components/builderTexts');
const { ReminderEditor } = await import('../src/components/ReminderEditor');
const { repeatableLabel, REPEATABLE_LABELS, REPEATABLE_OPTIONS } = await import('../src/formBuilderUtils');

let root: Root | null = null;
afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = '';
});

describe('form texts (B-2026-11-20-8)', () => {
  it('[FT-1] every text has an English and a French value', () => {
    for (const table of [FORM_TEXTS, ...Object.values(builderTexts)]) {
      for (const [key, text] of Object.entries(table as Record<string, { en: string; fr: string }>)) {
        expect(text.en, key).toBeTruthy();
        expect(text.fr, key).toBeTruthy();
        expect(text.fr.match(/\{\w+\}/g)?.sort(), key).toEqual(text.en.match(/\{\w+\}/g)?.sort());
      }
    }
  });

  it('[FT-2] the entry list shows its texts in the locale', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(<EntryList entries={[{ time: 0, values: { a: 1 } }]} itemKeys={['a']} fieldLabels={{ a: 'A' }} onEdit={() => {}} onDelete={() => {}} />);
    });
    expect(container.textContent).toContain('Saisies précédentes');
    expect(container.querySelector('th')!.textContent).toBe('Date');
    expect([...container.querySelectorAll('button')].map((b) => b.title)).toEqual(['Modifier', 'Supprimer']);
  });

  it('[FT-3] the reminder editor shows its texts in the locale, the model default included', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(<ReminderEditor defaultReminder={{ cooldown: 'P1D', importance: 'should' }} override={undefined} onChange={() => {}} />);
    });
    expect(container.textContent).toContain('Rappel :');
    expect(container.textContent).toContain('délai minimal : P1D, recommandé');
    const options = [...container.querySelectorAll('option')].map((o) => o.textContent);
    expect(options).toContain('par défaut (recommandé)');
    expect(options).toContain('8 heures');
  });

  it('[FT-4] a repeatable value is named in the locale; the exported constants stay English', () => {
    expect(repeatableLabel('P1D')).toBe('Chaque jour');
    expect(repeatableLabel('P3D')).toBe('P3D');
    expect(REPEATABLE_LABELS.P1D).toBe('Daily');
    expect(REPEATABLE_OPTIONS.map((o) => o.value)).toEqual(['once', 'any', 'P1D', 'P1W', 'P1M', 'unlimited']);
  });
});

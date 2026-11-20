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

let root: Root | null = null;
afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = '';
});

describe('form texts (B-2026-11-20-8)', () => {
  it('[FT-1] every text has an English and a French value', () => {
    for (const [key, text] of Object.entries(FORM_TEXTS)) {
      expect(text.en, key).toBeTruthy();
      expect(text.fr, key).toBeTruthy();
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
});

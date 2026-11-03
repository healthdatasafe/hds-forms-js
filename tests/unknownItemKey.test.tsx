import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * A data set whose sections name an item key the model does not know (removed, renamed, saved against a newer
 * model) must not blank the app: the builder shows the key as an unknown item the doctor can remove, and the
 * preview skips it (B-2026-11-03-1).
 */
const ITEMS: Record<string, any> = {
  'body-weight': {
    key: 'body-weight',
    label: 'Body weight',
    description: '',
    repeatable: 'once',
    isSystem: false,
    isDeprecated: false,
    data: { type: 'text', label: { en: 'Body weight' }, streamId: 'body-weight', eventType: 'note/txt' }
  }
};

const l = (t: any): string => (typeof t === 'string' ? t : (t?.en ?? ''));

vi.mock('hds-lib', () => ({
  localizeText: l,
  l,
  getHDSModel: () => ({
    itemsDefs: {
      forKey: (key: string, throwIfMissing = true) => {
        const d = ITEMS[key];
        if (!d && throwIfMissing) throw new Error('Cannot find item definition with key: ' + key);
        return d ?? null;
      },
      getAll: () => Object.values(ITEMS),
      getAllActive: () => Object.values(ITEMS)
    },
    datasources: { forKey: () => undefined }
  }),
  HDSSettings: { isHooked: false, get: () => undefined },
  appTemplates: { Questionnaire: class {} },
  getPreferredInput: () => undefined
}));

const { default: FormBuilder } = await import('../src/components/FormBuilder');

function requestWith (itemKeys: string[]): any {
  const section = {
    key: 's1',
    type: 'permanent',
    name: { en: 'Profile' },
    itemKeys,
    itemCustomizations: {},
    getItemCustomization: () => undefined
  };
  return {
    questionnaires: [],
    sections: [section],
    getSectionByKey: (k: string) => (k === 's1' ? section : null),
    content: { sections: [{ key: 's1', itemKeys }] }
  };
}

describe('FormBuilder with an item key the model does not know', () => {
  it('renders the unknown key as a removable "unknown item" row instead of throwing', () => {
    const html = renderToStaticMarkup(<FormBuilder request={requestWith(['body-weight', 'mood'])} />);
    expect(html).toContain('Body weight');
    expect(html).toContain('(mood)');
    expect(html).toContain('data-testid="unknown-item"');
    // the known item has a customize button, the unknown one does not
    expect(html.match(/title="Customize"/g)?.length).toBe(1);
  });

  it('renders the preview without the unknown key', () => {
    const html = renderToStaticMarkup(
      <FormBuilder request={requestWith(['body-weight', 'mood'])} defaultPreviewMode='preview' />
    );
    expect(html).toContain('Body weight');
  });

  it('marks nothing when every key is known', () => {
    const html = renderToStaticMarkup(<FormBuilder request={requestWith(['body-weight'])} />);
    expect(html).not.toContain('data-testid="unknown-item"');
  });
});

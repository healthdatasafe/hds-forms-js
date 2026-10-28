import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Imported items (data-model 3.27.0, `type: imported`, `lab-result/coded-v1`) are written by an importer, never
 * entered in a form: shown as not editable, never offered in a picker. A type a newer data model adds is treated
 * the same, so an older build never crashes or offers it.
 */
const ITEMS: Record<string, any> = {
  'body-weight': {
    key: 'body-weight',
    label: { en: 'Body weight' },
    isSystem: false,
    isDeprecated: false,
    data: { type: 'number', label: { en: 'Body weight' }, streamId: 'body-weight', eventType: 'mass/kg' }
  },
  'body-blood-coded': {
    key: 'body-blood-coded',
    label: { en: 'Other blood results' },
    isSystem: false,
    isDeprecated: false,
    data: { type: 'imported', label: { en: 'Other blood results' }, streamId: 'body-blood-coded', eventType: 'lab-result/coded-v1' }
  },
  'future-thing': {
    key: 'future-thing',
    label: { en: 'Future thing' },
    isSystem: false,
    isDeprecated: false,
    data: { type: 'hologram', label: { en: 'Future thing' }, streamId: 'future-thing', eventType: 'note/txt' }
  }
};

vi.mock('hds-lib', () => ({
  localizeText: (t: any) => (typeof t === 'string' ? t : (t?.en ?? '')),
  getHDSModel: () => ({
    itemsDefs: {
      forKey: (key: string, throwIfMissing = true) => {
        const d = ITEMS[key];
        if (!d && throwIfMissing) throw new Error('Cannot find item definition with key: ' + key);
        return d ?? null;
      },
      getAll: () => Object.values(ITEMS),
      // as an hds-lib before 2.28.0, whose getAllActive is a blacklist
      getAllActive: () => Object.values(ITEMS).filter((d: any) => !d.isDeprecated && !d.isSystem)
    }
  }),
  HDSSettings: { isHooked: false, get: () => undefined },
  appTemplates: {},
  getPreferredInput: () => undefined
}));

const { HDSFormField } = await import('../src/components/HDSFormField');
const { ItemSearchPicker } = await import('../src/components/ItemSearchPicker');

const noop = (): void => {};

describe('imported and unknown item types', () => {
  for (const key of ['body-blood-coded', 'future-thing']) {
    it(`HDSFormField shows ${key} as not editable here, with no input`, () => {
      const html = renderToStaticMarkup(
        <HDSFormField itemData={ITEMS[key].data} itemKey={key} value={undefined} onChange={noop} />
      );
      expect(html).toContain(ITEMS[key].label.en);
      expect(html).toContain('Not editable here.');
      expect(html).not.toContain('Unknown field type');
      expect(html).not.toContain('<input');
    });
  }

  it('ItemSearchPicker never offers them, even when the lib\'s getAllActive still lists them', () => {
    for (const includeDeprecated of [false, true]) {
      const html = renderToStaticMarkup(<ItemSearchPicker onSelect={noop} includeDeprecated={includeDeprecated} />);
      // groups render collapsed with their item count: `body` holds body-weight only, no `future` group
      expect(html).toMatch(/▸ body<\/span><span[^>]*>1<\/span>/);
      expect(html).not.toContain('▸ future');
    }
  });
});

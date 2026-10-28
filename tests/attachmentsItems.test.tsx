import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Document items (data-model 3.25.0, `type: attachments`, `document` on `file/xds-v1`) are files imported as
 * attachments, never entered field by field: shown as not editable in a form, never offered in a picker, and
 * described (not thrown on) by `schemaFor`.
 */
const ITEMS: Record<string, any> = {
  'body-weight': {
    key: 'body-weight',
    label: { en: 'Body weight' },
    isSystem: false,
    isDeprecated: false,
    data: { type: 'text', label: { en: 'Body weight' }, streamId: 'body-weight', eventType: 'note/txt' }
  },
  document: {
    key: 'document',
    label: { en: 'Medical document' },
    isSystem: false,
    isDeprecated: false,
    data: { type: 'attachments', label: { en: 'Medical document' }, streamId: 'documents', eventType: 'file/xds-v1' }
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
      // as an hds-lib before 2.26.0, which does not know document items yet
      getAllActive: () => Object.values(ITEMS).filter((d: any) => !d.isDeprecated && !d.isSystem)
    }
  }),
  HDSSettings: { isHooked: false, get: () => undefined },
  appTemplates: {},
  getPreferredInput: () => undefined
}));

const { HDSFormField } = await import('../src/components/HDSFormField');
const { ItemSearchPicker } = await import('../src/components/ItemSearchPicker');
const { schemaFor } = await import('../src/schema/schemas');

const noop = (): void => {};

describe('document items', () => {
  it('HDSFormField shows the item as not editable here, not "Unknown field type"', () => {
    const html = renderToStaticMarkup(
      <HDSFormField itemData={ITEMS.document.data} itemKey='document' value={undefined} onChange={noop} />
    );
    expect(html).toContain('Medical document');
    expect(html).toContain('Not editable here');
    expect(html).not.toContain('Unknown field type');
    expect(html).not.toContain('<input');
  });

  it('schemaFor describes it as an object instead of throwing', () => {
    expect(schemaFor(ITEMS.document.data)).toMatchObject({ title: 'Medical document', type: 'object' });
  });

  it('ItemSearchPicker never offers it, even when the lib\'s getAllActive still lists it', () => {
    expect(renderToStaticMarkup(<ItemSearchPicker onSelect={noop} />)).not.toContain('document');
    expect(renderToStaticMarkup(<ItemSearchPicker onSelect={noop} includeDeprecated />)).not.toContain('document');
  });
});

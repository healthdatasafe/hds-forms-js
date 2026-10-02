import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * System items (data-model 3.13.0, `type: system`, first one `sync-status`) are
 * state written by software, not data a user enters. They resolve like any item
 * but must never be rendered as a form field or offered in a picker.
 */
const ITEMS: Record<string, any> = {
  'body-weight': {
    key: 'body-weight',
    label: { en: 'Body weight' },
    isSystem: false,
    isDeprecated: false,
    data: { type: 'text', label: { en: 'Body weight' }, streamId: 'body-weight', eventType: 'note/txt' }
  },
  'legacy-item': {
    key: 'legacy-item',
    label: { en: 'Legacy item' },
    isSystem: false,
    isDeprecated: true,
    data: { type: 'text', label: { en: 'Legacy item' }, streamId: 'legacy', eventType: 'note/txt' }
  },
  'sync-status': {
    key: 'sync-status',
    label: { en: 'Connected services status' },
    isSystem: true,
    isDeprecated: false,
    data: { type: 'system', label: { en: 'Connected services status' }, streamId: 'sync-status', eventType: 'sync-status/connector-v1' }
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
      getAllActive: () => Object.values(ITEMS).filter((d: any) => !d.isDeprecated && !d.isSystem)
    }
  }),
  HDSSettings: { isHooked: false, get: () => undefined },
  appTemplates: {},
  getPreferredInput: () => undefined
}));

const { HDSFormField } = await import('../src/components/HDSFormField');
const { HDSFormSection } = await import('../src/components/HDSFormSection');
const { ItemSearchPicker } = await import('../src/components/ItemSearchPicker');

const noop = (): void => {};

describe('system items are never form fields', () => {
  it('HDSFormField renders nothing for a system item (no "Unknown field type")', () => {
    const html = renderToStaticMarkup(
      <HDSFormField itemData={ITEMS['sync-status'].data} itemKey='sync-status' value={undefined} onChange={noop} />
    );
    expect(html).toBe('');
  });

  it('HDSFormSection skips a system item key, in the fields and in the entry list', () => {
    const html = renderToStaticMarkup(
      <HDSFormSection
        section={{ key: 's', type: 'recurring', itemKeys: ['body-weight', 'sync-status'] }}
        onSubmit={noop}
        entries={[{ time: 1700000000, values: { 'body-weight': 'x' } } as any]}
        onEditEntry={noop}
        onDeleteEntry={noop}
      />
    );
    expect(html).toContain('Body weight');
    expect(html).not.toContain('Connected services status');
    expect(html).not.toContain('sync-status');
    expect(html).not.toContain('Unknown field type');
  });
});

describe('system items are never offered in ItemSearchPicker', () => {
  // The picker groups items by key prefix and only lists a group's items while it is
  // expanded or a search is active; group headers are always rendered.
  it('default listing (getAllActive) has no system group', () => {
    const html = renderToStaticMarkup(<ItemSearchPicker onSelect={noop} />);
    expect(html).toContain('body');
    expect(html).not.toContain('sync');
  });

  it('includeDeprecated listing (getAll) still drops system items', () => {
    const html = renderToStaticMarkup(<ItemSearchPicker onSelect={noop} includeDeprecated />);
    expect(html).toContain('legacy');
    expect(html).not.toContain('sync');
  });
});

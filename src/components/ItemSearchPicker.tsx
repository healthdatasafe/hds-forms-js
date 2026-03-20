import { useState, useMemo } from 'react';
import { getHDSModel, localizeText } from 'hds-lib';

export interface ItemSearchPickerProps {
  /** Pre-loaded item list. If not provided, loads from HDSModel. */
  items?: Array<{ key: string; label: string }>;
  /** Currently selected item key */
  selectedKey: string;
  /** Called when an item is selected (or '' when cleared) */
  onSelect: (key: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Filter function to restrict which items are shown */
  filter?: (item: { key: string; label: string }) => boolean;
}

/**
 * Searchable item picker for HDS itemDefs.
 * Groups items by stream prefix and supports text search on label + key.
 * Can be used standalone or within forms to select items.
 */
export function ItemSearchPicker ({ items: externalItems, selectedKey, onSelect, placeholder, filter }: ItemSearchPickerProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  // Use provided items or load from model
  const allItems = useMemo(() => {
    if (externalItems) return externalItems;
    try {
      const model = getHDSModel();
      return model.itemsDefs.getAll().map((d: any) => ({
        key: d.key,
        label: typeof d.label === 'object' ? (localizeText(d.label) || d.key) : (d.label || d.key),
      }));
    } catch { return []; }
  }, [externalItems]);

  const items = filter ? allItems.filter(filter) : allItems;

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(i => i.label.toLowerCase().includes(q) || i.key.toLowerCase().includes(q));
  }, [items, search]);

  // Group by stream prefix (first two segments of key)
  const grouped = useMemo(() => {
    const groups: Record<string, Array<{ key: string; label: string }>> = {};
    for (const item of filtered) {
      const parts = item.key.split('-');
      const prefix = parts.length > 2 ? parts.slice(0, 2).join('-') : parts[0];
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push(item);
    }
    return groups;
  }, [filtered]);

  const selectedLabel = items.find(i => i.key === selectedKey)?.label;

  return (
    <div className='relative'>
      <div
        className='flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm dark:border-gray-600 dark:bg-gray-700'
        onClick={() => setOpen(!open)}
      >
        <span className={`flex-1 ${selectedKey ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
          {selectedKey ? `${selectedLabel} (${selectedKey})` : (placeholder || '-- Pick an item --')}
        </span>
        <span className='text-gray-400'>{open ? '\u25B2' : '\u25BC'}</span>
      </div>
      {open && (
        <div className='absolute z-10 mt-1 max-h-80 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800'>
          <div className='sticky top-0 bg-white p-2 dark:bg-gray-800'>
            <input
              type='text'
              placeholder='Search items...'
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              className='block w-full rounded border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white'
            />
          </div>
          {selectedKey && (
            <button
              className='w-full px-3 py-1.5 text-left text-xs text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              onClick={() => { onSelect(''); setOpen(false); setSearch(''); }}
            >
              Clear selection
            </button>
          )}
          {Object.entries(grouped).map(([prefix, groupItems]) => (
            <div key={prefix}>
              <div className='px-3 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500'>{prefix}</div>
              {groupItems.map(item => (
                <button
                  key={item.key}
                  className={`w-full px-3 py-1.5 text-left text-sm hover:bg-primary-50 dark:hover:bg-gray-700 ${item.key === selectedKey ? 'bg-primary-50 font-medium text-primary-700 dark:bg-gray-700 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'}`}
                  onClick={() => { onSelect(item.key); setOpen(false); setSearch(''); }}
                >
                  {item.label} <span className='text-xs text-gray-400'>({item.key})</span>
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className='px-3 py-2 text-sm text-gray-400'>No items match</div>
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { getHDSModel, localizeText } from 'hds-lib';
import { getItemGroup } from '../formBuilderUtils';

export interface ItemSearchPickerItem {
  key: string;
  label: string;
  description?: string;
}

export interface ItemSearchPickerProps {
  /** Pre-loaded item list. If not provided, loads from HDSModel. */
  items?: ItemSearchPickerItem[];
  /** Currently selected item key */
  selectedKey?: string;
  /** Called when an item is selected */
  onSelect: (key: string) => void;
  /** Search placeholder */
  placeholder?: string;
  /** Filter function to restrict which items are shown */
  filter?: (item: ItemSearchPickerItem) => boolean;
  /** Set of item keys to mark as used (shown with checkmark, non-clickable) */
  usedKeys?: Set<string>;
  /** If true, items can only be selected (not marked as used). Default true. */
  selectable?: boolean;
}

/**
 * Searchable item picker for HDS itemDefs.
 * Displays collapsible groups with item counts and text search.
 * Same pattern as FormBuilder's item browser — reusable across apps.
 */
export function ItemSearchPicker ({
  items: externalItems,
  selectedKey,
  onSelect,
  placeholder = 'Search items...',
  filter,
  usedKeys,
  selectable = true,
}: ItemSearchPickerProps) {
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Use provided items or load from model
  const allItems = useMemo(() => {
    if (externalItems) return externalItems;
    try {
      const model = getHDSModel();
      return model.itemsDefs.getAll().map((d: any) => ({
        key: d.key,
        label: typeof d.label === 'object' ? (localizeText(d.label) || d.key) : (d.label || d.key),
        description: d.description || undefined,
      }));
    } catch { return []; }
  }, [externalItems]);

  const items = filter ? allItems.filter(filter) : allItems;

  // Group and filter
  const groupedItems = useMemo(() => {
    const groups: Record<string, ItemSearchPickerItem[]> = {};
    const q = search.toLowerCase();
    for (const item of items) {
      if (q && !item.label.toLowerCase().includes(q) && !item.key.toLowerCase().includes(q)) continue;
      const group = getItemGroup(item.key);
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
    }
    return groups;
  }, [items, search]);

  const sortedGroups = useMemo(() => Object.keys(groupedItems).sort(), [groupedItems]);

  function toggleGroup (group: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  return (
    <div className='overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700' style={{ maxHeight: '400px' }}>
      <div className='sticky top-0 border-b border-gray-200 bg-gray-50 p-2 dark:border-gray-600 dark:bg-gray-700'>
        <input
          type='text'
          placeholder={placeholder}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className='w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-primary-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white'
        />
      </div>
      <div className='p-1'>
        {sortedGroups.map(group => (
          <div key={group} className='mb-1'>
            <button
              onClick={() => toggleGroup(group)}
              className='flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm font-semibold text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-600'
            >
              <span>{(expandedGroups.has(group) || !!search) ? '\u25BE' : '\u25B8'} {group}</span>
              <span className='rounded-full bg-gray-200 px-1.5 text-xs text-gray-500 dark:bg-gray-600 dark:text-gray-400'>
                {groupedItems[group].length}
              </span>
            </button>
            {(expandedGroups.has(group) || !!search) && (
              <div className='ml-2'>
                {groupedItems[group].map(item => {
                  const used = usedKeys?.has(item.key);
                  const isSelected = item.key === selectedKey;
                  return (
                    <button
                      key={item.key}
                      onClick={() => selectable && !used && onSelect(item.key)}
                      disabled={!selectable || used}
                      className={`block w-full rounded px-2 py-1 text-left text-sm ${
                        isSelected
                          ? 'bg-primary-50 font-medium text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                          : used
                            ? 'text-gray-400 dark:text-gray-500'
                            : 'text-gray-700 hover:bg-primary-50 hover:text-primary-700 dark:text-gray-300 dark:hover:bg-gray-600'
                      }`}
                      title={item.description || item.key}
                    >
                      {used && <span className='mr-1'>{'\u2713'}</span>}
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        {sortedGroups.length === 0 && (
          <div className='px-3 py-2 text-sm text-gray-400'>No items match</div>
        )}
      </div>
    </div>
  );
}

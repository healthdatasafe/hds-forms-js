import { useState, useMemo, useCallback } from 'react';
import { getModel } from './hdsLibService';
import { appTemplates } from 'hds-lib';
import { HDSFormSection } from 'hds-forms/components/HDSFormSection';

const { CollectorRequest } = appTemplates;

type PreviewMode = 'preview' | 'json';

const REPEATABLE_LABELS: Record<string, string> = {
  once: 'Once',
  P1D: 'Daily',
  P1W: 'Weekly',
  P1M: 'Monthly',
  unlimited: 'Unlimited'
};

function repeatableLabel (value: string): string {
  return REPEATABLE_LABELS[value] || value;
}

const REPEATABLE_OPTIONS = [
  { value: 'once', label: 'Once' },
  { value: 'P1D', label: 'Daily' },
  { value: 'P1W', label: 'Weekly' },
  { value: 'P1M', label: 'Monthly' },
  { value: 'unlimited', label: 'Unlimited' }
];

/** Group items by top-level stream prefix (body, profile, fertility, ...) */
function getItemGroup (streamId: string): string {
  if (!streamId) return 'other';
  const parts = streamId.split('-');
  return parts[0];
}

export default function FormBuilder () {
  const model = getModel();
  const allItemDefs = useMemo(() => model.itemsDefs.getAll(), [model]);

  // CollectorRequest as single source of truth (mutated in place)
  const [request] = useState(() => new CollectorRequest({}));
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion(v => v + 1), []);

  // Form metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // UI state
  const [selectedSectionKey, setSelectedSectionKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('json');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editingItemKey, setEditingItemKey] = useState<string | null>(null);

  // Derive sections from request (re-read on version change)
  const sections = request.sections; // eslint-disable-line @typescript-eslint/no-unused-vars -- version triggers re-read
  void version; // used to trigger re-render

  // Group and filter items for the browser
  const groupedItems = useMemo(() => {
    const groups: Record<string, Array<{ key: string; label: string; streamId: string }>> = {};
    for (const itemDef of allItemDefs) {
      const label = itemDef.label;
      if (searchQuery && !label.toLowerCase().includes(searchQuery.toLowerCase()) && !itemDef.key.toLowerCase().includes(searchQuery.toLowerCase())) {
        continue;
      }
      const group = getItemGroup(itemDef.data.streamId);
      if (!groups[group]) groups[group] = [];
      groups[group].push({ key: itemDef.key, label, streamId: itemDef.data.streamId });
    }
    return groups;
  }, [allItemDefs, searchQuery]);

  // Track all item keys currently in the form
  const usedItemKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const section of sections) {
      for (const key of section.itemKeys) keys.add(key);
    }
    return keys;
  }, [sections, version]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync metadata to request
  function updateTitle (value: string) {
    setTitle(value);
    if (value) request.title = { en: value };
  }

  function updateDescription (value: string) {
    setDescription(value);
    if (value) request.description = { en: value };
  }

  // Section operations
  function addSection (type: 'permanent' | 'recurring' = 'permanent') {
    const key = `section-${Date.now()}`;
    const section = request.createSection(key, type);
    section.setName({ en: 'New section' });
    setSelectedSectionKey(key);
    refresh();
  }

  function removeSection (key: string) {
    request.removeSection(key);
    if (selectedSectionKey === key) setSelectedSectionKey(null);
    refresh();
  }

  function moveSectionUp (key: string) {
    const idx = sections.findIndex(s => s.key === key);
    if (idx > 0) { request.moveSection(key, idx - 1); refresh(); }
  }

  function moveSectionDown (key: string) {
    const idx = sections.findIndex(s => s.key === key);
    if (idx < sections.length - 1) { request.moveSection(key, idx + 1); refresh(); }
  }

  function updateSectionName (key: string, name: string) {
    const section = request.getSectionByKey(key);
    if (section) { section.setName({ en: name }); refresh(); }
  }

  function toggleSectionType (key: string) {
    const section = request.getSectionByKey(key);
    if (!section) return;
    const idx = sections.findIndex(s => s.key === key);
    const data = section.getData();
    const newType = data.type === 'permanent' ? 'recurring' : 'permanent';
    // Recreate: remove then insert at same position
    request.removeSection(key);
    const newSection = request.createSection(key, newType as 'permanent' | 'recurring');
    newSection.setName(data.name);
    newSection.addItemKeys(data.itemKeys);
    if (data.itemCustomizations) {
      for (const [itemKey, cust] of Object.entries(data.itemCustomizations)) {
        newSection.setItemCustomization(itemKey, cust as Record<string, unknown>);
      }
    }
    // createSection appends — move to original position
    if (idx < sections.length - 1) {
      request.moveSection(key, idx);
    }
    refresh();
  }

  // Item operations
  function addItemToSection (itemKey: string) {
    if (!selectedSectionKey) return;
    const section = request.getSectionByKey(selectedSectionKey);
    if (!section) return;
    try {
      section.addItemKey(itemKey);
      refresh();
    } catch (e) {
      console.warn('Cannot add item:', e);
    }
  }

  function removeItemFromSection (sectionKey: string, itemKey: string) {
    const section = request.getSectionByKey(sectionKey);
    if (section) { section.removeItemKey(itemKey); refresh(); }
  }

  function moveItemUp (sectionKey: string, itemKey: string) {
    const section = request.getSectionByKey(sectionKey);
    if (!section) return;
    const idx = section.itemKeys.indexOf(itemKey);
    if (idx > 0) { section.moveItemKey(itemKey, idx - 1); refresh(); }
  }

  function moveItemDown (sectionKey: string, itemKey: string) {
    const section = request.getSectionByKey(sectionKey);
    if (!section) return;
    const idx = section.itemKeys.indexOf(itemKey);
    if (idx < section.itemKeys.length - 1) { section.moveItemKey(itemKey, idx + 1); refresh(); }
  }

  function setRepeatable (sectionKey: string, itemKey: string, value: string) {
    const section = request.getSectionByKey(sectionKey);
    if (!section) return;
    if (value === '') {
      // Remove customization
      section.setItemCustomization(itemKey, {});
    } else {
      section.setItemCustomization(itemKey, { repeatable: value });
    }
    refresh();
  }

  function toggleGroup (group: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group); else next.add(group);
      return next;
    });
  }

  // Get item label from model
  function itemLabel (key: string): string {
    try {
      return model.itemsDefs.forKey(key).label;
    } catch { return key; }
  }

  const contentJson = useMemo(() => JSON.stringify(request.content, null, 2), [version]); // eslint-disable-line react-hooks/exhaustive-deps

  const sortedGroups = useMemo(() => Object.keys(groupedItems).sort(), [groupedItems]);

  return (
    <div className='flex gap-4' style={{ minHeight: '600px' }}>
      {/* ── Left: Item Browser ── */}
      <div className='w-64 shrink-0 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700'>
        <div className='sticky top-0 border-b border-gray-200 bg-gray-50 p-2 dark:border-gray-600 dark:bg-gray-700'>
          <input
            type='text'
            placeholder='Search items...'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className='w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-primary-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white'
          />
          {!selectedSectionKey && sections.length > 0 && (
            <p className='mt-1 text-xs text-amber-600 dark:text-amber-400'>Select a section to add items</p>
          )}
        </div>
        <div className='p-1'>
          {sortedGroups.map(group => (
            <div key={group} className='mb-1'>
              <button
                onClick={() => toggleGroup(group)}
                className='flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs font-semibold text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-600'
              >
                <span>{expandedGroups.has(group) ? '▾' : '▸'} {group}</span>
                <span className='rounded-full bg-gray-200 px-1.5 text-xs text-gray-500 dark:bg-gray-600 dark:text-gray-400'>
                  {groupedItems[group].length}
                </span>
              </button>
              {expandedGroups.has(group) && (
                <div className='ml-2'>
                  {groupedItems[group].map(item => {
                    const used = usedItemKeys.has(item.key);
                    return (
                      <button
                        key={item.key}
                        onClick={() => !used && addItemToSection(item.key)}
                        disabled={!selectedSectionKey || used}
                        className={`block w-full rounded px-2 py-0.5 text-left text-xs ${
                          used
                            ? 'text-gray-400 dark:text-gray-500'
                            : selectedSectionKey
                              ? 'text-gray-700 hover:bg-primary-50 hover:text-primary-700 dark:text-gray-300 dark:hover:bg-primary-900 dark:hover:text-primary-300'
                              : 'text-gray-400 dark:text-gray-500'
                        }`}
                        title={item.key}
                      >
                        {used && <span className='mr-1'>✓</span>}
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: Builder Canvas + Preview ── */}
      <div className='flex min-w-0 flex-1 flex-col gap-4'>
        {/* Metadata */}
        <div className='grid grid-cols-2 gap-3'>
          <div>
            <label className='mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300'>Title</label>
            <input
              type='text'
              value={title}
              onChange={e => updateTitle(e.target.value)}
              placeholder='Form title'
              className='w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-primary-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white'
            />
          </div>
          <div>
            <label className='mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300'>Description</label>
            <input
              type='text'
              value={description}
              onChange={e => updateDescription(e.target.value)}
              placeholder='Form description'
              className='w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-primary-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white'
            />
          </div>
        </div>

        {/* Sections */}
        <div className='space-y-3'>
          {sections.map((section, sIdx) => {
            const isSelected = selectedSectionKey === section.key;
            return (
              <div
                key={section.key}
                className={`rounded-lg border p-3 ${
                  isSelected
                    ? 'border-primary-400 bg-primary-50 dark:border-primary-600 dark:bg-primary-900/20'
                    : 'border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800'
                }`}
                onClick={() => setSelectedSectionKey(section.key)}
              >
                {/* Section header */}
                <div className='mb-2 flex items-center gap-2'>
                  <input
                    type='text'
                    value={section.name?.en || ''}
                    onChange={e => updateSectionName(section.key, e.target.value)}
                    className='flex-1 rounded border border-gray-300 bg-white px-2 py-0.5 text-sm font-medium text-gray-900 focus:border-primary-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white'
                    placeholder='Section name'
                    onClick={e => e.stopPropagation()}
                  />
                  <button
                    onClick={e => { e.stopPropagation(); toggleSectionType(section.key); }}
                    className='rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                    title='Click to toggle type'
                  >
                    {section.type}
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); moveSectionUp(section.key); }}
                    disabled={sIdx === 0}
                    className='text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30 dark:hover:text-gray-300'
                    title='Move section up'
                  >↑</button>
                  <button
                    onClick={e => { e.stopPropagation(); moveSectionDown(section.key); }}
                    disabled={sIdx === sections.length - 1}
                    className='text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30 dark:hover:text-gray-300'
                    title='Move section down'
                  >↓</button>
                  <button
                    onClick={e => { e.stopPropagation(); removeSection(section.key); }}
                    className='text-xs text-red-400 hover:text-red-600 dark:hover:text-red-300'
                    title='Remove section'
                  >×</button>
                </div>

                {/* Items in section */}
                {section.itemKeys.length === 0 ? (
                  <p className='py-2 text-center text-xs text-gray-400 dark:text-gray-500'>
                    {isSelected ? 'Click items in the browser to add them' : 'No items — click to select this section'}
                  </p>
                ) : (
                  <div className='space-y-1'>
                    {section.itemKeys.map((itemKey, iIdx) => {
                      const customization = section.getItemCustomization(itemKey);
                      const isEditing = editingItemKey === `${section.key}:${itemKey}`;
                      const itemDef = model.itemsDefs.forKey(itemKey);
                      const defaultRepeatable = itemDef?.repeatable || 'unlimited';
                      const effectiveRepeatable = customization?.repeatable ? String(customization.repeatable) : defaultRepeatable;
                      const isOverridden = customization?.repeatable != null;
                      return (
                        <div key={itemKey}>
                          <div className='flex items-center gap-1 rounded px-2 py-0.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700'>
                            <span className='flex-1 text-gray-700 dark:text-gray-300' title={itemKey}>
                              {itemLabel(itemKey)}
                              <span className='ml-1 text-gray-400'>({itemKey})</span>
                              <span className={`ml-1 rounded px-1 ${
                                isOverridden
                                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                                  : 'bg-gray-100 text-gray-500 dark:bg-gray-600 dark:text-gray-400'
                              }`}>
                                {repeatableLabel(effectiveRepeatable)}
                              </span>
                            </span>
                            <button
                              onClick={e => { e.stopPropagation(); setEditingItemKey(isEditing ? null : `${section.key}:${itemKey}`); }}
                              className='text-gray-400 hover:text-primary-600 dark:hover:text-primary-400'
                              title='Customize'
                            >⚙</button>
                            <button
                              onClick={e => { e.stopPropagation(); moveItemUp(section.key, itemKey); }}
                              disabled={iIdx === 0}
                              className='text-gray-400 hover:text-gray-600 disabled:opacity-30 dark:hover:text-gray-300'
                            >↑</button>
                            <button
                              onClick={e => { e.stopPropagation(); moveItemDown(section.key, itemKey); }}
                              disabled={iIdx === section.itemKeys.length - 1}
                              className='text-gray-400 hover:text-gray-600 disabled:opacity-30 dark:hover:text-gray-300'
                            >↓</button>
                            <button
                              onClick={e => { e.stopPropagation(); removeItemFromSection(section.key, itemKey); }}
                              className='text-red-400 hover:text-red-600 dark:hover:text-red-300'
                            >×</button>
                          </div>
                          {/* Inline customization panel */}
                          {isEditing && (
                            <div className='ml-4 mt-1 flex items-center gap-2 rounded bg-gray-100 p-2 text-xs dark:bg-gray-700'>
                              <label className='text-gray-600 dark:text-gray-400'>Repeatable:</label>
                              <select
                                value={isOverridden ? String(customization.repeatable) : ''}
                                onChange={e => setRepeatable(section.key, itemKey, e.target.value)}
                                className='rounded border border-gray-300 bg-white px-1 py-0.5 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
                              >
                                <option value=''>default ({repeatableLabel(defaultRepeatable)})</option>
                                {REPEATABLE_OPTIONS.filter(o => o.value !== '').map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          <div className='flex gap-2'>
            <button
              onClick={() => addSection('permanent')}
              className='flex-1 rounded-lg border-2 border-dashed border-gray-300 py-2 text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-primary-500 dark:hover:text-primary-400'
            >
              + Permanent section
            </button>
            <button
              onClick={() => addSection('recurring')}
              className='flex-1 rounded-lg border-2 border-dashed border-gray-300 py-2 text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-primary-500 dark:hover:text-primary-400'
            >
              + Recurring section
            </button>
          </div>
        </div>

        {/* Preview / JSON toggle */}
        <div className='rounded-lg border border-gray-200 dark:border-gray-600'>
          <div className='flex items-center gap-1 border-b border-gray-200 bg-gray-50 px-3 py-1.5 dark:border-gray-600 dark:bg-gray-700'>
            <button
              onClick={() => setPreviewMode('preview')}
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                previewMode === 'preview'
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >Preview</button>
            <button
              onClick={() => setPreviewMode('json')}
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                previewMode === 'json'
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >JSON</button>
          </div>

          <div className='max-h-96 overflow-auto p-3'>
            {previewMode === 'json' ? (
              <pre className='text-xs text-gray-700 dark:text-gray-300'>{contentJson}</pre>
            ) : (
              sections.length === 0 ? (
                <p className='py-4 text-center text-sm text-gray-400'>Add sections to preview the form</p>
              ) : (
                <div className='space-y-6'>
                  {sections.map(section => (
                    <HDSFormSection
                      key={section.key}
                      section={{
                        type: section.type,
                        label: section.name,
                        itemKeys: [...section.itemKeys]
                      }}
                      onSubmit={() => {}}
                      disabled
                    />
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

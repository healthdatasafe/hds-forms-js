import { useState, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import { getHDSModel, l } from 'hds-lib';
import { HDSFormSection } from './HDSFormSection';
import { ReminderEditor } from './ReminderEditor';
import type { ReminderEditorConfig } from './ReminderEditor';
import { REPEATABLE_OPTIONS, repeatableLabel, getItemGroup } from '../formBuilderUtils';

export interface FormBuilderLabels {
  searchItems: string;
  selectSectionToAdd: string;
  addPermanentSection: string;
  addRecurringSection: string;
  sectionName: string;
  clickToAdd: string;
  noItems: string;
  customize: string;
  repeatable: string;
  preview: string;
  addSectionsToPreview: string;
  published: string;
}

const DEFAULT_LABELS: FormBuilderLabels = {
  searchItems: 'Search items...',
  selectSectionToAdd: 'Select a section to add items',
  addPermanentSection: 'Permanent section',
  addRecurringSection: 'Recurring section',
  sectionName: 'Section name',
  clickToAdd: 'Click items in the browser to add them',
  noItems: 'No items — click to select this section',
  customize: 'Customize',
  repeatable: 'Repeatable',
  preview: 'Preview',
  addSectionsToPreview: 'Add sections to preview the form',
  published: 'Published'
};

// -- Component props --

type PreviewMode = 'preview' | 'json';

export interface FormBuilderProps {
  /** The CollectorRequest to build upon (mutated in place) */
  request: any; // CollectorRequest from hds-lib
  /** Disable all editing (for published forms) */
  readOnly?: boolean;
  /** Called whenever the form is modified */
  onDirty?: () => void;
  /** Show ReminderEditor in item customization panel */
  showReminders?: boolean;
  /** Override default English labels (for i18n) */
  labels?: Partial<FormBuilderLabels>;
  /** Default preview mode (null = collapsed) */
  defaultPreviewMode?: PreviewMode | null;
  /** Rendered before the item browser (e.g. "Published" badge) */
  headerSlot?: ReactNode;
  /** Rendered above sections (e.g. title, description, consent inputs) */
  metadataSlot?: ReactNode;
  /** Rendered between sections and preview (e.g. save/publish buttons) */
  actionSlot?: ReactNode;
}

export default function FormBuilder ({
  request,
  readOnly = false,
  onDirty,
  showReminders = false,
  labels: labelOverrides,
  defaultPreviewMode = null,
  headerSlot,
  metadataSlot,
  actionSlot
}: FormBuilderProps) {
  const lb = { ...DEFAULT_LABELS, ...labelOverrides };

  const model = getHDSModel();
  const allItemDefs = useMemo(() => model.itemsDefs.getAll(), [model]);

  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => {
    setVersion(v => v + 1);
    onDirty?.();
  }, [onDirty]);

  // UI state
  const [selectedSectionKey, setSelectedSectionKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewMode, setPreviewMode] = useState<PreviewMode | null>(defaultPreviewMode);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editingItemKey, setEditingItemKey] = useState<string | null>(null);

  const sections = request.sections;
  const _version = version; // trigger re-render

  // Group and filter items for the browser
  // When a section is selected, filter items by section type:
  //   permanent → only repeatable:'once' items
  //   recurring → only repeatable!='once' items
  const selectedSection = selectedSectionKey ? request.getSectionByKey(selectedSectionKey) : null;
  const selectedSectionType = selectedSection?.type as string | undefined;

  const groupedItems = useMemo(() => {
    const groups: Record<string, Array<{ key: string; label: string; description: string; streamId: string }>> = {};
    for (const itemDef of allItemDefs) {
      // Filter by section type when a section is selected
      if (selectedSectionType === 'permanent' && itemDef.repeatable !== 'once') continue;
      if (selectedSectionType === 'recurring' && itemDef.repeatable === 'once') continue;

      const label = itemDef.label;
      if (searchQuery && !label.toLowerCase().includes(searchQuery.toLowerCase()) && !itemDef.key.toLowerCase().includes(searchQuery.toLowerCase())) {
        continue;
      }
      const group = getItemGroup(itemDef.key);
      if (!groups[group]) groups[group] = [];
      groups[group].push({ key: itemDef.key, label, description: itemDef.description, streamId: itemDef.data.streamId });
    }
    return groups;
  }, [allItemDefs, searchQuery, selectedSectionType]);

  const usedItemKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const section of sections) {
      for (const key of section.itemKeys) keys.add(key);
    }
    return keys;
  }, [sections, version]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const idx = sections.findIndex((s: any) => s.key === key);
    if (idx > 0) { request.moveSection(key, idx - 1); refresh(); }
  }

  function moveSectionDown (key: string) {
    const idx = sections.findIndex((s: any) => s.key === key);
    if (idx < sections.length - 1) { request.moveSection(key, idx + 1); refresh(); }
  }

  function updateSectionName (key: string, name: string) {
    const section = request.getSectionByKey(key);
    if (section) { section.setName({ en: name }); refresh(); }
  }

  function toggleSectionType (key: string) {
    const section = request.getSectionByKey(key);
    if (!section) return;
    const idx = sections.findIndex((s: any) => s.key === key);
    const data = section.getData();
    const newType = data.type === 'permanent' ? 'recurring' : 'permanent';
    request.removeSection(key);
    const newSection = request.createSection(key, newType as 'permanent' | 'recurring');
    newSection.setName(data.name);
    newSection.addItemKeys(data.itemKeys);
    if (data.itemCustomizations) {
      for (const [itemKey, cust] of Object.entries(data.itemCustomizations)) {
        newSection.setItemCustomization(itemKey, cust as Record<string, unknown>);
      }
    }
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

  function setRepeatableValue (sectionKey: string, itemKey: string, value: string) {
    const section = request.getSectionByKey(sectionKey);
    if (!section) return;
    const existing = section.getItemCustomization(itemKey) || {};
    if (value === '') {
      const { repeatable: _removed, ...rest } = existing as any;
      section.setItemCustomization(itemKey, rest);
    } else {
      section.setItemCustomization(itemKey, { ...existing, repeatable: value });
    }
    refresh();
  }

  function setReminder (sectionKey: string, itemKey: string, reminder: Partial<ReminderEditorConfig> | undefined) {
    const section = request.getSectionByKey(sectionKey);
    if (!section) return;
    const existing = section.getItemCustomization(itemKey) || {};
    if (reminder === undefined) {
      const { reminder: _removed, ...rest } = existing as any;
      section.setItemCustomization(itemKey, rest);
    } else {
      section.setItemCustomization(itemKey, { ...existing, reminder });
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

  function itemLabel (key: string): string {
    try {
      return model.itemsDefs.forKey(key)?.label ?? key;
    } catch { return key; }
  }

  function itemDescription (key: string): string {
    try {
      return model.itemsDefs.forKey(key)?.description || key;
    } catch { return key; }
  }

  const contentJson = useMemo(() => JSON.stringify(request.content, null, 2), [version]); // eslint-disable-line react-hooks/exhaustive-deps
  const sortedGroups = useMemo(() => Object.keys(groupedItems).sort(), [groupedItems]);

  return (
    <div className='flex gap-4' style={{ minHeight: '600px' }}>
      {/* Left: Item Browser (hidden for read-only forms) */}
      {!readOnly && (
        <div className='w-64 shrink-0 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700'>
          <div className='sticky top-0 border-b border-gray-200 bg-gray-50 p-2 dark:border-gray-600 dark:bg-gray-700'>
            <input
              type='text'
              placeholder={lb.searchItems}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className='w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white'
            />
            {!selectedSectionKey && sections.length > 0 && (
              <p className='mt-1 text-xs text-amber-600 dark:text-amber-400'>{lb.selectSectionToAdd}</p>
            )}
          </div>
          <div className='p-1'>
            {sortedGroups.map(group => (
              <div key={group} className='mb-1'>
                <button
                  onClick={() => toggleGroup(group)}
                  className='flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm font-semibold text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-600'
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
                          className={`block w-full rounded px-2 py-1 text-left text-sm ${
                            used
                              ? 'text-gray-400 dark:text-gray-500'
                              : selectedSectionKey
                                ? 'text-gray-700 hover:bg-blue-50 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-blue-900 dark:hover:text-blue-300'
                                : 'text-gray-500 dark:text-gray-400'
                          }`}
                          title={item.description || item.key}
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
      )}

      {/* Right: Builder Canvas + Preview */}
      <div className='flex min-w-0 flex-1 flex-col gap-4'>
        {headerSlot}

        {metadataSlot}

        {/* Sections */}
        <div className='space-y-3'>
          {sections.map((section: any, sIdx: number) => {
            const isSelected = selectedSectionKey === section.key;
            return (
              <div
                key={section.key}
                className={`rounded-lg border p-3 ${
                  isSelected
                    ? 'border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20'
                    : 'border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800'
                }`}
                onClick={() => !readOnly && setSelectedSectionKey(section.key)}
              >
                {/* Section header */}
                <div className='mb-2 flex items-center gap-2'>
                  <input
                    type='text'
                    value={section.name?.en || ''}
                    onChange={e => updateSectionName(section.key, e.target.value)}
                    className='flex-1 rounded border border-gray-300 bg-white px-2 py-0.5 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
                    placeholder={lb.sectionName}
                    disabled={readOnly}
                    onClick={e => e.stopPropagation()}
                  />
                  <button
                    onClick={e => { e.stopPropagation(); toggleSectionType(section.key); }}
                    className='rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-200 disabled:opacity-60 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                    title='Click to toggle type'
                    disabled={readOnly}
                  >
                    {section.type}
                  </button>
                  {!readOnly && (
                    <>
                      <button
                        onClick={e => { e.stopPropagation(); moveSectionUp(section.key); }}
                        disabled={sIdx === 0}
                        className='text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30 dark:hover:text-gray-300'
                        title='Move section up'
                      >↑
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); moveSectionDown(section.key); }}
                        disabled={sIdx === sections.length - 1}
                        className='text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30 dark:hover:text-gray-300'
                        title='Move section down'
                      >↓
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); removeSection(section.key); }}
                        className='text-xs text-red-400 hover:text-red-600 dark:hover:text-red-300'
                        title='Remove section'
                      >×
                      </button>
                    </>
                  )}
                </div>

                {/* Items in section */}
                {section.itemKeys.length === 0
                  ? (
                    <p className='py-2 text-center text-xs text-gray-400 dark:text-gray-500'>
                      {readOnly ? '' : isSelected ? lb.clickToAdd : lb.noItems}
                    </p>
                    )
                  : (
                    <div className='space-y-1'>
                      {section.itemKeys.map((itemKey: string, iIdx: number) => {
                        const customization = section.getItemCustomization(itemKey);
                        const isEditing = editingItemKey === `${section.key}:${itemKey}`;
                        const itemDef = model.itemsDefs.forKey(itemKey);
                        const defaultRepeatable = itemDef?.repeatable || 'unlimited';
                        const effectiveRepeatable = customization?.repeatable ? String(customization.repeatable) : defaultRepeatable;
                        const isOverridden = customization?.repeatable != null;
                        return (
                          <div key={itemKey}>
                            <div className='flex items-center gap-1.5 rounded px-2 py-1 text-sm hover:bg-gray-50 dark:hover:bg-gray-700'>
                              <span className='flex-1 text-gray-700 dark:text-gray-300' title={itemDescription(itemKey)}>
                                {itemLabel(itemKey)}
                                <span className='ml-1 text-xs text-gray-400'>({itemKey})</span>
                                <span className={`ml-1 rounded px-1 ${
                                  isOverridden
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                    : 'bg-gray-100 text-gray-500 dark:bg-gray-600 dark:text-gray-400'
                                }`}
                                >
                                  {repeatableLabel(effectiveRepeatable)}
                                </span>
                              </span>
                              {!readOnly && (
                                <>
                                  <button
                                    onClick={e => { e.stopPropagation(); setEditingItemKey(isEditing ? null : `${section.key}:${itemKey}`); }}
                                    className='px-0.5 text-base text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400'
                                    title={lb.customize}
                                  >⚙
                                  </button>
                                  <button
                                    onClick={e => { e.stopPropagation(); moveItemUp(section.key, itemKey); }}
                                    disabled={iIdx === 0}
                                    className='px-0.5 text-base text-gray-500 hover:text-gray-800 disabled:opacity-30 dark:text-gray-400 dark:hover:text-gray-200'
                                  >↑
                                  </button>
                                  <button
                                    onClick={e => { e.stopPropagation(); moveItemDown(section.key, itemKey); }}
                                    disabled={iIdx === section.itemKeys.length - 1}
                                    className='px-0.5 text-base text-gray-500 hover:text-gray-800 disabled:opacity-30 dark:text-gray-400 dark:hover:text-gray-200'
                                  >↓
                                  </button>
                                  <button
                                    onClick={e => { e.stopPropagation(); removeItemFromSection(section.key, itemKey); }}
                                    className='px-0.5 text-base text-red-400 hover:text-red-600 dark:hover:text-red-300'
                                  >×
                                  </button>
                                </>
                              )}
                            </div>
                            {/* Inline customization panel */}
                            {isEditing && !readOnly && (
                              <div className='ml-4 mt-1 space-y-1 rounded bg-gray-100 p-2 text-xs dark:bg-gray-700'>
                                <div className='flex items-center gap-2'>
                                  <label className='text-gray-600 dark:text-gray-400'>{lb.repeatable}:</label>
                                  <select
                                    value={isOverridden ? String(customization.repeatable) : ''}
                                    onChange={e => setRepeatableValue(section.key, itemKey, e.target.value)}
                                    className='rounded border border-gray-300 bg-white px-1 py-0.5 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
                                  >
                                    <option value=''>default ({repeatableLabel(defaultRepeatable)})</option>
                                    {REPEATABLE_OPTIONS.map(opt => (
                                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                  </select>
                                </div>
                                {showReminders && (
                                  <ReminderEditor
                                    defaultReminder={itemDef?.reminder || null}
                                    override={customization?.reminder as Partial<ReminderEditorConfig> | undefined}
                                    onChange={r => setReminder(section.key, itemKey, r)}
                                    availableItemKeys={section.itemKeys.filter((k: string) => k !== itemKey).map((k: string) => ({ key: k, label: itemLabel(k) }))}
                                  />
                                )}
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

          {!readOnly && (
            <div className='flex gap-2'>
              <button
                onClick={() => addSection('permanent')}
                className='flex-1 rounded-lg border-2 border-dashed border-gray-300 py-2 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-blue-500 dark:hover:text-blue-400'
              >
                + {lb.addPermanentSection}
              </button>
              <button
                onClick={() => addSection('recurring')}
                className='flex-1 rounded-lg border-2 border-dashed border-gray-300 py-2 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-blue-500 dark:hover:text-blue-400'
              >
                + {lb.addRecurringSection}
              </button>
            </div>
          )}
        </div>

        {actionSlot}

        {/* Preview / JSON toggle */}
        <div className='rounded-lg border border-gray-200 dark:border-gray-600'>
          <div className='flex items-center gap-1 bg-gray-50 px-3 py-1.5 dark:bg-gray-700'>
            <button
              onClick={() => setPreviewMode(previewMode === 'json' ? null : 'json')}
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                previewMode === 'json'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >JSON
            </button>
            <button
              onClick={() => setPreviewMode(previewMode === 'preview' ? null : 'preview')}
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                previewMode === 'preview'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >{lb.preview}
            </button>
          </div>

          {previewMode != null && (
            <div className='max-h-96 overflow-auto border-t border-gray-200 p-3 dark:border-gray-600'>
              {previewMode === 'json'
                ? (
                  <pre className='text-xs text-gray-700 dark:text-gray-300'>{contentJson}</pre>
                  )
                : (
                    sections.length === 0
                      ? (
                        <p className='py-4 text-center text-sm text-gray-400'>{lb.addSectionsToPreview}</p>
                        )
                      : (
                        <div className='space-y-6'>
                          {sections.map((section: any) => (
                            <div key={section.key} className='rounded border border-gray-200 p-3 dark:border-gray-600'>
                              <h4 className='mb-2 text-sm font-medium text-gray-700 dark:text-gray-300'>
                                {l(section.name)} ({section.type})
                              </h4>
                              <HDSFormSection
                                section={{
                                  type: section.type,
                                  label: section.name,
                                  itemKeys: [...section.itemKeys],
                                  itemCustomizations: section.getData?.().itemCustomizations
                                }}
                                onSubmit={() => {}}
                                disabled
                              />
                            </div>
                          ))}
                        </div>
                        )
                  )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

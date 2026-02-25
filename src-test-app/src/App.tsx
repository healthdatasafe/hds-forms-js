import { useEffect, useState, useMemo } from 'react';
import { getItems, getModel } from './hdsLibService';
import { HDSFormField } from 'hds-forms/components/HDSFormField';
import { HDSFormSection } from 'hds-forms/components/HDSFormSection';
import { schemaFor } from 'hds-forms/schema/schemas';
import { jsonFormForItemDef } from 'hds-forms/schema/itemDefToSchema';
import type { SectionEntry } from 'hds-forms/types';

type Tab = 'fields' | 'section' | 'recurring';

export default function App () {
  const [tab, setTab] = useState<Tab>('fields');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Array<{ key: string; label: string }>>([]);
  const [selectedKey, setSelectedKey] = useState('');

  // Field tab state
  const [fieldValue, setFieldValue] = useState<any>(undefined);
  const [fieldSchema, setFieldSchema] = useState<any>(null);
  const [eventData, setEventData] = useState<any>(null);

  // Section tab state
  const [sectionData, setSectionData] = useState<Record<string, any> | null>(null);

  // Recurring tab state
  const [recurringEntries, setRecurringEntries] = useState<SectionEntry[]>([]);
  const [recurringData, setRecurringData] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    getItems().then((list) => {
      setItems(list);
      setLoading(false);
    });
  }, []);

  // When item selection changes, compute schema and reset
  useEffect(() => {
    if (!selectedKey) {
      setFieldSchema(null);
      setEventData(null);
      setFieldValue(undefined);
      return;
    }
    try {
      const model = getModel();
      const itemDef = model.itemsDefs.forKey(selectedKey);
      if (!itemDef) return;
      const schema = schemaFor(itemDef.data);
      setFieldSchema(schema);
      setFieldValue(undefined);
      setEventData(null);

      // Also compute event data conversion info
      const jsonForm = jsonFormForItemDef(itemDef);
      setEventData({ converter: jsonForm.eventDataForFormData, schema: jsonForm.schema });
    } catch (e) {
      console.error('Schema error:', e);
    }
  }, [selectedKey]);

  const fieldValueJson = useMemo(() => JSON.stringify(fieldValue, null, 2), [fieldValue]);
  const fieldSchemaJson = useMemo(() => JSON.stringify(fieldSchema, null, 2), [fieldSchema]);
  const eventDataJson = useMemo(() => {
    if (!eventData?.converter || fieldValue === undefined) return 'null';
    try {
      return JSON.stringify(eventData.converter({ content: fieldValue }), null, 2);
    } catch { return 'null'; }
  }, [eventData, fieldValue]);
  const sectionDataJson = useMemo(() => JSON.stringify(sectionData, null, 2), [sectionData]);
  const recurringDataJson = useMemo(() => JSON.stringify(recurringData, null, 2), [recurringData]);

  function handleSectionSubmit (data: Record<string, any>) {
    setSectionData(data);
  }

  function handleRecurringSubmit (data: Record<string, any>) {
    setRecurringData(data);
    const { __time, ...values } = data;
    setRecurringEntries(prev => [...prev, { time: __time || Math.floor(Date.now() / 1000), values }]);
  }

  function handleEditEntry (index: number) {
    // Load entry values back (simplified — just log for now)
    console.log('Edit entry', index, recurringEntries[index]);
  }

  function handleDeleteEntry (index: number) {
    setRecurringEntries(prev => prev.filter((_, i) => i !== index));
  }

  // Pick first 5 items for section demo
  const sectionKeys = useMemo(() => items.slice(0, 5).map(i => i.key), [items]);
  // Pick next 3 items for recurring demo
  const recurringKeys = useMemo(() => items.slice(5, 8).map(i => i.key), [items]);

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg ${tab === t
      ? 'bg-white text-primary-700 border border-b-white border-gray-200 dark:bg-gray-800 dark:text-primary-400 dark:border-gray-600'
      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`;

  if (loading) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <p className='text-lg text-gray-500'>Loading HDS model...</p>
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-3xl px-4 py-8'>
      <h1 className='mb-6 text-2xl font-bold text-gray-900 dark:text-white'>
        HDS Forms — Test App
      </h1>

      {/* Tab bar */}
      <div className='mb-0 flex gap-1 border-b border-gray-200 dark:border-gray-600'>
        <button className={tabClass('fields')} onClick={() => setTab('fields')}>
          Single Field
        </button>
        <button className={tabClass('section')} onClick={() => setTab('section')}>
          Section (permanent)
        </button>
        <button className={tabClass('recurring')} onClick={() => setTab('recurring')}>
          Section (recurring)
        </button>
      </div>

      <div className='rounded-b-lg border border-t-0 border-gray-200 bg-white p-6 dark:border-gray-600 dark:bg-gray-800'>

        {/* ── Single Field Tab ── */}
        {tab === 'fields' && (
          <div className='space-y-6'>
            <div>
              <label className='mb-1 block text-sm font-medium text-gray-900 dark:text-white'>
                Select an HDS item
              </label>
              <select
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                className='block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
              >
                <option value=''>-- Pick an item --</option>
                {items.map((item) => (
                  <option key={item.key} value={item.key}>{item.label} ({item.key})</option>
                ))}
              </select>
            </div>

            {selectedKey && (() => {
              const model = getModel();
              const itemDef = model.itemsDefs.forKey(selectedKey);
              if (!itemDef) return <p className='text-red-500'>Item not found</p>;
              return (
                <div className='rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700'>
                  <HDSFormField
                    itemData={itemDef.data}
                    value={fieldValue}
                    onChange={setFieldValue}
                  />
                </div>
              );
            })()}

            {/* Debug panels */}
            <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
              <DebugPanel title='Field value' json={fieldValueJson} />
              <DebugPanel title='JSON Schema' json={fieldSchemaJson} />
              <DebugPanel title='Event data' json={eventDataJson} />
            </div>
          </div>
        )}

        {/* ── Section (permanent) Tab ── */}
        {tab === 'section' && (
          <div className='space-y-6'>
            <p className='text-sm text-gray-500 dark:text-gray-400'>
              Renders a <code>HDSFormSection</code> with the first 5 HDS items as a permanent (default) section.
            </p>
            {sectionKeys.length > 0 && (
              <HDSFormSection
                section={{
                  type: 'permanent',
                  label: { en: 'Profile data' },
                  itemKeys: sectionKeys
                }}
                onSubmit={handleSectionSubmit}
              />
            )}
            {sectionData && <DebugPanel title='Submitted data' json={sectionDataJson} />}
          </div>
        )}

        {/* ── Section (recurring) Tab ── */}
        {tab === 'recurring' && (
          <div className='space-y-6'>
            <p className='text-sm text-gray-500 dark:text-gray-400'>
              Renders a <code>HDSFormSection</code> with <code>type: 'recurring'</code>.
              Shows date picker, "Add entry" button, and entry list below.
            </p>
            {recurringKeys.length > 0 && (
              <HDSFormSection
                section={{
                  type: 'recurring',
                  label: { en: 'Daily tracking' },
                  itemKeys: recurringKeys
                }}
                onSubmit={handleRecurringSubmit}
                entries={recurringEntries}
                onEditEntry={handleEditEntry}
                onDeleteEntry={handleDeleteEntry}
              />
            )}
            {recurringData && <DebugPanel title='Last submitted' json={recurringDataJson} />}
          </div>
        )}
      </div>
    </div>
  );
}

function DebugPanel ({ title, json }: { title: string; json: string | null }) {
  return (
    <div className='rounded-lg border border-gray-200 dark:border-gray-600'>
      <div className='border-b border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold uppercase text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400'>
        {title}
      </div>
      <pre className='max-h-60 overflow-auto p-3 text-xs text-gray-700 dark:text-gray-300'>
        {json || 'null'}
      </pre>
    </div>
  );
}

import { useEffect, useState, useMemo, useCallback } from 'react';
import { getItems, getModel } from './hdsLibService';
import { HDSSettings, localizeText, eventToShortText, durationToLabel } from 'hds-lib';
import { HDSFormField } from 'hds-forms/components/HDSFormField';
import { HDSFormSection } from 'hds-forms/components/HDSFormSection';
import { ItemSearchPicker } from 'hds-forms/components/ItemSearchPicker';
import type { ItemSearchPickerItem } from 'hds-forms/components/ItemSearchPicker';
import { EventTimeInput } from 'hds-forms/components/EventTimeInput';
import { EventDurationInput } from 'hds-forms/components/EventDurationInput';
import type { EventDuration } from 'hds-forms/components/EventDurationInput';
import { schemaFor } from 'hds-forms/schema/schemas';
import { jsonFormForItemDef } from 'hds-forms/schema/itemDefToSchema';
import type { SectionEntry } from 'hds-forms/types';
import FormBuilder from './FormBuilder';
import { Timeline } from 'hds-react-timeline';

type Tab = 'fields' | 'section' | 'recurring' | 'datasets' | 'builder' | 'timeline' | 'settings';

const SAMPLE_MIRA_ENDPOINT = 'https://cmn4ajjwg44xzdjpfcdnqgouv@demo.datasafe.dev/sample-mira/';

interface SingleFieldPanelProps {
  items: ItemSearchPickerItem[];
  emptyMessage?: string;
}

function safeLabel (sec: number): string {
  try { return durationToLabel(sec); } catch { return `${sec}s`; }
}

/** Picker + form + envelope toggles (time/duration) + Short text + 3 debug panels. Owns its own state. */
function SingleFieldPanel ({ items, emptyMessage = 'Select an item from the list' }: SingleFieldPanelProps) {
  // Selection + value share one state so changing the selected item atomically clears the value.
  // (Using two states with a useEffect-reset would race against the first render of HDSFormField
  // — the new DatasetSearch instance would capture the prior value into its initialDrugRef and
  // get stuck in edit-mode showing an empty static-text view.)
  const [selection, setSelection] = useState<{ key: string; value: any }>({ key: '', value: undefined });
  const selectedKey = selection.key;
  const fieldValue = selection.value;
  const setSelectedKey = useCallback((key: string) => setSelection({ key, value: undefined }), []);
  const setFieldValue = useCallback((value: any) => setSelection(prev => ({ ...prev, value })), []);

  const [fieldSchema, setFieldSchema] = useState<any>(null);
  const [eventData, setEventData] = useState<any>(null);
  // Item-declared duration metadata (mandatory / canBeNull / maxSeconds), null when the item declares no duration.
  const [durationMeta, setDurationMeta] = useState<{ mandatory: boolean; canBeNull: boolean; maxSeconds?: number } | null>(null);

  // Event-envelope toggles
  const [showTime, setShowTime] = useState(false);
  const [showDuration, setShowDuration] = useState(false);
  const [eventTime, setEventTime] = useState<number | undefined>(undefined);
  const [eventDuration, setEventDuration] = useState<EventDuration | undefined>(undefined);

  useEffect(() => {
    if (!selectedKey) {
      setFieldSchema(null);
      setEventData(null);
      setDurationMeta(null);
      return;
    }
    try {
      const model = getModel();
      const itemDef = model.itemsDefs.forKey(selectedKey);
      if (!itemDef) return;
      const schema = schemaFor(itemDef.data);
      setFieldSchema(schema);
      setEventData(null);
      const jsonForm = jsonFormForItemDef(itemDef);
      setEventData({ converter: jsonForm.eventDataForFormData, schema: jsonForm.schema });
      const dur = (itemDef.data as any)?.duration;
      setDurationMeta(dur
        ? { mandatory: !!dur.mandatory, canBeNull: dur.canBeNull !== false, maxSeconds: dur.maxSeconds }
        : null);
    } catch (e) {
      console.error('Schema error:', e);
    }
  }, [selectedKey]);

  // Synthesize a full event { time, duration?, type, streamIds, content } from current inputs.
  const synthesizedEvent = useMemo<any>(() => {
    if (!eventData?.converter || fieldValue === undefined) return null;
    // The form-engine's converter expects the same shape it would receive from a
    // bound form. For standard items that's `{ content: <value> }`; for special
    // cases like activity/plain checkboxes it's a bare value (the schema is the
    // field's content schema, not an object wrapping it).
    const wrapsContent = eventData.schema?.type === 'object'
      && (eventData.schema as any)?.properties?.content !== undefined;
    const formData = wrapsContent ? { content: fieldValue } : fieldValue;
    let raw: any;
    try { raw = eventData.converter(formData); } catch { return null; }
    if (raw == null) return null;
    const event: any = { ...raw };
    event.time = (showTime && eventTime != null)
      ? eventTime
      : Math.floor(Date.now() / 1000);
    if (showDuration && eventDuration !== undefined) {
      // Only emit duration when the picker has a resolved value (number or null = ongoing).
      // Skip 0 since point-in-time is the Pryv default (no key).
      if (eventDuration === null || eventDuration > 0) event.duration = eventDuration;
    }
    return event;
  }, [eventData, fieldValue, showTime, eventTime, showDuration, eventDuration]);

  // Short text (only when the event is well-formed enough for the lib to summarize it)
  const shortText = useMemo<string | null>(() => {
    if (!synthesizedEvent) return null;
    try { return eventToShortText(synthesizedEvent); } catch { return null; }
  }, [synthesizedEvent]);

  const fieldValueJson = useMemo(() => JSON.stringify(fieldValue, null, 2), [fieldValue]);
  const fieldSchemaJson = useMemo(() => JSON.stringify(fieldSchema, null, 2), [fieldSchema]);
  const eventDataJson = useMemo(
    () => (synthesizedEvent ? JSON.stringify(synthesizedEvent, null, 2) : 'null'),
    [synthesizedEvent]
  );

  return (
    <div className='flex gap-4' style={{ minHeight: '400px' }}>
      <div className='w-64 shrink-0'>
        <ItemSearchPicker items={items} selectedKey={selectedKey} onSelect={setSelectedKey} />
      </div>
      <div className='min-w-0 flex-1 space-y-4'>
        {/* Event envelope toggles — let the user complete a full event sample */}
        <div className='rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-600 dark:bg-gray-700'>
          <div className='flex flex-wrap items-center gap-x-6 gap-y-2'>
            <label className='flex cursor-pointer items-center gap-2 select-none'>
              <input
                type='checkbox'
                checked={showTime}
                onChange={e => setShowTime(e.target.checked)}
                className='h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-500 dark:bg-gray-700'
              />
              <span className='text-gray-700 dark:text-gray-300'>Show date/time selector</span>
            </label>
            {durationMeta != null && (
              <label className='flex cursor-pointer items-center gap-2 select-none'>
                <input
                  type='checkbox'
                  checked={showDuration}
                  onChange={e => setShowDuration(e.target.checked)}
                  className='h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-500 dark:bg-gray-700'
                />
                <span className='text-gray-700 dark:text-gray-300'>Show duration selector</span>
                <span className='text-xs text-gray-500 dark:text-gray-400'>
                  ({durationMeta.mandatory ? 'required' : 'optional'}
                  {durationMeta.canBeNull ? ', allows ongoing' : ''}
                  {durationMeta.maxSeconds != null ? `, max ${safeLabel(durationMeta.maxSeconds)}` : ''})
                </span>
              </label>
            )}
            {selectedKey && durationMeta == null && (
              <span className='text-xs text-gray-400 italic dark:text-gray-500'>(item is point-in-time — no duration)</span>
            )}
          </div>
          {(showTime || (showDuration && durationMeta != null)) && (
            <div className='mt-3 space-y-3'>
              {showTime && <EventTimeInput value={eventTime} onChange={setEventTime} />}
              {showDuration && durationMeta != null && (
                <EventDurationInput
                  key={selectedKey}
                  value={eventDuration}
                  onChange={setEventDuration}
                  eventTime={eventTime}
                  mandatory={durationMeta.mandatory}
                  allowNull={durationMeta.canBeNull}
                  maxSeconds={durationMeta.maxSeconds}
                />
              )}
            </div>
          )}
        </div>

        {selectedKey && (() => {
          const model = getModel();
          const itemDef = model.itemsDefs.forKey(selectedKey);
          if (!itemDef) return <p className='text-red-500'>Item not found</p>;
          return (
            <div className='rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700'>
              <HDSFormField
                key={selectedKey}
                itemData={itemDef.data}
                itemKey={selectedKey}
                value={fieldValue}
                onChange={setFieldValue}
              />
            </div>
          );
        })()}
        {!selectedKey && (
          <p className='py-8 text-center text-sm text-gray-400'>{emptyMessage}</p>
        )}

        {/* Short text — appears when the lib can summarize the event (i.e. mandatory fields are filled) */}
        {shortText !== null && (
          <div className='rounded-lg border border-green-300 bg-green-50 p-3 dark:border-green-700 dark:bg-green-900/30'>
            <div className='text-xs font-semibold tracking-wide text-green-700 uppercase dark:text-green-400'>Short text (eventToShortText)</div>
            <div className='mt-1 text-sm text-gray-900 dark:text-gray-100'>{shortText}</div>
          </div>
        )}

        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          <DebugPanel title='Field value' json={fieldValueJson} />
          <DebugPanel title='JSON Schema' json={fieldSchemaJson} />
          <DebugPanel title='Event data' json={eventDataJson} />
        </div>
      </div>
    </div>
  );
}

export default function App () {
  const [tab, setTab] = useState<Tab>('fields');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ItemSearchPickerItem[]>([]);

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

  // Datasets tab: filter to items rendered as datasource-search (those that hit datasets-service)
  const datasetItems = useMemo<ItemSearchPickerItem[]>(() => {
    if (items.length === 0) return [];
    const model = getModel();
    return items
      .filter(i => {
        try { return model.itemsDefs.forKey(i.key)?.data?.type === 'datasource-search'; } catch { return false; }
      })
      .map(i => ({ key: i.key, label: i.label }));
  }, [items]);

  // Pick first 5 non-recurring items (repeatable:'once') for permanent section demo
  const sectionKeys = useMemo(() => {
    if (items.length === 0) return [];
    const model = getModel();
    return items.filter(i => {
      try { return model.itemsDefs.forKey(i.key)?.repeatable === 'once'; } catch { return false; }
    }).slice(0, 5).map(i => i.key);
  }, [items]);
  // Pick first 3 recurring items (repeatable!='once') for recurring section demo
  const recurringKeys = useMemo(() => {
    if (items.length === 0) return [];
    const model = getModel();
    return items.filter(i => {
      try { return model.itemsDefs.forKey(i.key)?.repeatable !== 'once'; } catch { return false; }
    }).slice(0, 3).map(i => i.key);
  }, [items]);

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
    <div className='mx-auto max-w-6xl px-4 py-8'>
      <div className='mb-6 flex items-center gap-3'>
        <a href='https://docs.datasafe.dev' target='_blank' rel='noopener noreferrer'>
          <img src='https://style.datasafe.dev/images/logos/horizontal/hds-logo-hz-color.svg' alt='HDS' className='h-10' />
        </a>
        <div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>HDS Forms — Test App</h1>
          <a href='https://docs.datasafe.dev' target='_blank' rel='noopener noreferrer' className='text-xs text-primary-600 hover:underline dark:text-primary-400'>docs.datasafe.dev</a>
        </div>
      </div>

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
        <button className={tabClass('datasets')} onClick={() => setTab('datasets')}>
          Datasets
        </button>
        <button className={tabClass('builder')} onClick={() => setTab('builder')}>
          Builder
        </button>
        <button className={tabClass('timeline')} onClick={() => setTab('timeline')}>
          Timeline
        </button>
        <button className={tabClass('settings')} onClick={() => setTab('settings')}>
          Settings
        </button>
      </div>

      <div className='rounded-b-lg border border-t-0 border-gray-200 bg-white p-6 dark:border-gray-600 dark:bg-gray-800'>

        {/* ── Single Field Tab ── */}
        {tab === 'fields' && <SingleFieldPanel items={items} />}

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

        {/* ── Timeline Tab ── */}
        {tab === 'timeline' && (
          <div style={{ height: '600px' }}>
            <p className='mb-4 text-sm text-gray-500 dark:text-gray-400'>
              Timeline connected to <code>sample-mira</code> account (read-only).
            </p>
            <Timeline apiEndpoint={SAMPLE_MIRA_ENDPOINT} initialScale='month' />
          </div>
        )}

        {/* ── Builder Tab ── */}
        {tab === 'builder' && <FormBuilder />}

        {/* ── Datasets Tab ── Same UI as Single Field, filtered to dataset-backed items */}
        {tab === 'datasets' && <SingleFieldPanel items={datasetItems} emptyMessage='Select a dataset-backed item from the list' />}

        {/* ── Settings Tab ── */}
        {tab === 'settings' && <SettingsPanel />}
      </div>
    </div>
  );
}

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
];

const DATE_FORMATS = [
  { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY (31.12.2026)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2026)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2026)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2026-12-31)' },
];

const TIMEZONES = [
  'Europe/Zurich', 'Europe/Paris', 'Europe/London',
  'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo',
];

const UNIT_SYSTEMS = [
  { value: 'metric', label: 'Metric (kg, cm, °C)' },
  { value: 'imperial', label: 'Imperial (lbs, ft/in, °F)' },
];

const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function SettingsPanel () {
  const [settings, setSettings] = useState({
    preferredLocales: ['en'],
    theme: 'light',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Zurich',
    dateFormat: 'DD.MM.YYYY',
    unitSystem: 'metric',
    displayName: '',
  });

  // Converter settings: { itemKey → methodId } for auto and default
  const [converterAuto, setConverterAuto] = useState<Record<string, string>>({});
  const [converterDefault, setConverterDefault] = useState<Record<string, string>>({});
  const [converterItems, setConverterItems] = useState<Array<{ itemKey: string; label: string; methods: Array<{ id: string; name: string }> }>>([]);

  // Load available converters from model
  useEffect(() => {
    (async () => {
      try {
        const model = getModel();
        const items: typeof converterItems = [];
        for (const ik of model.converters.availableItemKeys) {
          const engine = await model.converters.ensureEngine(ik);
          const itemDef = model.itemsDefs.getAll().find((d: any) => d.data['converter-engine']?.models === ik);
          const methods = engine.methodIds
            .filter((m: string) => m !== '_raw')
            .map((m: string) => {
              const def = engine.getMethodDef(m);
              return { id: m, name: def?.name ? (localizeText(def.name) || m) : m };
            });
          items.push({
            itemKey: ik,
            label: itemDef?.label || ik,
            methods,
          });
        }
        setConverterItems(items);
      } catch { /* model may not be loaded yet */ }
    })();
  }, []);

  const update = useCallback((key: string, value: any) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      // Wire to HDSSettings._testInject
      HDSSettings._testInject(key, value);
      return next;
    });
  }, []);

  // Wire initial settings on mount
  useEffect(() => {
    for (const [key, value] of Object.entries(settings)) {
      HDSSettings._testInject(key, value);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateConverterAuto = useCallback((itemKey: string, method: string) => {
    setConverterAuto(prev => {
      const next = { ...prev };
      const settingKey = `preferred-display-${itemKey}`;
      if (method === '') {
        delete next[itemKey];
        HDSSettings._testClear(settingKey);
      } else {
        next[itemKey] = method;
        HDSSettings._testInject(settingKey, method);
      }
      return next;
    });
  }, []);

  const updateConverterDefault = useCallback((itemKey: string, method: string) => {
    setConverterDefault(prev => {
      const next = { ...prev };
      const settingKey = `preferred-input-${itemKey}`;
      if (method === '') {
        delete next[itemKey];
        HDSSettings._testClear(settingKey);
      } else {
        next[itemKey] = method;
        HDSSettings._testInject(settingKey, method);
      }
      return next;
    });
  }, []);

  const settingsEvents = useMemo(() => {
    const events = [
      { type: 'settings/preferred-locales', streamIds: ['app-baseStream'], content: settings.preferredLocales },
      { type: 'settings/theme', streamIds: ['app-baseStream'], content: settings.theme },
      { type: 'settings/timezone', streamIds: ['app-baseStream'], content: settings.timezone },
      { type: 'settings/date-format', streamIds: ['app-baseStream'], content: settings.dateFormat },
      { type: 'settings/unit-system', streamIds: ['app-baseStream'], content: settings.unitSystem },
      ...(settings.displayName
        ? [{ type: 'contact/display-name', streamIds: ['app-baseStream'], content: settings.displayName }]
        : []),
    ];
    for (const [itemKey, method] of Object.entries(converterAuto)) {
      events.push({ type: 'settings/preferred-display', streamIds: ['app-baseStream'], content: { itemKey, method } as any });
    }
    for (const [itemKey, method] of Object.entries(converterDefault)) {
      events.push({ type: 'settings/preferred-input', streamIds: ['app-baseStream'], content: { itemKey, method } as any });
    }
    return events;
  }, [settings, converterAuto, converterDefault]);

  const selectClass = 'block w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white';
  const inputClass = 'block w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white';
  const labelClass = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300';
  const sectionTitle = 'mb-3 text-base font-semibold text-gray-900 dark:text-white';

  return (
    <div className='space-y-8'>
      <p className='text-sm text-gray-500 dark:text-gray-400'>
        Settings panel — changes are injected live into HDSSettings via <code>_testInject</code>.
        Each setting is stored as <strong>1 event per setting</strong> on the HDS server.
      </p>

      {/* ── Locale & Display ── */}
      <div>
        <h3 className={sectionTitle}>Locale &amp; Display</h3>
        <div className='space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700'>
          <div>
            <label className={labelClass}>Language</label>
            <select
              value={settings.preferredLocales[0]}
              onChange={e => update('preferredLocales', [e.target.value])}
              className={selectClass}
            >
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
            <p className='mt-1 text-xs text-gray-400'>Stored as: settings/preferred-locales</p>
          </div>
          <div>
            <label className={labelClass}>Date format</label>
            <select
              value={settings.dateFormat}
              onChange={e => update('dateFormat', e.target.value)}
              className={selectClass}
            >
              {DATE_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <p className='mt-1 text-xs text-gray-400'>Stored as: settings/date-format</p>
          </div>
          <div>
            <label className={labelClass}>Timezone</label>
            <select
              value={settings.timezone}
              onChange={e => update('timezone', e.target.value)}
              className={selectClass}
            >
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
            <p className='mt-1 text-xs text-gray-400'>Stored as: settings/timezone</p>
          </div>
        </div>
      </div>

      {/* ── Units ── */}
      <div>
        <h3 className={sectionTitle}>Unit System</h3>
        <div className='space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700'>
          <div>
            <label className={labelClass}>Measurement system</label>
            <div className='flex gap-3'>
              {UNIT_SYSTEMS.map(u => (
                <label key={u.value} className='flex items-center gap-2 cursor-pointer'>
                  <input
                    type='radio'
                    name='unitSystem'
                    value={u.value}
                    checked={settings.unitSystem === u.value}
                    onChange={e => update('unitSystem', e.target.value)}
                    className='text-primary-600 focus:ring-primary-500'
                  />
                  <span className='text-sm text-gray-700 dark:text-gray-300'>{u.label}</span>
                </label>
              ))}
            </div>
            <p className='mt-1 text-xs text-gray-400'>Stored as: settings/unit-system — determines default variation for body-weight (mass/kg vs mass/lb), body-height (length/m vs length/ft), etc.</p>
          </div>
        </div>
      </div>

      {/* ── Theme ── */}
      <div>
        <h3 className={sectionTitle}>Appearance</h3>
        <div className='space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700'>
          <div>
            <label className={labelClass}>Theme</label>
            <div className='flex gap-3'>
              {THEMES.map(t => (
                <label key={t.value} className='flex items-center gap-2 cursor-pointer'>
                  <input
                    type='radio'
                    name='theme'
                    value={t.value}
                    checked={settings.theme === t.value}
                    onChange={e => update('theme', e.target.value)}
                    className='text-primary-600 focus:ring-primary-500'
                  />
                  <span className='text-sm text-gray-700 dark:text-gray-300'>{t.label}</span>
                </label>
              ))}
            </div>
            <p className='mt-1 text-xs text-gray-400'>Stored as: settings/theme</p>
          </div>
        </div>
      </div>

      {/* ── Profile ── */}
      <div>
        <h3 className={sectionTitle}>Profile</h3>
        <div className='space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700'>
          <p className='text-xs text-gray-400'>Display name is stored as a <code>contact/display-name</code> event in the app&apos;s baseStream, like other settings.</p>
          <div className='flex items-start gap-4'>
            <div className='flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xl font-medium text-primary-700 dark:bg-primary-900 dark:text-primary-300'>
              {settings.displayName ? settings.displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?'}
            </div>
            <div className='flex-1 space-y-3'>
              <div>
                <label className={labelClass}>Display name</label>
                <input
                  type='text'
                  value={settings.displayName}
                  onChange={e => update('displayName', e.target.value)}
                  placeholder='e.g. Dr. Smith'
                  className={inputClass}
                />
                <p className='mt-1 text-xs text-gray-400'>Stored as: contact/display-name</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Converter Settings ── */}
      {converterItems.length > 0 && (
        <div>
          <h3 className={sectionTitle}>Converter Preferences</h3>
          <div className='space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700'>
            <p className='text-xs text-gray-400'>
              <strong>Auto-convert</strong>: display stored events converted to this method (in diary, timeline, etc.).<br />
              <strong>Default input</strong>: pre-select this method when creating new entries in forms (hides method selector).
            </p>
            {converterItems.map(item => (
              <div key={item.itemKey} className='rounded border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-800'>
                <div className='mb-2 text-sm font-medium text-gray-900 dark:text-white'>{item.label} <span className='text-xs text-gray-400'>({item.itemKey})</span></div>
                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label className={labelClass}>Auto-convert display</label>
                    <select
                      value={converterAuto[item.itemKey] || ''}
                      onChange={e => updateConverterAuto(item.itemKey, e.target.value)}
                      className={selectClass}
                    >
                      <option value=''>None (show source)</option>
                      {item.methods.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    <p className='mt-1 text-xs text-gray-400'>settings/preferred-display</p>
                  </div>
                  <div>
                    <label className={labelClass}>Default input method</label>
                    <select
                      value={converterDefault[item.itemKey] || ''}
                      onChange={e => updateConverterDefault(item.itemKey, e.target.value)}
                      className={selectClass}
                    >
                      <option value=''>Show method selector</option>
                      {item.methods.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    <p className='mt-1 text-xs text-gray-400'>settings/preferred-input</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Debug: Event representations ── */}
      <div>
        <h3 className={sectionTitle}>Storage Preview (1 event per setting)</h3>
        <div className='space-y-2'>
          {settingsEvents.map((evt, i) => (
            <div key={i} className='rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs dark:border-gray-600 dark:bg-gray-700'>
              <span className='font-mono font-semibold text-primary-600 dark:text-primary-400'>{evt.type}</span>
              <span className='mx-2 text-gray-400'>→</span>
              <span className='text-gray-600 dark:text-gray-300'>{JSON.stringify(evt.content)}</span>
              <span className='ml-2 text-gray-400'>in [{evt.streamIds.join(', ')}]</span>
            </div>
          ))}
        </div>
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

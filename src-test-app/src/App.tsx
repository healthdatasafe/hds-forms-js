import { useEffect, useState, useMemo, useCallback } from 'react';
import { getItems, getModel } from './hdsLibService';
import { HDSSettings, localizeText } from 'hds-lib';
import { HDSFormField } from 'hds-forms/components/HDSFormField';
import { HDSFormSection } from 'hds-forms/components/HDSFormSection';
import { ItemSearchPicker } from 'hds-forms/components/ItemSearchPicker';
import { schemaFor } from 'hds-forms/schema/schemas';
import { jsonFormForItemDef } from 'hds-forms/schema/itemDefToSchema';
import type { SectionEntry } from 'hds-forms/types';
import FormBuilder from './FormBuilder';

type Tab = 'fields' | 'section' | 'recurring' | 'medication' | 'builder' | 'settings';


interface IntakeState {
  doseValue: string;
  doseUnit: string;
  route: string;
  note: string;
}

const DOSE_UNITS = [
  'dose/tablet', 'dose/drop', 'dose/puff', 'dose/application',
  'dose/suppository', 'dose/unit', 'volume/ml',
  'mass/mg', 'mass/mcg', 'mass/g'
];

const ROUTES = [
  'oral', 'sublingual', 'parenteral', 'intravenous', 'intramuscular',
  'subcutaneous', 'inhalation', 'nasal', 'topical', 'transdermal',
  'ophthalmic', 'otic', 'rectal', 'vaginal'
];

function buildMedicationEvent (drug: any, intake: IntakeState) {
  const drugObj: any = {
    label: drug.label,
    description: drug.description,
    codes: drug.codes || []
  };

  const intakeObj: any = {};
  if (intake.doseValue) intakeObj.doseValue = parseFloat(intake.doseValue);
  if (intake.doseUnit) intakeObj.doseUnit = intake.doseUnit;
  if (intake.route) intakeObj.route = intake.route;
  if (intake.note) intakeObj.note = intake.note;

  return {
    type: 'medication/coded-v1',
    content: {
      drug: drugObj,
      ...(Object.keys(intakeObj).length > 0 ? { intake: intakeObj } : {})
    }
  };
}

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

  // Medication tab state
  const [medicationValue, setMedicationValue] = useState<any>(undefined);
  const [intake, setIntake] = useState<IntakeState>({
    doseValue: '',
    doseUnit: '',
    route: '',
    note: ''
  });

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

  function handleDrugSelect (value: any) {
    setMedicationValue(value);
    // Pre-fill intake fields from API response
    if (value) {
      setIntake(prev => ({
        ...prev,
        doseUnit: value.doseUnit || prev.doseUnit || '',
        route: value.route || prev.route || ''
      }));
    } else {
      setIntake({ doseValue: '', doseUnit: '', route: '', note: '' });
    }
  }

  function updateIntake (field: keyof IntakeState, value: string) {
    setIntake(prev => ({ ...prev, [field]: value }));
  }

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
    <div className={`mx-auto px-4 py-8 ${(tab === 'builder' || tab === 'fields') ? 'max-w-6xl' : 'max-w-3xl'}`}>
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
        <button className={tabClass('medication')} onClick={() => setTab('medication')}>
          Medication
        </button>
        <button className={tabClass('builder')} onClick={() => setTab('builder')}>
          Builder
        </button>
        <button className={tabClass('settings')} onClick={() => setTab('settings')}>
          Settings
        </button>
      </div>

      <div className='rounded-b-lg border border-t-0 border-gray-200 bg-white p-6 dark:border-gray-600 dark:bg-gray-800'>

        {/* ── Single Field Tab ── */}
        {tab === 'fields' && (
          <div className='flex gap-4' style={{ minHeight: '400px' }}>
            <div className='w-64 shrink-0'>
              <ItemSearchPicker items={items} selectedKey={selectedKey} onSelect={setSelectedKey} />
            </div>
            <div className='min-w-0 flex-1 space-y-4'>
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
              {!selectedKey && (
                <p className='py-8 text-center text-sm text-gray-400'>Select an item from the list</p>
              )}
              <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                <DebugPanel title='Field value' json={fieldValueJson} />
                <DebugPanel title='JSON Schema' json={fieldSchemaJson} />
                <DebugPanel title='Event data' json={eventDataJson} />
              </div>
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

        {/* ── Builder Tab ── */}
        {tab === 'builder' && <FormBuilder />}

        {/* ── Settings Tab ── */}
        {tab === 'settings' && <SettingsPanel />}

        {/* ── Medication Tab ── */}
        {tab === 'medication' && (() => {
          const model = getModel();
          const itemDef = model.itemsDefs.forKey('medication-intake-coded');
          if (!itemDef) return <p className='text-red-500'>medication-intake-coded not found in model</p>;
          const event = medicationValue ? buildMedicationEvent(medicationValue, intake) : null;
          return (
            <div className='space-y-6'>
              <p className='text-sm text-gray-500 dark:text-gray-400'>
                Full <code>medication/coded-v1</code> event builder: drug selection + intake fields
              </p>

              {/* Drug selection */}
              <div>
                <h3 className='mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300'>Drug</h3>
                <div className='rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700'>
                  <HDSFormField
                    itemData={itemDef.data}
                    value={medicationValue}
                    onChange={handleDrugSelect}
                  />
                </div>
                {medicationValue && (
                  <div className='mt-2 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400'>
                    {medicationValue.ingredient && <span className='rounded bg-gray-100 px-2 py-0.5 dark:bg-gray-700'>{medicationValue.ingredient}</span>}
                    {medicationValue.strength && <span className='rounded bg-gray-100 px-2 py-0.5 dark:bg-gray-700'>{medicationValue.strength}</span>}
                    {medicationValue.doseForm && <span className='rounded bg-gray-100 px-2 py-0.5 dark:bg-gray-700'>{medicationValue.doseForm}</span>}
                    {medicationValue.codes?.map((c: any, i: number) => (
                      <span key={i} className='rounded bg-primary-50 px-2 py-0.5 text-primary-700 dark:bg-primary-900 dark:text-primary-300'>
                        {c.system}:{c.code}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Intake fields — shown after drug selection */}
              {medicationValue && (
                <div>
                  <h3 className='mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300'>Intake</h3>
                  <div className='space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700'>
                    <div className='flex items-end gap-3'>
                      <div className='w-24 shrink-0'>
                        <label className='mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300'>
                          Dose value
                        </label>
                        <input
                          type='number'
                          min='0'
                          step='any'
                          value={intake.doseValue}
                          onChange={e => updateIntake('doseValue', e.target.value)}
                          placeholder='e.g. 2'
                          disabled={!!medicationValue.doseValue}
                          className='block w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
                        />
                      </div>
                      <div className='min-w-0 flex-1'>
                        <label className='mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300'>
                          Dose unit
                        </label>
                        <select
                          value={intake.doseUnit}
                          onChange={e => updateIntake('doseUnit', e.target.value)}
                          disabled={!!medicationValue.doseUnit}
                          className='block w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
                        >
                          <option value=''>-- select --</option>
                          {DOSE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      <div className='min-w-0 flex-1'>
                        <label className='mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300'>
                          Route
                        </label>
                        <select
                          value={intake.route}
                          onChange={e => updateIntake('route', e.target.value)}
                          disabled={!!medicationValue.route}
                          className='block w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
                        >
                          <option value=''>-- select --</option>
                          {ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className='mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300'>Note</label>
                      <input
                        type='text'
                        value={intake.note}
                        onChange={e => updateIntake('note', e.target.value)}
                        placeholder='e.g. take with food'
                        className='block w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Debug: complete event */}
              <DebugPanel title='medication/coded-v1 event' json={event ? JSON.stringify(event, null, 2) : 'null'} />
            </div>
          );
        })()}
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
      const settingKey = `converter-auto-${itemKey}`;
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
      const settingKey = `converter-default-${itemKey}`;
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
      events.push({ type: 'settings/converter-auto', streamIds: ['app-baseStream'], content: { itemKey, method } as any });
    }
    for (const [itemKey, method] of Object.entries(converterDefault)) {
      events.push({ type: 'settings/converter-default', streamIds: ['app-baseStream'], content: { itemKey, method } as any });
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
                    <p className='mt-1 text-xs text-gray-400'>settings/converter-auto</p>
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
                    <p className='mt-1 text-xs text-gray-400'>settings/converter-default</p>
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

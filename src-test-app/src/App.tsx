import { useEffect, useState, useMemo } from 'react';
import { getItems, getModel } from './hdsLibService';
import { HDSFormField } from 'hds-forms/components/HDSFormField';
import { HDSFormSection } from 'hds-forms/components/HDSFormSection';
import { schemaFor } from 'hds-forms/schema/schemas';
import { jsonFormForItemDef } from 'hds-forms/schema/itemDefToSchema';
import type { SectionEntry } from 'hds-forms/types';
import FormBuilder from './FormBuilder';

type Tab = 'fields' | 'section' | 'recurring' | 'medication' | 'builder';

interface IntakeState {
  doseValue: string;
  doseUnit: string;
  route: string;
  frequencyHours: string;
  asNeeded: boolean;
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
  if (intake.frequencyHours) intakeObj.frequencyHours = parseFloat(intake.frequencyHours);
  if (intake.asNeeded) intakeObj.asNeeded = true;
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
    frequencyHours: '',
    asNeeded: false,
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
      setIntake({ doseValue: '', doseUnit: '', route: '', frequencyHours: '', asNeeded: false, note: '' });
    }
  }

  function updateIntake (field: keyof IntakeState, value: string | boolean) {
    setIntake(prev => ({ ...prev, [field]: value }));
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
    <div className={`mx-auto px-4 py-8 ${tab === 'builder' ? 'max-w-6xl' : 'max-w-3xl'}`}>
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
        <button className={tabClass('medication')} onClick={() => setTab('medication')}>
          Medication
        </button>
        <button className={tabClass('builder')} onClick={() => setTab('builder')}>
          Builder
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

        {/* ── Builder Tab ── */}
        {tab === 'builder' && <FormBuilder />}

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
                  <div className='grid grid-cols-2 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700'>
                    <div>
                      <label className='mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300'>Dose value</label>
                      <input
                        type='number'
                        min='0'
                        step='any'
                        value={intake.doseValue}
                        onChange={e => updateIntake('doseValue', e.target.value)}
                        placeholder='e.g. 1, 2, 0.5'
                        className='block w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
                      />
                    </div>
                    <div>
                      <label className='mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300'>
                        Dose unit
                        {medicationValue.doseUnit && <span className='ml-1 text-primary-500'>(pre-filled)</span>}
                      </label>
                      <select
                        value={intake.doseUnit}
                        onChange={e => updateIntake('doseUnit', e.target.value)}
                        className='block w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
                      >
                        <option value=''>-- select --</option>
                        {DOSE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className='mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300'>
                        Route
                        {medicationValue.route && <span className='ml-1 text-primary-500'>(pre-filled)</span>}
                      </label>
                      <select
                        value={intake.route}
                        onChange={e => updateIntake('route', e.target.value)}
                        className='block w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
                      >
                        <option value=''>-- select --</option>
                        {ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className='mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300'>Frequency (hours)</label>
                      <input
                        type='number'
                        min='0'
                        step='any'
                        value={intake.frequencyHours}
                        onChange={e => updateIntake('frequencyHours', e.target.value)}
                        placeholder='e.g. 8, 12, 24'
                        className='block w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
                      />
                    </div>
                    <div className='flex items-center gap-2'>
                      <input
                        type='checkbox'
                        id='asNeeded'
                        checked={intake.asNeeded}
                        onChange={e => updateIntake('asNeeded', e.target.checked)}
                        className='h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800'
                      />
                      <label htmlFor='asNeeded' className='text-sm text-gray-700 dark:text-gray-300'>As needed (PRN)</label>
                    </div>
                    <div className='col-span-2'>
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

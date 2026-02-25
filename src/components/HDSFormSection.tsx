import { useState } from 'react';
import { getHDSModel, localizeText } from 'hds-lib';
import { HDSFormField } from './HDSFormField';
import { Select } from './fields/Select';
import { EntryList } from './EntryList';
import type { SectionEntry } from '../types';

const l = localizeText;

type localizableText = { en: string; fr?: string; es?: string };

interface SectionDef {
  key?: string;
  type?: 'permanent' | 'recurring';
  itemKeys: string[];
  label?: localizableText;
}

interface HDSFormSectionProps {
  section: SectionDef;
  values?: Record<string, any>;
  onSubmit: (formData: Record<string, any>) => void;
  disabled?: boolean;
  submitLabel?: string;
  entries?: SectionEntry[];
  onEditEntry?: (index: number) => void;
  onDeleteEntry?: (index: number) => void;
}

function todayString (): string {
  return new Date().toISOString().slice(0, 10);
}

export function HDSFormSection ({ section, values: initialValues, onSubmit, disabled, submitLabel, entries, onEditEntry, onDeleteEntry }: HDSFormSectionProps) {
  const [formValues, setFormValues] = useState<Record<string, any>>(initialValues || {});
  const [entryDate, setEntryDate] = useState<string>(todayString());
  const model = getHDSModel();
  const isRecurring = section.type === 'recurring';

  function handleFieldChange (key: string, value: any) {
    setFormValues(prev => ({ ...prev, [key]: value }));
  }

  function handleVariationChange (key: string, value: string) {
    setFormValues(prev => ({ ...prev, [`${key}__eventType`]: value }));
  }

  function handleSubmit (e: React.FormEvent) {
    e.preventDefault();
    if (isRecurring) {
      const time = Math.floor(new Date(entryDate).getTime() / 1000);
      onSubmit({ ...formValues, __time: time });
    } else {
      onSubmit(formValues);
    }
  }

  // Build field labels map for EntryList
  const fieldLabels: Record<string, string> = {};
  for (const key of section.itemKeys) {
    const itemDef = model.itemsDefs.forKey(key);
    if (itemDef) {
      fieldLabels[key] = l(itemDef.data.label) || key;
    }
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      {section.label && (
        <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>{l(section.label)}</h3>
      )}

      {isRecurring && (
        <div>
          <label className='mb-1 block text-sm font-medium text-gray-900 dark:text-white'>
            Date
          </label>
          <input
            type='date'
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            disabled={disabled}
            className='block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500'
          />
        </div>
      )}

      {section.itemKeys.map((key) => {
        const itemDef = model.itemsDefs.forKey(key);
        if (!itemDef) return null;

        const variations = itemDef.data?.variations?.eventType;

        return (
          <div key={key} className='space-y-2'>
            <HDSFormField
              itemData={itemDef.data}
              value={formValues[key]}
              onChange={(v) => handleFieldChange(key, v)}
              disabled={disabled}
            />
            {variations && (
              <Select
                label={l(variations.label) || ''}
                value={formValues[`${key}__eventType`]}
                onChange={(v) => handleVariationChange(key, v)}
                options={variations.options.map((o: any) => ({
                  value: o.value,
                  label: l(o.label) || ''
                }))}
                disabled={disabled}
              />
            )}
          </div>
        );
      })}

      <button
        type='submit'
        disabled={disabled}
        className='rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-300 disabled:opacity-50 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800'
      >
        {submitLabel || (isRecurring ? 'Add entry' : 'Submit')}
      </button>

      {isRecurring && entries && onEditEntry && onDeleteEntry && (
        <EntryList
          entries={entries}
          itemKeys={section.itemKeys}
          fieldLabels={fieldLabels}
          onEdit={onEditEntry}
          onDelete={onDeleteEntry}
        />
      )}
    </form>
  );
}

import { useState, useEffect } from 'react';
import { getHDSModel, localizeText, appTemplates, getPreferredInput } from 'hds-lib';
import { HDSFormField } from './HDSFormField';
import { Select } from './fields/Select';
import { EntryList } from './EntryList';
import type { SectionEntry } from '../types';

const l = localizeText;

type localizableText = { en: string; fr?: string; es?: string };

/**
 * Per-item customizations stored on the section. Re-exported from hds-lib for
 * convenience — same shape as `appTemplates.ItemCustomization`.
 */
export type ItemCustomization = appTemplates.ItemCustomization;

/** Plan 45 — CustomFieldDeclaration carried on the template / request. */
export type CustomFieldDeclaration = appTemplates.CustomFieldDeclaration;

interface SectionDef {
  key?: string;
  type?: 'permanent' | 'recurring';
  itemKeys: string[];
  label?: localizableText;
  /** Optional per-itemKey customizations (labels, repeatable, reminder, ...). */
  itemCustomizations?: Record<string, ItemCustomization>;
  /** Plan 45 — custom-field def.keys to render in this section, looked up against `customFields[]`. */
  customFieldKeys?: string[];
  /** Plan 45 — custom-field declarations available to this section (typically the template's full customFields[]). */
  customFields?: CustomFieldDeclaration[];
}

interface HDSFormSectionProps {
  section: SectionDef;
  values?: Record<string, any>;
  onSubmit: (formData: Record<string, any>) => void;
  onDateChange?: (dateStr: string) => void;
  disabled?: boolean;
  submitLabel?: string;
  entries?: SectionEntry[];
  onEditEntry?: (index: number) => void;
  onDeleteEntry?: (index: number) => void;
}

function todayString (): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Seed `<key>__eventType` for every variation item that has no choice yet.
 *
 * hds-lib 2.0.0 makes `eventTemplate()` throw rather than silently return
 * `eventTypes[0]` for a variation item (issue #13: a weight entered in pounds was
 * stored as kilograms). The form is the layer that knows the user's preference, so
 * it states the choice explicitly instead of leaving the primitive to guess.
 *
 * This also fixes the selector rendering blank: `__eventType` was never
 * initialised, so the unit `<Select>` had `value={undefined}` until the user
 * touched it, and submitting without touching it silently stored the first
 * declared option.
 *
 * Module-level so the effect below can depend on it without re-seeding every render.
 */
function seedVariations (base: Record<string, any>, itemKeys: string[], model: any): Record<string, any> {
  const seeded = { ...base };
  for (const key of itemKeys) {
    if (seeded[`${key}__eventType`] != null) continue;
    const itemDef = model.itemsDefs.forKey(key, false);
    if (!itemDef?.data?.variations?.eventType) continue;
    const preferred = getPreferredInput(key)?.eventType;
    seeded[`${key}__eventType`] = preferred ?? itemDef.data.variations.eventType.options?.[0]?.value;
  }
  return seeded;
}

export function HDSFormSection ({ section, values: initialValues, onSubmit, onDateChange, disabled, submitLabel, entries, onEditEntry, onDeleteEntry }: HDSFormSectionProps) {
  const model = getHDSModel();
  const [formValues, setFormValues] = useState<Record<string, any>>(
    () => seedVariations(initialValues || {}, section.itemKeys, model)
  );
  const [entryDate, setEntryDate] = useState<string>(todayString());

  // Sync form values when initialValues prop changes (e.g. date change triggers new prefill)
  useEffect(() => {
    setFormValues(seedVariations(initialValues || {}, section.itemKeys, model));
  }, [initialValues, section.itemKeys, model]);
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

  // Build field labels map for EntryList (honours per-section label overrides)
  const fieldLabels: Record<string, string> = {};
  for (const key of section.itemKeys) {
    const itemDef = model.itemsDefs.forKey(key);
    if (itemDef) {
      const override = section.itemCustomizations?.[key]?.labels?.question;
      fieldLabels[key] = (override ? l(override) : l(itemDef.data.label)) || key;
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
            onChange={(e) => { setEntryDate(e.target.value); onDateChange?.(e.target.value); }}
            disabled={disabled}
            className='block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500'
          />
        </div>
      )}

      {section.itemKeys.map((key) => {
        const itemDef = model.itemsDefs.forKey(key);
        if (!itemDef) return null;

        const variations = itemDef.data?.variations?.eventType;
        const labelOverrides = section.itemCustomizations?.[key]?.labels;

        return (
          <div key={key} className='space-y-2'>
            <HDSFormField
              itemData={itemDef.data}
              itemKey={key}
              value={formValues[key]}
              onChange={(v) => handleFieldChange(key, v)}
              disabled={disabled}
              labelOverrides={labelOverrides}
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

      {/* Plan 45 — custom-field rendering. Uses `__cf::{templateId}::{key}` as the form value key. */}
      {(section.customFieldKeys || []).map((cfKey) => {
        const decl = (section.customFields || []).find((c) => c.def.key === cfKey);
        if (!decl) return null;
        const virtual = appTemplates.customFieldDeclarationToVirtualItem(decl);
        const valueKey = `__cf::${virtual.key}`;
        return (
          <div key={valueKey} className='space-y-2'>
            <HDSFormField
              itemData={virtual.data as any}
              itemKey={virtual.key}
              value={formValues[valueKey]}
              onChange={(v) => handleFieldChange(valueKey, v)}
              required={virtual.data.required}
              disabled={disabled}
            />
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

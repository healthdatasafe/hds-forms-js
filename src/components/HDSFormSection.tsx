import { useState } from 'react';
import { getHDSModel, localizeText } from 'hds-lib';
import { HDSFormField } from './HDSFormField';
import { Select } from './fields/Select';

const l = localizeText;

interface SectionDef {
  itemKeys: string[];
  label?: { en: string; fr?: string; es?: string };
}

interface HDSFormSectionProps {
  section: SectionDef;
  values?: Record<string, any>;
  onSubmit: (formData: Record<string, any>) => void;
  disabled?: boolean;
  submitLabel?: string;
}

export function HDSFormSection ({ section, values: initialValues, onSubmit, disabled, submitLabel }: HDSFormSectionProps) {
  const [formValues, setFormValues] = useState<Record<string, any>>(initialValues || {});
  const model = getHDSModel();

  function handleFieldChange (key: string, value: any) {
    setFormValues(prev => ({ ...prev, [key]: value }));
  }

  function handleVariationChange (key: string, value: string) {
    setFormValues(prev => ({ ...prev, [`${key}__eventType`]: value }));
  }

  function handleSubmit (e: React.FormEvent) {
    e.preventDefault();
    onSubmit(formValues);
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      {section.label && (
        <h3 className='text-lg font-semibold text-gray-900'>{l(section.label)}</h3>
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
        className='rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-300 disabled:opacity-50'
      >
        {submitLabel || 'Submit'}
      </button>
    </form>
  );
}

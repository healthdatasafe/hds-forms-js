import { HDSFormField } from '../HDSFormField';
import type { FieldProps } from '../../types';
import type { ItemData } from '../../schema/schemas';

interface CompositeFieldProps extends FieldProps {
  composite: Record<string, ItemData>;
}

export function Composite ({ label, description, value, onChange, composite, disabled }: CompositeFieldProps) {
  const compositeValue = value || {};

  function handleFieldChange (key: string, fieldValue: any) {
    onChange({ ...compositeValue, [key]: fieldValue });
  }

  return (
    <fieldset className='rounded-lg border border-gray-200 p-4 dark:border-gray-600'>
      <legend className='px-2 text-sm font-medium text-gray-900 dark:text-white'>{label}</legend>
      {description && <p className='mb-3 text-sm text-gray-500 dark:text-gray-400'>{description}</p>}
      <div className='space-y-4'>
        {Object.entries(composite).map(([key, itemData]) => (
          <HDSFormField
            key={key}
            itemData={itemData}
            value={compositeValue[key]}
            onChange={(v) => handleFieldChange(key, v)}
            disabled={disabled}
          />
        ))}
      </div>
    </fieldset>
  );
}

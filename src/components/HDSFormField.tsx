import { localizeText } from 'hds-lib';
import type { ItemData } from '../schema/schemas';
import { Checkbox } from './fields/Checkbox';
import { DateInput } from './fields/DateInput';
import { TextInput } from './fields/TextInput';
import { NumberInput } from './fields/NumberInput';
import { Select } from './fields/Select';
import { Composite } from './fields/Composite';
import { DatasetSearch } from './fields/DatasetSearch';
import { Convertible } from './fields/Convertible';

const l = localizeText;

interface HDSFormFieldProps {
  /** Raw item data (from itemDef.data or composite sub-field) */
  itemData: ItemData;
  value: any;
  onChange: (value: any) => void;
  required?: boolean;
  disabled?: boolean;
}

export function HDSFormField ({ itemData, value, onChange, required, disabled }: HDSFormFieldProps) {
  const label = l(itemData.label) || '';
  const description = itemData.description ? (l(itemData.description) || undefined) : undefined;
  const isRequired = required ?? false;

  const baseProps = { label, description, value, onChange, required: isRequired, disabled };

  switch (itemData.type) {
    case 'checkbox':
      return <Checkbox {...baseProps} />;
    case 'date':
      return <DateInput {...baseProps} />;
    case 'text':
      return <TextInput {...baseProps} />;
    case 'number':
      return <NumberInput {...baseProps} />;
    case 'select': {
      const options = (itemData as any).options.map((opt: any) => ({
        value: opt.value,
        label: l(opt.label) || ''
      }));
      return <Select {...baseProps} options={options} />;
    }
    case 'composite': {
      const composite = (itemData as any).composite;
      return <Composite {...baseProps} composite={composite} />;
    }
    case 'datasource-search': {
      const dsKey = (itemData as any).datasource;
      const eventType = (itemData as any).eventType;
      return <DatasetSearch {...baseProps} datasource={dsKey} eventType={eventType} />;
    }
    case 'convertible': {
      return <Convertible {...baseProps} />;
    }
    default:
      return <div className='text-sm text-red-500'>Unknown field type: {(itemData as any).type}</div>;
  }
}

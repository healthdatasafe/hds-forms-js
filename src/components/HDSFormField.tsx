import { localizeText, HDSSettings, getHDSModel } from 'hds-lib';
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

type localizableText = { en: string; fr?: string; es?: string };

/** Optional form-level overrides applied on top of the item definition. */
export interface FieldLabelOverrides {
  /** Override for the question label (replaces `itemData.label`). */
  question?: localizableText;
  /** Override for the question description (replaces `itemData.description`). */
  description?: localizableText;
  /** Overrides for option labels in `select` fields, keyed by the option's raw value. */
  options?: Record<string | number, localizableText>;
}

interface HDSFormFieldProps {
  /** Raw item data (from itemDef.data or composite sub-field) */
  itemData: ItemData;
  /** Item key (needed for preferred API resolution) */
  itemKey?: string;
  value: any;
  onChange: (value: any) => void;
  required?: boolean;
  disabled?: boolean;
  /** Optional form-level label overrides (from `section.itemCustomizations[key].labels`). */
  labelOverrides?: FieldLabelOverrides;
}

export function HDSFormField ({ itemData, itemKey, value, onChange, required, disabled, labelOverrides }: HDSFormFieldProps) {
  const label = l(labelOverrides?.question ?? itemData.label) || '';
  const descSource = labelOverrides?.description ?? itemData.description;
  const description = descSource ? (l(descSource) || undefined) : undefined;
  const isRequired = required ?? false;

  const baseProps = { label, description, value, onChange, required: isRequired, disabled };

  switch (itemData.type) {
    case 'checkbox':
      return <Checkbox {...baseProps} />;
    case 'date':
      return <DateInput {...baseProps} />;
    case 'text':
      return <TextInput {...baseProps} />;
    case 'number': {
      let unit: string | undefined;
      const variations = (itemData as any).variations?.eventType;
      if (variations?.options && HDSSettings.isHooked) {
        // 1. Per-item override
        const perItem = HDSSettings.get(`preferred-input-${itemKey}`);
        let selected = perItem
          ? variations.options.find((o: any) => o.value === perItem)
          : undefined;
        // 2. Fallback: use unitSystem + model conversions to find matching variation
        if (!selected) {
          try {
            const system = HDSSettings.get('unitSystem');
            const conversions = getHDSModel().modelData.conversions;
            if (conversions && system) {
              for (const opt of variations.options) {
                const et: string = opt.value;
                const slash = et.indexOf('/');
                if (slash < 0) continue;
                const cat = et.substring(0, slash);
                const u = et.substring(slash + 1);
                if (conversions[cat]?.[system] === u) { selected = opt; break; }
              }
            }
          } catch { /* model not loaded */ }
        }
        // 3. Default: first option
        if (!selected) selected = variations.options[0];
        if (selected?.label) unit = l(selected.label) || undefined;
      } else if (variations?.options) {
        // Not hooked: show first option label
        const first = variations.options[0];
        if (first?.label) unit = l(first.label) || undefined;
      }
      return <NumberInput {...baseProps} unit={unit} />;
    }
    case 'select': {
      const optionOverrides = labelOverrides?.options;
      const options = (itemData as any).options.map((opt: any) => {
        const override = optionOverrides?.[opt.value];
        return {
          value: opt.value,
          label: (override ? l(override) : l(opt.label)) || ''
        };
      });
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
      const converterEngine = (itemData as any)['converter-engine'];
      return <Convertible {...baseProps} converterEngine={converterEngine} />;
    }
    default:
      return <div className='text-sm text-red-500'>Unknown field type: {(itemData as any).type}</div>;
  }
}

import { localizeText, HDSSettings, getHDSModel, appTemplates } from 'hds-lib';
import type { ItemData } from '../schema/schemas';
import { Checkbox } from './fields/Checkbox';
import { DateInput } from './fields/DateInput';
import { TextInput } from './fields/TextInput';
import { NumberInput } from './fields/NumberInput';
import { Select } from './fields/Select';
import { Composite } from './fields/Composite';
import { DatasetSearch } from './fields/DatasetSearch';
import { Convertible } from './fields/Convertible';
import { Slider } from './fields/Slider';

const l = localizeText;

/**
 * Form-level label overrides. Re-exported from hds-lib so consumers can use
 * either `FieldLabelOverrides` (form renderer) or `appTemplates.ItemLabels`
 * (data layer) — they are the same shape.
 */
export type FieldLabelOverrides = appTemplates.ItemLabels;
export type FieldLabelOverridesWithSource = appTemplates.ItemLabelsWithSource;

interface HDSFormFieldProps {
  /** Raw item data (from itemDef.data or composite sub-field) */
  itemData: ItemData;
  /** Item key (needed for preferred API resolution) */
  itemKey?: string;
  value: any;
  onChange: (value: any) => void;
  required?: boolean;
  disabled?: boolean;
  /**
   * Optional form-level label overrides:
   * - single override (object): single form context, replaces item-def labels.
   * - array (with source attribution): multiple forms requesting the same
   *   item with different wording — every variant is rendered, each labelled
   *   with its source. The single shared input is bound to all of them.
   */
  labelOverrides?: FieldLabelOverrides | FieldLabelOverridesWithSource[];
}

function sourceCaption (source?: appTemplates.ItemLabelSource): string {
  if (!source) return '';
  const parts: string[] = [];
  if (source.contactName) parts.push(source.contactName);
  if (source.formTitle) {
    const t = l(source.formTitle);
    if (t) parts.push(t);
  }
  return parts.join(' · ');
}

export function HDSFormField ({ itemData, itemKey, value, onChange, required, disabled, labelOverrides }: HDSFormFieldProps) {
  const overrideArray: FieldLabelOverridesWithSource[] | undefined = Array.isArray(labelOverrides)
    ? labelOverrides
    : undefined;
  const singleOverride: FieldLabelOverrides | undefined = Array.isArray(labelOverrides)
    ? undefined
    : labelOverrides;

  // Multi-form path: stack one rendering per override, bound to the same value.
  if (overrideArray && overrideArray.length > 1) {
    return (
      <div className='space-y-4'>
        {overrideArray.map((ov, i) => {
          const caption = sourceCaption(ov.source);
          return (
            <div key={(ov.source?.requestKey || 'src') + ':' + (ov.source?.sectionKey || i)} className='border-l-2 border-gray-200 pl-3 dark:border-gray-700'>
              {caption && (
                <div className='mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                  {caption}
                </div>
              )}
              <HDSFormField
                itemData={itemData}
                itemKey={itemKey}
                value={value}
                onChange={onChange}
                required={required}
                disabled={disabled}
                labelOverrides={{ question: ov.question, description: ov.description, options: ov.options }}
              />
            </div>
          );
        })}
      </div>
    );
  }

  // Single-form / no-override path.
  const effective: FieldLabelOverrides | undefined = overrideArray && overrideArray.length === 1
    ? { question: overrideArray[0].question, description: overrideArray[0].description, options: overrideArray[0].options }
    : singleOverride;

  const label = l(effective?.question ?? itemData.label) || '';
  const descSource = effective?.description ?? itemData.description;
  const description = descSource ? (l(descSource) || undefined) : undefined;
  const isRequired = required ?? false;

  const baseProps = { label, description, value, onChange, required: isRequired, disabled };
  const labelOverridesForOptions = effective;

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
      const optionOverrides = labelOverridesForOptions?.options;
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
    case 'slider': {
      const s = itemData as any;
      return (
        <Slider
          {...baseProps}
          min={s.min}
          max={s.max}
          step={s.step}
          orientation={s.slider?.orientation}
          labels={s.slider?.labels}
          display={s.slider?.display}
        />
      );
    }
    default:
      return <div className='text-sm text-red-500'>Unknown field type: {(itemData as any).type}</div>;
  }
}

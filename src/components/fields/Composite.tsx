import { localizeText } from 'hds-lib';
import { HDSFormField } from '../HDSFormField';
import type { FieldProps } from '../../types';
import type { ItemData } from '../../schema/schemas';
import { ALL_OR_NOTHING_HINT, useAllOrNothing } from './allOrNothing';

interface CompositeFieldProps extends FieldProps {
  composite: Record<string, ItemData>;
  /** The eventType's JSON schema for this object (its `properties` and `required`). */
  objectSchema?: any;
  /**
   * A group inside another composite (e.g. `intake.frequency`): all or nothing when
   * `objectSchema.required` lists keys. The item's top-level composite is never gated.
   */
  nested?: boolean;
}

export function Composite ({ label, description, value, onChange, composite, disabled, objectSchema, nested }: CompositeFieldProps) {
  const required = nested ? objectSchema?.required : undefined;
  const { draft, update, incomplete, isFieldRequired } = useAllOrNothing(value, required, onChange, null);

  function handleFieldChange (key: string, fieldValue: any) {
    // The spread keeps stored keys that are not form fields (an importer's codings, ids).
    const updated = { ...draft };
    // A cleared text or date input sends '': on an optional sub-field that drops the key,
    // as the companion fields do (eventType strings are `minLength: 1`). A required one keeps it.
    if (fieldValue == null || (fieldValue === '' && (composite[key] as any)?.canBeNull)) {
      delete updated[key];
    } else {
      updated[key] = fieldValue;
    }
    update(updated);
  }

  return (
    <fieldset className='rounded-lg border border-gray-200 p-4 dark:border-gray-600'>
      <legend className='px-2 text-sm font-medium text-gray-900 dark:text-white'>
        {label}
      </legend>
      {description && <p className='mb-2 text-sm text-gray-500 dark:text-gray-400'>{description}</p>}
      <div className='space-y-4'>
        {Object.entries(composite).map(([key, itemData]) => (
          <HDSFormField
            key={key}
            itemData={itemData}
            value={draft[key]}
            onChange={(v) => handleFieldChange(key, v)}
            required={!(itemData as any).canBeNull || isFieldRequired(key)}
            disabled={disabled}
            objectSchema={objectSchema?.properties?.[key] ?? null}
          />
        ))}
      </div>
      {incomplete && <p className='mt-2 text-sm text-red-600 dark:text-red-400' role='alert'>{localizeText(ALL_OR_NOTHING_HINT)}</p>}
    </fieldset>
  );
}

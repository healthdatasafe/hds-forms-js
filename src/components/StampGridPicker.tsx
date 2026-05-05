import React, { useMemo } from 'react';
import { localizeText } from 'hds-lib';
import {
  registry,
  RepresentationCell,
  composeCellInput,
  type CellInput
} from 'hds-feminine-cycle-ui';

/**
 * Visual option picker for cervical-fluid converter components when a
 * registered representation matches the selected method (e.g. method='femm'
 * with `femmSpec` registered). Each option renders as a tappable cell using
 * the representation's primitive (dot-circle / stamp-square).
 *
 * Falls back to dropdown if no representation matches — caller should keep
 * the default `<select>` for that case.
 */
export interface StampGridPickerProps {
  representationId: string;
  options: Array<{ value: any; label?: any }>;
  value: any;
  disabled?: boolean;
  onChange: (value: any) => void;
}

export function isRepresentationAvailable (methodId: string): boolean {
  return registry.has(methodId);
}

export const StampGridPicker: React.FC<StampGridPickerProps> = ({
  representationId,
  options,
  value,
  disabled,
  onChange
}) => {
  const rep = useMemo(() => registry.get(representationId), [representationId]);
  if (!rep) return null;

  return (
    <div className='flex flex-wrap gap-2'>
      {options.map(opt => {
        const optKey = String(opt.value);
        const optLabel = opt.label ? (localizeText(opt.label) || optKey) : optKey;
        // Build a synthetic event with this option as the native mucus value.
        const syntheticEvents = [{
          time: 0,
          streamIds: ['body-vulva-mucus-inspect'],
          type: 'vulva-mucus-inspect/9d-vector',
          content: { source: { key: rep.spec.boundMethod.methodId, sourceData: { mucus: opt.value } } }
        }];
        const input: CellInput = composeCellInput(syntheticEvents as any, rep);
        const isSelected = String(value) === optKey;
        return (
          <button
            key={optKey}
            type='button'
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`flex flex-col items-center gap-1 rounded-md border-2 p-2 transition-colors min-w-16 ${
              isSelected
                ? 'border-primary-600 bg-primary-50 dark:bg-primary-950'
                : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            aria-pressed={isSelected}
            aria-label={optLabel}
          >
            <RepresentationCell
              representationId={representationId}
              input={input}
              size={32}
            />
            <span className='text-xs text-gray-700 dark:text-gray-300 text-center max-w-20 break-words leading-tight'>
              {optLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
};

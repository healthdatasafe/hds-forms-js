import { useState, useEffect, useMemo } from 'react';
import { getHDSModel, localizeText, HDSSettings } from 'hds-lib';
import type { FieldProps } from '../../types';
import { InfoIcon } from './FieldLabel';
import { StampGridPicker, isRepresentationAvailable } from '../StampGridPicker';

interface ConverterEngine {
  key: string;
  version: string;
  models: string; // itemKey for the converter (e.g. 'cervical-fluid', 'mood')
}

interface ConvertibleFieldProps extends FieldProps {
  /** converter-engine block from the itemDef */
  converterEngine?: ConverterEngine;
}

/**
 * Field component for convertible items (euclidian-distance converter engine).
 *
 * Option B: Method picker → observation selector, with _raw (dimension stops) as fallback.
 * - If preferred-input-{itemKey} setting is set, pre-selects that method and hides the method picker.
 * - Otherwise shows a method dropdown, then the method's observation options.
 * - Selecting an observation calls convertMethodToEvent to produce the vector + source block.
 * - "_raw" virtual method shows dimension stop selectors.
 */
export function Convertible ({ label, description, value, onChange, converterEngine, required, disabled }: ConvertibleFieldProps) {
  const [engine, setEngine] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<string>('');

  const itemKey = converterEngine?.models;
  const source = value?.source;
  const vectors = value?.vectors;

  // Load converter engine
  useEffect(() => {
    if (!itemKey) { setLoading(false); return; }
    (async () => {
      try {
        const model = getHDSModel();
        const eng = await model.converters.ensureEngine(itemKey);
        setEngine(eng);

        // Check for converter-default setting
        if (HDSSettings.isHooked) {
          const defaultMethod = HDSSettings.get(`preferred-input-${itemKey}`);
          if (defaultMethod && typeof defaultMethod === 'string') {
            setSelectedMethod(defaultMethod);
          }
        }

        // If value already has a source, pre-select that method
        if (source?.key) {
          setSelectedMethod(source.key);
        }
      } catch (e) {
        console.error('Failed to load converter engine:', e);
      }
      setLoading(false);
    })();
  }, [itemKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Available methods (including _raw which is now "HDS Native")
  const methods = useMemo(() => {
    if (!engine) return [];
    const allMethods = [...engine.methodIds];
    // Add _raw if not already in methodIds (it's auto-generated, not in the pack)
    if (!allMethods.includes('_raw')) allMethods.push('_raw');
    return allMethods.map((m: string) => {
      const def = engine.getMethodDef(m);
      return {
        id: m,
        name: def?.name ? (localizeText(def.name) || m) : m,
      };
    });
  }, [engine]);

  // Check if method selector should be hidden (converter-default set)
  const hideMethodSelector = useMemo(() => {
    if (!HDSSettings.isHooked || !itemKey) return false;
    const defaultMethod = HDSSettings.get(`preferred-input-${itemKey}`);
    return !!defaultMethod;
  }, [itemKey]);

  // Get components (observation options) for the selected method
  const methodDef = selectedMethod && engine ? engine.getMethodDef(selectedMethod) : null;
  const components = methodDef?.components || [];
  const isSingleComponent = components.length === 1;

  // Handle observation selection
  async function handleObservationSelect (observation: any) {
    if (!itemKey || !selectedMethod) return;
    try {
      const model = getHDSModel();
      const event = await model.converters.convertMethodToEvent(itemKey, selectedMethod, observation);
      onChange(event.content);
    } catch (e) {
      console.error('Conversion error:', e);
    }
  }

  // Handle _raw dimension changes
  function handleRawDimChange (dim: string, newVal: number) {
    const newVectors = { ...(vectors || {}), [dim]: newVal };
    onChange({ vectors: newVectors });
  }

  // Resolve current observation value from source for highlighting
  const currentObservation = source?.sourceData;

  if (loading) {
    return (
      <div>
        <label className='mb-1 block text-sm font-medium text-gray-900 dark:text-white'>
          {label}{required && <span className='text-red-500'> *</span>}
        </label>
        {description && <p className='mb-2 text-sm text-gray-500 dark:text-gray-400'>{description}</p>}
        <p className='text-sm text-gray-400'>Loading converter...</p>
      </div>
    );
  }

  if (!engine) {
    return (
      <div>
        <label className='mb-1 block text-sm font-medium text-gray-900 dark:text-white'>
          {label}{required && <span className='text-red-500'> *</span>}
        </label>
        {description && <p className='mb-2 text-sm text-gray-500 dark:text-gray-400'>{description}</p>}
        <p className='text-sm text-red-500'>Converter engine not available</p>
      </div>
    );
  }

  return (
    <div>
      <label className='mb-1 block text-sm font-medium text-gray-900 dark:text-white'>
        {label}{required && <span className='text-red-500'> *</span>}
      </label>
      {description && <p className='mb-2 text-sm text-gray-500 dark:text-gray-400'>{description}</p>}

      {/* Method selector (hidden when converter-default is set — show label instead) */}
      {!hideMethodSelector
        ? (
          <div className='mb-3'>
            <label className='mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400'>Input method</label>
            <select
              value={selectedMethod}
              onChange={e => { setSelectedMethod(e.target.value); onChange(undefined); }}
              disabled={disabled}
              className='block w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
            >
              <option value=''>-- Select method --</option>
              {methods.map((m: any) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          )
        : selectedMethod && (
          <p className='mb-3 text-xs font-medium text-gray-500 dark:text-gray-400'>
            {methods.find((m: any) => m.id === selectedMethod)?.name || selectedMethod}
          </p>
        )}

      {/* Observation selector for the chosen method — visual stamp grid when
          the method has a registered cycle representation; dropdown otherwise. */}
      {selectedMethod && selectedMethod !== '_raw' && components.length > 0 && (
        <div className='space-y-3'>
          {components.map((comp: any) => {
            const compLabel = comp.label ? (localizeText(comp.label) || comp.field) : comp.field;
            const currentVal = isSingleComponent
              ? currentObservation
              : (typeof currentObservation === 'object' ? currentObservation?.[comp.field] : undefined);
            // Stamp grid only for the mucus component of cervical-fluid representations.
            const useStampGrid = isSingleComponent &&
              comp.field === 'mucus' &&
              isRepresentationAvailable(selectedMethod);

            const setValue = (val: any) => {
              if (isSingleComponent) {
                handleObservationSelect(val);
              } else {
                const obs = typeof currentObservation === 'object' ? { ...currentObservation } : {};
                obs[comp.field] = val;
                handleObservationSelect(obs);
              }
            };

            return (
              <div key={comp.field}>
                {!isSingleComponent && (
                  <label className='mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400'>{compLabel}</label>
                )}
                {useStampGrid
                  ? (
                    <StampGridPicker
                      representationId={selectedMethod}
                      options={comp.options}
                      value={currentVal}
                      disabled={disabled}
                      onChange={setValue}
                    />
                    )
                  : (
                    <select
                      value={currentVal ?? ''}
                      disabled={disabled}
                      onChange={e => {
                        const raw = e.target.value;
                        // Parse back to original type (number or string)
                        const opt = comp.options.find((o: any) => String(o.value) === raw);
                        const val = opt ? opt.value : raw;
                        setValue(val);
                      }}
                      className='block w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
                    >
                      <option value=''>--</option>
                      {comp.options.map((opt: any) => {
                        const optLabel = opt.label ? (localizeText(opt.label) || String(opt.value)) : String(opt.value);
                        return <option key={String(opt.value)} value={String(opt.value)}>{optLabel}</option>;
                      })}
                    </select>
                    )}
              </div>
            );
          })}
        </div>
      )}

      {/* _raw method: dimension stop dropdowns */}
      {selectedMethod === '_raw' && engine.dimensions && (
        <div className='space-y-3'>
          {engine.dimensionNames.map((dim: string) => {
            const dimDef = engine.dimensions[dim];
            if (!dimDef?.stops) return null;
            const dimLabel = dimDef.label ? (localizeText(dimDef.label) || dim) : dim;
            const currentDimVal = vectors?.[dim];

            const dimDesc = dimDef.description ? (localizeText(dimDef.description) || undefined) : undefined;

            return (
              <div key={dim}>
                <div className='mb-1 flex items-center'>
                  <label className='text-xs font-medium text-gray-500 dark:text-gray-400'>{dimLabel}</label>
                  {dimDesc && <InfoIcon description={dimDesc} />}
                </div>
                <select
                  value={currentDimVal ?? ''}
                  disabled={disabled}
                  onChange={e => handleRawDimChange(dim, parseFloat(e.target.value))}
                  className='block w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
                >
                  <option value=''>--</option>
                  {dimDef.stops.map((stop: any) => {
                    const stopLabel = stop.label ? (localizeText(stop.label) || String(stop.value)) : String(stop.value);
                    return <option key={stop.value} value={stop.value}>{stopLabel}</option>;
                  })}
                </select>
              </div>
            );
          })}
        </div>
      )}

      {/* Show current source info if value has source block */}
      {source && (
        <div className='mt-2 rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400'>
          Source: <span className='font-medium'>{String(source.sourceData)}</span>
          <span className='ml-1 text-gray-400'>({localizeText(engine.getMethodDef(source.key)?.name) || source.key})</span>
        </div>
      )}
    </div>
  );
}

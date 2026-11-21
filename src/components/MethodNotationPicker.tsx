import { useEffect, useMemo, useRef, useState } from 'react';
import { getHDSModel } from 'hds-lib';
import { registry, bleedingBandOf } from 'hds-feminine-cycle-ui';
import { NotationPicker } from './NotationPicker';
import { canonicalObservation } from '../schema/convertibleMethod';
import { buildNotation, itemValuesOf, candidateOf, recordOf, storedAnnotations, withAnnotations, type AnnotationPicks, type NotationModel, type BleedingEntryLike } from '../schema/methodNotation';
import { resolve, selectionOf, type Selection } from '../schema/notationFacets';
import { NOTATION_CONVERTER as CONVERTER, type MethodNotation } from './useMethodNotation';

export interface NotationState {
  /** Nothing picked. */
  empty: boolean;
  /** The picks resolve to exactly one record, with its required annotations (Creighton frequency). */
  valid: boolean;
  /** The record as written, e.g. "L 6C X2". */
  text?: string;
}

export interface MethodNotationPickerProps {
  /** From `useMethodNotation`, status 'ready'. */
  notation: MethodNotation;
  /** Form values by item key, HDSFormField shapes. Seeds the picks (edit, prefill). */
  values: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>, state: NotationState) => void;
  /** hds-feminine-cycle-ui `ComposeOptions['dayContext']`. */
  dayContext?: { isPeak?: boolean; peakCount?: number; inPeriod?: boolean };
  disabled?: boolean;
}

/** The stored record in `values`: its mucus code in the method, its bleeding letter. */
function storedRecord (model: NotationModel, methodDef: any, engine: any, values: Record<string, unknown>): { mucus?: string; bleeding?: string } {
  const out: { mucus?: string; bleeding?: string } = {};
  const content: any = model.mucusItemKey ? values[model.mucusItemKey] : undefined;
  if (content?.source?.key === model.methodId) {
    out.mucus = String(canonicalObservation(methodDef, content.source.sourceData));
  } else if (content?.vectors && engine) {
    try { const d = engine.fromVector(model.methodId, content.vectors)?.data; if (d != null) out.mucus = String(d); } catch { /* none */ }
  }
  const entries: BleedingEntryLike[] = [];
  for (const c of model.candidates) if (c.payload.bleeding && !entries.includes(c.payload.bleeding)) entries.push(c.payload.bleeding);
  for (const e of entries) {
    const v = values[e.itemKey];
    if (e.value != null && typeof v === 'number' && v > 0 && bleedingBandOf(v) === e.band) { out.bleeding = e.code; break; }
  }
  if (!out.bleeding) out.bleeding = entries.find(e => e.value == null && values[e.itemKey] != null && values[e.itemKey] !== false)?.code;
  return out;
}

/**
 * The person's charting method's notation picker for several items at once (mucus and bleeding). The partial picks
 * are kept here; `values` only seeds them. Every `onChange` patch has one entry per key of `notation.writes`, all
 * `undefined` while the picks are incomplete, so a host that saves only non-null values never saves a partial record.
 */
export function MethodNotationPicker ({ notation, values, onChange, dayContext, disabled }: MethodNotationPickerProps) {
  const [engine, setEngine] = useState<any>(null);
  useEffect(() => {
    getHDSModel().converters.ensureEngine(CONVERTER).then(setEngine).catch(() => setEngine(false));
  }, []);

  // `engine` false: unavailable; the stored mucus then seeds only when recorded in the method.
  const seed = useMemo(() => notation.model && engine !== null ? storedRecord(notation.model, notation.methodDef, engine, values) : null,
    [notation.model, engine]); // eslint-disable-line react-hooks/exhaustive-deps
  const model = useMemo(() => notation.model
    ? buildNotation({ methodDef: notation.methodDef, rep: registry.get(notation.model.methodId), itemKeys: notation.covers.length ? notation.covers : notation.writes, current: seed?.mucus, dayContext }) ?? notation.model
    : null, [notation, seed, dayContext]);

  const [selection, setSelection] = useState<Selection | null>(null);
  const [annotations, setAnnotations] = useState<AnnotationPicks>({});
  useEffect(() => {
    if (selection != null || !model || !seed) return;
    const c = candidateOf(model, seed.mucus, seed.bleeding);
    setSelection(c ? selectionOf(c, model.rows) : {});
    if (c?.payload.mucus != null && model.mucusItemKey) setAnnotations(storedAnnotations(model, values[model.mucusItemKey]));
  }, [model, seed]); // eslint-disable-line react-hooks/exhaustive-deps

  const seq = useRef(0);
  async function pick (next: Selection, nextAnnotations: AnnotationPicks) {
    if (!model) return;
    setSelection(next);
    setAnnotations(nextAnnotations);
    const resolved = resolve(model.candidates, model.rows, next);
    const record = recordOf(model, resolved, nextAnnotations);
    const state: NotationState = {
      empty: Object.keys(next).length === 0 && Object.keys(nextAnnotations).length === 0,
      valid: record.valid,
      text: record.valid ? record.text : undefined
    };
    const { mucus, items } = itemValuesOf(model, record.valid ? resolved!.payload : null);
    const patch: Record<string, unknown> = { ...items };
    const n = ++seq.current;
    if (mucus != null && model.mucusItemKey) {
      try {
        const event = await getHDSModel().converters.convertMethodToEvent(CONVERTER, model.methodId, mucus);
        patch[model.mucusItemKey] = withAnnotations(event.content, record.annotations);
      } catch (e) {
        console.error('Conversion error:', e);
        for (const k of Object.keys(patch)) patch[k] = undefined;
        state.valid = false;
      }
    }
    if (n === seq.current) onChange(patch, state);
  }

  if (!model || selection == null) return null;
  return (
    <NotationPicker
      model={model}
      selection={selection}
      onSelectionChange={s => pick(s, annotations)}
      annotations={annotations}
      onAnnotationsChange={a => pick(selection, a)}
      disabled={disabled}
    />
  );
}

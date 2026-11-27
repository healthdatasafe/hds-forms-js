/**
 * The notation picker of a charting method, built from the model data (plan 134).
 *
 * Everything method-specific is data: the offered codes and their `parts` and the rows and words of the method's
 * `notation` block (data-model converter pack), the sticker of a record and the bleeding letters (the method's
 * hds-feminine-cycle-ui spec). No code list, letter or rule lives here: a change in the model's generator changes
 * the choices with no change in this file.
 */
import { composeCellInput, stickerOf, type CellInput, type ComposeOptions, type Representation } from 'hds-feminine-cycle-ui';
import { offeredOptions } from './convertibleMethod';
import type { FacetValue, NotationCandidate, NotationRow } from './notationFacets';

/** The method's `notation` block (model-cervical-fluid `NotationDef`). */
export interface NotationDefLike {
  rows: Array<{ id: string; label?: any; parts?: string[]; annotation?: string }>;
  values: Record<string, Array<{ value: string | boolean; label?: any; code?: string; text?: string }>>;
  annotations?: NotationAnnotationLike[];
}

/** An annotation of the method's notation (model-cervical-fluid `NotationAnnotation`, e.g. Creighton frequency). */
export interface NotationAnnotationLike {
  id: string;
  label?: any;
  requiredAtEntry?: boolean;
  /** The codes it is neither asked with nor stored on (Creighton frequency: `0`, converter v2). Absent: every code. */
  notFor?: string[];
  values: Array<{ value: string; label?: any }>;
}

/** Whether an annotation applies to a record with this mucus code (`notFor`); none applies to a record without one. */
export function annotationAppliesTo (annotation: NotationAnnotationLike, mucus: string | undefined): boolean {
  return mucus != null && !(Array.isArray(annotation.notFor) && annotation.notFor.includes(mucus));
}

/** Picked annotation values, by annotation id. */
export type AnnotationPicks = Record<string, string>;

/** A bleeding letter (hds-feminine-cycle-ui `BleedingNotationEntry`). */
export interface BleedingEntryLike {
  code: string;
  label: any;
  band: string;
  itemKey: string;
  value?: number;
  /** The mucus part of the record: `none` the letter alone, `required` always with a code; omitted: either. */
  mucus?: 'none' | 'required';
}

/** What a candidate saves. */
export interface NotationPayload {
  /** The mucus code (an option value of the method). */
  mucus?: string;
  bleeding?: BleedingEntryLike;
  /** The record as written, e.g. "L 6C". */
  text: string;
  /** The words of the record: the bleeding label, the mucus option's label. */
  labels: any[];
}

export interface ChoiceDisplay {
  /** The button text ("6", "C/K", "VL"); none for a sticker. */
  text?: string;
  /** The word, for the accessible name and title. */
  label?: any;
  /** A sticker to draw (`RepresentationCell` input). */
  cell?: CellInput;
}

export interface NotationModel {
  methodId: string;
  rows: NotationRow[];
  candidates: Array<NotationCandidate & { payload: NotationPayload }>;
  /** Per facet, its values in the order of the choices. */
  order: Record<string, FacetValue[]>;
  /** Per facet, per value, what the choice shows. */
  display: Record<string, Record<FacetValue, ChoiceDisplay>>;
  /** The mucus item the picker enters, if any. */
  mucusItemKey?: string;
  /**
   * The annotations of a record that has a code (Creighton frequency), each on its own row, in the order of the
   * notation's rows. They never filter the candidates; a `requiredAtEntry` one completes the record.
   */
  annotations: NotationAnnotationLike[];
  /** Members of `itemKeys` the picker enters. */
  covers: string[];
  /** Every item key the picker may write: `covers` and the presence items of bleeding letters. */
  writes: string[];
}

export interface BuildNotationInput {
  methodDef: any;
  rep: Representation | undefined;
  itemKeys: string[];
  /** The stored mucus code, when editing (an `offer: false` code is kept as a candidate). */
  current?: string;
  dayContext?: ComposeOptions['dayContext'];
}

const STICKER_ROW = { en: 'Sticker', fr: 'Tampon', es: 'Pegatina', it: 'Bollino', 'pt-BR': 'Selo' };
const BLEEDING_ROW = { en: 'Bleeding', fr: 'Saignement', es: 'Sangrado', it: 'Sanguinamento', 'pt-BR': 'Sangramento' };

/** The facet value of a `parts` value: strings as they are, `true` as 'true'; `false` / null are absent. */
function facetOf (v: unknown): FacetValue | undefined {
  if (v === true) return 'true';
  if (typeof v === 'string' && v !== '') return v;
  return undefined;
}

/**
 * The picker model of a method, or null when it has no notation picker (then the host keeps today's fields).
 * Applies to a single-component method with a `notation` block whose offered options all carry `parts`, and a
 * registered representation.
 */
export function buildNotation ({ methodDef, rep, itemKeys, current, dayContext }: BuildNotationInput): NotationModel | null {
  const notation: NotationDefLike | undefined = methodDef?.notation;
  const components: any[] = methodDef?.components ?? [];
  if (!notation || !rep || components.length !== 1) return null;
  const options = offeredOptions(components[0].options, current);
  if (options.some((o: any) => o.offer !== false && !o.parts)) return null;

  const mucusItemKey = itemKeys.find(k => rep.spec.consumes.some(c => c.role === 'mucus' && c.itemKey === k));
  const bleedingEntries: BleedingEntryLike[] = rep.spec.bleedingNotation ?? [];
  const bleedingOffered = bleedingEntries.some(e => itemKeys.includes(e.itemKey));
  const bleedings = bleedingOffered ? bleedingEntries : [];
  if (!mucusItemKey && bleedings.length === 0) return null;

  // Rows without a `parts` array are skipped: a later row kind may carry something else (NotationDef contract).
  const notationRows = notation.rows.filter(r => Array.isArray(r.parts));
  const partKeys = notationRows.flatMap(r => r.parts as string[]);

  const mucusFacets = (o: any): Record<string, FacetValue> => {
    const out: Record<string, FacetValue> = {};
    for (const k of partKeys) {
      const f = facetOf(o.parts?.[k]);
      if (f != null) out[k] = f;
    }
    return out;
  };

  const syntheticEvents = (mucus?: string, bleeding?: BleedingEntryLike): any[] => {
    const evs: any[] = [];
    if (mucus != null && mucusItemKey) {
      evs.push({ time: 0, streamIds: [mucusItemKey], type: 'vulva-mucus-inspect/9d-vector', content: { source: { key: rep.spec.boundMethod.methodId, sourceData: { mucus } } } });
    }
    if (bleeding) {
      evs.push(bleeding.value != null
        ? { time: 0, streamIds: [bleeding.itemKey], type: 'ratio/proportion', content: bleeding.value }
        : { time: 0, streamIds: [bleeding.itemKey], type: 'activity/plain', content: null });
    }
    return evs;
  };

  const display: NotationModel['display'] = { sticker: {} };
  const stickerOrder: FacetValue[] = [];
  const candidates: NotationModel['candidates'] = [];
  const add = (mucusOpt: any | undefined, bleeding: BleedingEntryLike | undefined): void => {
    const mucus = mucusOpt ? String(mucusOpt.value) : undefined;
    const input = composeCellInput(syntheticEvents(mucus, bleeding), rep, { dayContext });
    const sticker = stickerOf(input);
    if (!(sticker in display.sticker)) {
      stickerOrder.push(sticker);
      display.sticker[sticker] = { cell: { ...input, code: undefined, letter: undefined } };
    }
    const facets: Record<string, FacetValue> = { sticker, ...(mucusOpt ? mucusFacets(mucusOpt) : {}) };
    if (bleeding) facets.bleeding = bleeding.code;
    candidates.push({
      id: [bleeding?.code, mucus].filter(Boolean).join(' '),
      facets,
      payload: {
        mucus,
        bleeding,
        text: [bleeding?.code, mucus].filter(Boolean).join(' '),
        labels: [bleeding?.label, mucusOpt?.label].filter(Boolean)
      }
    });
  };

  const mucusOptions = mucusItemKey ? options : [];
  for (const o of mucusOptions) add(o, undefined);
  for (const b of bleedings) {
    // A letter that needs a code is offered alone only when the host does not enter mucus.
    if (b.mucus !== 'required' || mucusOptions.length === 0) add(undefined, b);
    if (b.mucus !== 'none') for (const o of mucusOptions) add(o, b);
  }

  // Stickers in order of first appearance, those a bleeding letter draws last (dry, mucus, then red).
  const bleedingStickers = new Set(bleedingEntries.map(b => stickerOf(composeCellInput(syntheticEvents(undefined, b), rep, { dayContext }))));
  const rank = (s: FacetValue) => bleedingStickers.has(s) ? 1 : 0;
  const rows: NotationRow[] = [{ id: 'sticker', label: STICKER_ROW, facets: ['sticker'], derived: true }];
  const order: NotationModel['order'] = { sticker: [...stickerOrder].sort((a, b) => rank(a) - rank(b)) };
  if (bleedings.length) {
    rows.push({ id: 'bleeding', label: BLEEDING_ROW, facets: ['bleeding'] });
    order.bleeding = bleedings.map(b => b.code);
    display.bleeding = Object.fromEntries(bleedings.map(b => [b.code, { text: b.code, label: b.label }]));
  }
  if (mucusItemKey) {
    for (const r of notationRows) {
      rows.push({ id: r.id, label: r.label, facets: r.parts as string[] });
      for (const k of r.parts as string[]) {
        const values = notation.values[k] ?? [];
        order[k] = values.map(v => facetOf(v.value)).filter((f): f is FacetValue => f != null);
        display[k] = Object.fromEntries(values
          .filter(v => facetOf(v.value) != null)
          .map(v => [facetOf(v.value)!, { text: v.text ?? v.code ?? String(v.value), label: v.label }]));
      }
    }
  }

  // A sticker's text (its accessible name): the values it holds on the first row that has some ("0, 2, 2W, 4").
  for (const s of order.sticker) {
    const group = candidates.filter(c => c.facets.sticker === s);
    for (const r of rows.slice(1)) {
      const vals = r.facets.flatMap(f => order[f].filter(v => group.some(c => c.facets[f] === v)).map(v => display[f][v]?.text ?? v));
      if (vals.length) { display.sticker[s].text = vals.join(', '); break; }
    }
  }

  // Annotation rows: a row with `annotation` naming an entry of `notation.annotations` (NotationDef contract).
  const annotations: NotationAnnotationLike[] = mucusItemKey
    ? notation.rows
      .map(r => r.annotation ? notation.annotations?.find(a => a.id === r.annotation) : undefined)
      .filter((a): a is NotationAnnotationLike => !!a && Array.isArray(a.values) && a.values.length > 0)
    : [];

  const covers = itemKeys.filter(k => k === mucusItemKey || bleedings.some(b => b.itemKey === k));
  const writes = [...new Set([...covers, ...bleedings.map(b => b.itemKey)])];
  return { methodId: rep.spec.boundMethod.methodId, rows, candidates, order, display, mucusItemKey, annotations, covers, writes };
}

/**
 * Whether the record is complete and how it is written: a resolved candidate, plus every required annotation that
 * applies to its code ("L 6C X2"). Annotations of a record without a code (a bleeding letter alone) or of a code in
 * their `notFor` (Creighton `0`) are left out, even when picked.
 */
export function recordOf (model: NotationModel, resolved: { payload: NotationPayload } | null, picks: AnnotationPicks): { valid: boolean; text?: string; annotations?: AnnotationPicks } {
  if (!resolved) return { valid: false };
  const mucus = resolved.payload.mucus;
  if (mucus == null) return { valid: true, text: resolved.payload.text };
  const applying = model.annotations.filter(a => annotationAppliesTo(a, mucus));
  const annotations: AnnotationPicks = {};
  for (const a of applying) {
    const v = picks[a.id];
    if (v != null && a.values.some(x => x.value === v)) annotations[a.id] = v;
  }
  const valid = applying.every(a => !a.requiredAtEntry || annotations[a.id] != null);
  const text = [resolved.payload.text, ...applying.map(a => annotations[a.id]).filter(Boolean)].join(' ');
  return { valid, text, annotations: Object.keys(annotations).length ? annotations : undefined };
}

/** The annotations stored on a mucus content of the method (`source.annotations`), those the model knows. */
export function storedAnnotations (model: NotationModel, content: any): AnnotationPicks {
  const out: AnnotationPicks = {};
  const stored = content?.source?.key === model.methodId ? content.source.annotations : undefined;
  if (!stored || typeof stored !== 'object') return out;
  for (const a of model.annotations) {
    const v = stored[a.id];
    if (typeof v === 'string' && a.values.some(x => x.value === v)) out[a.id] = v;
  }
  return out;
}

/** The converter content with the record's annotations in `source.annotations` (none: the content as it is). */
export function withAnnotations (content: any, annotations: AnnotationPicks | undefined): any {
  if (!annotations || !content?.source) return content;
  return { ...content, source: { ...content.source, annotations: { ...annotations } } };
}

/**
 * What a record saves, per item of `model.writes`: the bleeding flow (a number), `true` for a presence item,
 * `undefined` for no value. The mucus code is returned apart: the host turns it into the converter content.
 */
export function itemValuesOf (model: NotationModel, payload: NotationPayload | null): { mucus?: string; items: Record<string, number | true | undefined> } {
  const items: Record<string, number | true | undefined> = Object.fromEntries(model.writes.map(k => [k, undefined]));
  if (!payload) return { items };
  if (payload.bleeding) items[payload.bleeding.itemKey] = payload.bleeding.value ?? true;
  return { mucus: payload.mucus, items };
}

/** The candidate of a stored record (edit, prefill): the mucus code and / or the bleeding letter. */
export function candidateOf (model: NotationModel, mucus: string | undefined, bleedingCode: string | undefined): NotationModel['candidates'][number] | null {
  if (mucus == null && bleedingCode == null) return null;
  return model.candidates.find(c => c.payload.mucus === mucus && c.payload.bleeding?.code === bleedingCode) ?? null;
}

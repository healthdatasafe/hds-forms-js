import { localizeText } from 'hds-lib';

type localizableText = { en: string; fr?: string; es?: string };

// --- Type definitions ---

interface SelectOption {
  value: string | number;
  label: localizableText;
}

interface ConverterEngine {
  key: string;
  version: string;
  models: string;
}

interface BaseItemData {
  type: 'checkbox' | 'date' | 'text' | 'number' | 'select' | 'composite' | 'datasource-search' | 'convertible' | 'slider';
  label: localizableText;
  description?: localizableText;
  canBeNull?: boolean;
  streamId?: string;
  eventType?: string;
  'converter-engine'?: ConverterEngine;
}

interface CheckboxData extends BaseItemData {
  type: 'checkbox';
}

interface DateData extends BaseItemData {
  type: 'date';
}

interface TextData extends BaseItemData {
  type: 'text';
}

interface NumberData extends BaseItemData {
  type: 'number';
  /** Lower bound in the raw (stored) scale. */
  min?: number;
  /** Upper bound in the raw scale. */
  max?: number;
  /** Step increment in the raw scale. */
  step?: number;
  number?: {
    display?: ValueDisplay;
  };
}

interface SelectData extends BaseItemData {
  type: 'select';
  options: SelectOption[];
}

interface CompositeData extends BaseItemData {
  type: 'composite';
  composite: Record<string, ItemData>;
}

interface DatasourceSearchData extends BaseItemData {
  type: 'datasource-search';
  datasource: string;
}

interface ConvertibleData extends BaseItemData {
  type: 'convertible';
  'converter-engine': ConverterEngine;
}

/** A per-value tick-label entry on a slider. Value keyed by the raw numeric value. */
export interface SliderLabel {
  label: localizableText;
  description?: localizableText;
}

/**
 * Display-layer knobs on a numeric value — affect how the raw (stored) value is
 * shown to the user only. Storage is always the raw value in the item's eventType.
 *
 * Used by both `slider` and `number` items. On a slider the control itself works in
 * the raw scale and only the readout is scaled; on a number input the user types the
 * *displayed* value, so the multiplier is applied bidirectionally (typed ÷ multiplier
 * is what gets stored).
 */
export interface ValueDisplay {
  /** Multiplier applied to the raw value for display. Default 1. E.g. 100 for a 0..1 raw → 0..100 displayed. */
  multiplier?: number;
  /**
   * Decimal places shown. On a slider, defaults to 0 when multiplier >= 10, else inferred from step.
   * On a number input there is no default — the scaled value is shown as typed/stored, so that
   * fractional lab values (HbA1c 5.4%) are not truncated. Set it only to force fixed formatting.
   */
  precision?: number;
  /** Appended to the displayed value (e.g. '%'). */
  suffix?: localizableText;
}

/** @deprecated Use {@link ValueDisplay} — kept as an alias so existing imports keep working. */
export type SliderDisplay = ValueDisplay;

interface SliderData extends BaseItemData {
  type: 'slider';
  /** Lower bound in the raw (stored) scale. */
  min: number;
  /** Upper bound in the raw scale. */
  max: number;
  /** Step increment in the raw scale. Default 1. */
  step?: number;
  slider?: {
    orientation?: 'horizontal' | 'vertical';
    labels?: Record<string | number, SliderLabel>;
    display?: ValueDisplay;
  };
}

export type ItemData = CheckboxData | DateData | TextData | NumberData | SelectData | CompositeData | DatasourceSearchData | ConvertibleData | SliderData;

export interface JSONSchema {
  title: string;
  description?: string;
  type?: 'boolean' | 'string' | 'number' | 'object';
  format?: string;
  dateSaveFormat?: string;
  minLength?: number;
  oneOf?: Array<{ const: string | number; title: string }>;
  properties?: Record<string, JSONSchema>;
  required?: string[];
}

const l = localizeText;

type SchemaAction = (schema: JSONSchema, v: ItemData) => void;

const SCHEMAS_PER_TYPE: Record<string, SchemaAction> = { checkbox, date, text, number, select, composite, 'datasource-search': datasourceSearch, convertible, slider };

export function schemaFor (v: ItemData): JSONSchema {
  const schema: JSONSchema = {
    title: l(v.label) || ''
  };
  if (v.description != null) {
    schema.description = l(v.description) || undefined;
  }
  const action = SCHEMAS_PER_TYPE[v.type];
  if (action == null) {
    throw new Error(`Cannot find schema for type: "${v.type}"`);
  }
  action(schema, v);
  return schema;
}

// -------- schemas per types ------------ //

function checkbox (schema: JSONSchema, _v: ItemData): void {
  schema.type = 'boolean';
}

function date (schema: JSONSchema, _v: ItemData): void {
  schema.type = 'string';
  schema.format = 'date';
  schema.dateSaveFormat = 'YYYY-MM-DD';
}

function text (schema: JSONSchema, v: ItemData): void {
  schema.type = 'string';
  if (v.canBeNull !== true) schema.minLength = 1;
}

function number (schema: JSONSchema, _v: ItemData): void {
  schema.type = 'number';
}

function select (schema: JSONSchema, v: ItemData): void {
  const selectData = v as SelectData;
  const foundNaN = selectData.options.find(option => isNaN(option.value as number));
  const options = selectData.options.map((option) => ({ const: option.value, title: l(option.label) || '' }));
  schema.type = foundNaN ? 'string' : 'number';
  schema.oneOf = options;
}

function datasourceSearch (schema: JSONSchema, _v: ItemData): void {
  schema.type = 'object';
}

function composite (schema: JSONSchema, v: ItemData): void {
  const compositeData = v as CompositeData;
  schema.type = 'object';
  schema.properties = {};
  schema.required = [];
  for (const [key, value] of Object.entries(compositeData.composite)) {
    schema.properties[key] = schemaFor(value);
    if (value.canBeNull !== true) schema.required.push(key);
  }
}

function convertible (schema: JSONSchema, _v: ItemData): void {
  schema.type = 'object';
}

function slider (schema: JSONSchema, _v: ItemData): void {
  // Slider is just a numeric input at the storage layer — display is UI-only.
  schema.type = 'number';
}

import { localizeText } from 'hds-lib';

type localizableText = { en: string; fr?: string; es?: string };

// --- Type definitions ---

interface SelectOption {
  value: string | number;
  label: localizableText;
}

interface BaseItemData {
  type: 'checkbox' | 'date' | 'text' | 'number' | 'select' | 'composite' | 'datasource-search';
  label: localizableText;
  description?: localizableText;
  canBeNull?: boolean;
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

export type ItemData = CheckboxData | DateData | TextData | NumberData | SelectData | CompositeData | DatasourceSearchData;

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

const SCHEMAS_PER_TYPE: Record<string, SchemaAction> = { checkbox, date, text, number, select, composite, 'datasource-search': datasourceSearch };

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

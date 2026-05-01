// Components
export { HDSFormField } from './components/HDSFormField';
export type { FieldLabelOverrides } from './components/HDSFormField';
export { HDSFormSection } from './components/HDSFormSection';
export type { ItemCustomization } from './components/HDSFormSection';
export { EntryList } from './components/EntryList';
export { ReminderEditor } from './components/ReminderEditor';
export type { ReminderEditorConfig } from './components/ReminderEditor';
export { DatasetSearch } from './components/fields/DatasetSearch';
export { ItemSearchPicker } from './components/ItemSearchPicker';
export type { ItemSearchPickerProps } from './components/ItemSearchPicker';
export { EventTimeInput } from './components/EventTimeInput';
export type { EventTimeInputProps } from './components/EventTimeInput';
export { EventDurationInput } from './components/EventDurationInput';
export type { EventDurationInputProps, EventDuration, DurationMode } from './components/EventDurationInput';
export { default as FormBuilder } from './components/FormBuilder';
export type { FormBuilderProps, FormBuilderLabels } from './components/FormBuilder';
export { REPEATABLE_LABELS, REPEATABLE_OPTIONS, repeatableLabel, getItemGroup } from './formBuilderUtils';

// Schema utilities
export { schemaFor } from './schema/schemas';
export { jsonFormForItemDef } from './schema/itemDefToSchema';

// Event data conversion
export { prefillFromEvents, matchEventsToItemDefs, formDataToActions, formDataToEventBatch } from './schema/eventData';

// Plan 45 — custom-field bridge (CustomFieldDeclaration → form-engine entries)
export {
  CUSTOM_FIELD_KEY_PREFIX,
  customFieldFormKey,
  isCustomFieldKey,
  buildCustomFieldEntries
} from './schema/customFields';

// Companion field utilities (datasource-search)
export { getCompanionSchema, extractCompanionDefaults, getEnumLabel, keyToLabel } from './schema/companionFields';

// Types
export type { ItemData, JSONSchema } from './schema/schemas';
export type { ItemDef, ItemDefData, JsonFormForItemDefResult } from './schema/itemDefToSchema';
export type { FieldProps, SectionEntry } from './types';
export type { CompanionSchema, CompanionProperty } from './schema/companionFields';

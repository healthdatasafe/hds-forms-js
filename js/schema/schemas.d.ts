type localizableText = {
    en: string;
    fr?: string;
    es?: string;
};
interface SelectOption {
    value: string | number;
    label: localizableText;
}
interface BaseItemData {
    type: 'checkbox' | 'date' | 'text' | 'number' | 'select' | 'composite';
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
export type ItemData = CheckboxData | DateData | TextData | NumberData | SelectData | CompositeData;
export interface JSONSchema {
    title: string;
    description?: string;
    type?: 'boolean' | 'string' | 'number' | 'object';
    format?: string;
    dateSaveFormat?: string;
    minLength?: number;
    oneOf?: Array<{
        const: string | number;
        title: string;
    }>;
    properties?: Record<string, JSONSchema>;
    required?: string[];
}
export declare function schemaFor(v: ItemData): JSONSchema;
export {};

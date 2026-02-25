import { type ItemData, type JSONSchema } from './schemas';
type localizableText = {
    en: string;
    fr?: string;
    es?: string;
};
interface VariationOption {
    value: string;
    label: localizableText;
}
interface Variations {
    eventType?: {
        label: localizableText;
        options: VariationOption[];
    };
}
export interface ItemDefData {
    type: ItemData['type'];
    label: localizableText;
    description?: localizableText;
    canBeNull?: boolean;
    eventType?: string;
    options?: Record<string | number, unknown>;
    variations?: Variations;
    composite?: Record<string, ItemData>;
}
export interface ItemDef {
    data: ItemDefData;
    eventTemplate: () => Record<string, unknown>;
}
export interface JsonFormForItemDefResult {
    schema: JSONSchema | Record<string, unknown>;
    eventDataForFormData: (formData: Record<string, unknown>) => Record<string, unknown> | null;
}
export declare function jsonFormForItemDef(itemDef: ItemDef): JsonFormForItemDefResult;
export {};

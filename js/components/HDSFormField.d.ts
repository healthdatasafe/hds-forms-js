import type { ItemData } from '../schema/schemas';
interface HDSFormFieldProps {
    /** Raw item data (from itemDef.data or composite sub-field) */
    itemData: ItemData;
    value: any;
    onChange: (value: any) => void;
    required?: boolean;
    disabled?: boolean;
}
export declare function HDSFormField({ itemData, value, onChange, required, disabled }: HDSFormFieldProps): import("react/jsx-runtime").JSX.Element;
export {};

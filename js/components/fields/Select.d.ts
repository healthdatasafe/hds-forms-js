import type { FieldProps } from '../../types';
interface SelectFieldProps extends FieldProps {
    options: Array<{
        value: string | number;
        label: string;
    }>;
}
export declare function Select({ label, description, value, onChange, options, required, disabled }: SelectFieldProps): import("react/jsx-runtime").JSX.Element;
export {};

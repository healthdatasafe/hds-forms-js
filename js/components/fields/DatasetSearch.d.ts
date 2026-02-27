import type { FieldProps } from '../../types';
interface DatasetSearchProps extends FieldProps {
    datasource: string;
}
export declare function DatasetSearch({ label, description, value, onChange, required, disabled, datasource }: DatasetSearchProps): import("react/jsx-runtime").JSX.Element;
export {};

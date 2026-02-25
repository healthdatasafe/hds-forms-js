import type { FieldProps } from '../../types';
import type { ItemData } from '../../schema/schemas';
interface CompositeFieldProps extends FieldProps {
    composite: Record<string, ItemData>;
}
export declare function Composite({ label, description, value, onChange, composite, disabled }: CompositeFieldProps): import("react/jsx-runtime").JSX.Element;
export {};

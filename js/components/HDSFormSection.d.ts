import type { SectionEntry } from '../types';
type localizableText = {
    en: string;
    fr?: string;
    es?: string;
};
interface SectionDef {
    key?: string;
    type?: 'permanent' | 'recurring';
    itemKeys: string[];
    label?: localizableText;
}
interface HDSFormSectionProps {
    section: SectionDef;
    values?: Record<string, any>;
    onSubmit: (formData: Record<string, any>) => void;
    disabled?: boolean;
    submitLabel?: string;
    entries?: SectionEntry[];
    onEditEntry?: (index: number) => void;
    onDeleteEntry?: (index: number) => void;
}
export declare function HDSFormSection({ section, values: initialValues, onSubmit, disabled, submitLabel, entries, onEditEntry, onDeleteEntry }: HDSFormSectionProps): import("react/jsx-runtime").JSX.Element;
export {};

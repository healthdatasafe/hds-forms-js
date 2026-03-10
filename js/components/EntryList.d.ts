import type { SectionEntry } from '../types';
interface EntryListProps {
    entries: SectionEntry[];
    itemKeys: string[];
    fieldLabels: Record<string, string>;
    onEdit: (index: number) => void;
    onDelete: (index: number) => void;
}
export declare function EntryList({ entries, itemKeys, fieldLabels, onEdit, onDelete }: EntryListProps): import("react/jsx-runtime").JSX.Element | null;
export {};

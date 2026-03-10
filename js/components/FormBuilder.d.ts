import type { ReactNode } from 'react';
export interface FormBuilderLabels {
    searchItems: string;
    selectSectionToAdd: string;
    addPermanentSection: string;
    addRecurringSection: string;
    sectionName: string;
    clickToAdd: string;
    noItems: string;
    customize: string;
    repeatable: string;
    preview: string;
    addSectionsToPreview: string;
    published: string;
}
type PreviewMode = 'preview' | 'json';
export interface FormBuilderProps {
    /** The CollectorRequest to build upon (mutated in place) */
    request: any;
    /** Disable all editing (for published forms) */
    readOnly?: boolean;
    /** Called whenever the form is modified */
    onDirty?: () => void;
    /** Show ReminderEditor in item customization panel */
    showReminders?: boolean;
    /** Override default English labels (for i18n) */
    labels?: Partial<FormBuilderLabels>;
    /** Default preview mode (null = collapsed) */
    defaultPreviewMode?: PreviewMode | null;
    /** Rendered before the item browser (e.g. "Published" badge) */
    headerSlot?: ReactNode;
    /** Rendered above sections (e.g. title, description, consent inputs) */
    metadataSlot?: ReactNode;
    /** Rendered between sections and preview (e.g. save/publish buttons) */
    actionSlot?: ReactNode;
}
export default function FormBuilder({ request, readOnly, onDirty, showReminders, labels: labelOverrides, defaultPreviewMode, headerSlot, metadataSlot, actionSlot }: FormBuilderProps): import("react/jsx-runtime").JSX.Element;
export {};

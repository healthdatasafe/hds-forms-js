export interface ReminderEditorConfig {
    enabled?: boolean;
    cooldown?: string;
    expectedInterval?: {
        min?: string;
        max?: string;
    };
    relativeTo?: string;
    relativeDays?: number[];
    importance?: 'may' | 'should' | 'must';
}
interface ReminderEditorProps {
    /** Default reminder from data-model (itemDef.reminder), read-only reference */
    defaultReminder: ReminderEditorConfig | null;
    /** Current collector override (from itemCustomizations.reminder) */
    override: Partial<ReminderEditorConfig> | undefined;
    /** Called when the doctor changes the override */
    onChange: (reminder: Partial<ReminderEditorConfig> | undefined) => void;
    /** Available item keys for relativeTo references (other items in form) */
    availableItemKeys?: Array<{
        key: string;
        label: string;
    }>;
}
export declare function ReminderEditor({ defaultReminder, override, onChange, availableItemKeys }: ReminderEditorProps): import("react/jsx-runtime").JSX.Element;
export {};

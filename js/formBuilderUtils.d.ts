export declare const REPEATABLE_LABELS: Record<string, string>;
export declare function repeatableLabel(value: string): string;
export declare const REPEATABLE_OPTIONS: {
    value: string;
    label: string;
}[];
/** Group items by top-level key prefix (body, profile, fertility, ...) */
export declare function getItemGroup(itemKey: string): string;

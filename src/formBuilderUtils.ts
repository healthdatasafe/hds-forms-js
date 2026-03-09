export const REPEATABLE_LABELS: Record<string, string> = {
  once: 'Once',
  any: 'Any time',
  P1D: 'Daily',
  P1W: 'Weekly',
  P1M: 'Monthly',
  unlimited: 'Unlimited'
};

export function repeatableLabel (value: string): string {
  return REPEATABLE_LABELS[value] || value;
}

export const REPEATABLE_OPTIONS = [
  { value: 'once', label: 'Once' },
  { value: 'any', label: 'Any time' },
  { value: 'P1D', label: 'Daily' },
  { value: 'P1W', label: 'Weekly' },
  { value: 'P1M', label: 'Monthly' },
  { value: 'unlimited', label: 'Unlimited' }
];

/** Group items by top-level key prefix (body, profile, fertility, ...) */
export function getItemGroup (itemKey: string): string {
  if (!itemKey) return 'other';
  return itemKey.split('-')[0];
}

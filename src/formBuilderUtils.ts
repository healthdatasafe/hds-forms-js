import { getHDSModel, localizeText } from 'hds-lib';
import { REPEATABLE_TEXTS } from './components/builderTexts';

/** The English labels, by `repeatable` value; `repeatableLabel` gives the one in the current language */
export const REPEATABLE_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(REPEATABLE_TEXTS).map(([value, text]) => [value, text.en])
);

export function repeatableLabel (value: string): string {
  const text = (REPEATABLE_TEXTS as Record<string, { en: string; fr: string } | undefined>)[value];
  return text ? localizeText(text) : value;
}

/** The `repeatable` values, in the order they are offered, with their English labels */
export const REPEATABLE_OPTIONS = Object.entries(REPEATABLE_TEXTS).map(([value, text]) => ({ value, label: text.en as string }));

/** Group items by top-level key prefix (body, profile, fertility, ...) */
export function getItemGroup (itemKey: string): string {
  if (!itemKey) return 'other';
  return itemKey.split('-')[0];
}

/** The group's name in the current language: the label of the stream its items are under, else its name, else the group itself */
export function itemGroupLabel (group: string): string {
  const stream = getHDSModel().streams?.getDataById(group, false);
  return stream?.label ? localizeText(stream.label) : stream?.name ?? group;
}

import { localizeText } from 'hds-lib';

type Text = { readonly en: string; readonly [lang: string]: string };

/** A text with its `{name}` placeholders replaced; one with no value stays as it is */
export const fill = (text: string, values: Record<string, unknown>): string =>
  text.replace(/\{(\w+)\}/g, (all, k) => (values[k] != null ? String(values[k]) : all));

/** Every text of a table in the current language, by its key */
export function localizeTable<K extends string> (table: Readonly<Record<K, Text>>): Record<K, string> {
  const out = {} as Record<K, string>;
  for (const key of Object.keys(table) as K[]) out[key] = localizeText(table[key]);
  return out;
}

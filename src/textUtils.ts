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

/** The language `localizeText` shows a text in, the one an edit of it goes to; `en` for a text with no language */
export function shownLang (text: Readonly<Record<string, string | undefined>> | null | undefined): string {
  const langs = Object.keys(text ?? {}).filter((lang) => text![lang] != null);
  if (langs.length === 0) return 'en';
  return localizeText(Object.fromEntries(langs.map((lang) => [lang, lang])));
}

/** `text` with the language shown set to `value`, the other languages kept */
export function withShownText (text: Readonly<Record<string, string | undefined>> | null | undefined, value: string): { en: string } & Record<string, string> {
  return { ...text, [shownLang(text)]: value } as { en: string } & Record<string, string>;
}

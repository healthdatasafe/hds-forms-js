/**
 * Plan 45 — bridge between `appTemplates.CustomFieldDeclaration[]` and the
 * `formDataToActions` / `prefillFromEvents` pipeline.
 *
 * Custom-field form values live under `__cf::{templateId}::{key}` so they don't
 * collide with canonical itemKeys. This helper converts a section's
 * customFieldKeys[] + customFields[] into the same `{ key, itemDef }` shape the
 * existing pipeline already understands.
 */

import { appTemplates } from 'hds-lib';
import type { CustomFieldDeclaration, VirtualItemDef } from 'hds-lib';
import type { ItemDef } from './itemDefToSchema';

/** Form-key prefix for custom fields. */
export const CUSTOM_FIELD_KEY_PREFIX = '__cf::';

export function customFieldFormKey (decl: CustomFieldDeclaration): string {
  return `${CUSTOM_FIELD_KEY_PREFIX}${decl.def.templateId}::${decl.def.key}`;
}

/** True when a form-data key is a custom-field value. */
export function isCustomFieldKey (key: string): boolean {
  return key.startsWith(CUSTOM_FIELD_KEY_PREFIX);
}

/**
 * Build `{ key, itemDef }` entries for the form-engine pipeline from a section's
 * custom-field declarations. Pass these into `prefillFromEvents` /
 * `formDataToActions` alongside canonical entries — the pipeline doesn't care
 * whether an itemDef is canonical or virtual; both expose `data.streamId`,
 * `data.eventType`, and `eventTemplate()`.
 */
export function buildCustomFieldEntries (
  customFieldKeys: string[] | undefined,
  customFields: CustomFieldDeclaration[] | undefined
): Array<{ key: string, itemDef: ItemDef }> {
  if (!customFieldKeys || customFieldKeys.length === 0) return [];
  if (!customFields || customFields.length === 0) return [];
  const entries: Array<{ key: string, itemDef: ItemDef }> = [];
  for (const cfKey of customFieldKeys) {
    const decl = customFields.find((c) => c.def.key === cfKey);
    if (!decl) continue;
    const virtual: VirtualItemDef = appTemplates.customFieldDeclarationToVirtualItem(decl);
    entries.push({
      key: customFieldFormKey(decl),
      itemDef: virtual as unknown as ItemDef
    });
  }
  return entries;
}

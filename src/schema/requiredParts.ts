import { eventTypeObjectSchema } from '../components/fields/allOrNothing';
import type { ItemData } from './schemas';

function isBlank (v: any): boolean {
  return v == null || v === '' || (Array.isArray(v) ? v.length === 0 : typeof v === 'object' && Object.keys(v).length === 0);
}

/**
 * The parts of a composite item's value that its eventType requires and that are blank (allergy-coded: `allergen`,
 * `status`). `[]` for any other item type. The parts are the eventType's `required` keys that are form fields; with
 * no eventType schema, the parts not marked `canBeNull`, as the field marks them on screen. A host disables its save
 * while this is not empty, so an event that breaks the item's definition is never written (B-2026-11-21-6).
 */
export function missingRequiredParts (itemData: ItemData | undefined, value: any): string[] {
  if ((itemData as any)?.type !== 'composite') return [];
  const composite: Record<string, any> = (itemData as any).composite ?? {};
  const schemaRequired: string[] | undefined = eventTypeObjectSchema((itemData as any).eventType)?.required;
  const keys = Array.isArray(schemaRequired)
    ? schemaRequired.filter((k) => k in composite)
    : Object.keys(composite).filter((k) => composite[k]?.canBeNull !== true);
  return keys.filter((k) => isBlank(value?.[k]));
}

import { HDSSettings, localizeText, CERVICAL_FLUID_METHOD_KEY, CERVICAL_FLUID_METHOD_LEGACY_KEY } from 'hds-lib';

/**
 * Method choice for `convertible` fields (euclidian-distance converter engine).
 *
 * The person's charting method is a dynamic HDSSettings key. Its canonical form is
 * `preferred-input-<itemKey>` (the HDS item key, e.g. `body-vulva-mucus-inspect`); hds-forms-js
 * used to read the converter-model form `preferred-input-<models>` (`preferred-input-cervical-fluid`),
 * which some accounts hold and which stays a read-only fallback. For cervical fluid, hds-lib names
 * both keys (`CERVICAL_FLUID_METHOD_KEY`, `CERVICAL_FLUID_METHOD_LEGACY_KEY`).
 */

/** Settings keys to read, in order: canonical first, legacy last. */
export function preferredMethodKeys (itemKey?: string, modelsKey?: string): string[] {
  const keys: string[] = [];
  if (itemKey) keys.push(`preferred-input-${itemKey}`);
  if (modelsKey === 'cervical-fluid') {
    keys.push(CERVICAL_FLUID_METHOD_KEY, CERVICAL_FLUID_METHOD_LEGACY_KEY);
  } else if (modelsKey) {
    keys.push(`preferred-input-${modelsKey}`);
  }
  return [...new Set(keys)];
}

/** The person's preferred input method, or `undefined` when none is set (or settings are not hooked). */
export function readPreferredMethod (itemKey?: string, modelsKey?: string): string | undefined {
  if (!HDSSettings.isHooked) return undefined;
  for (const key of preferredMethodKeys(itemKey, modelsKey)) {
    let v: unknown;
    try {
      v = HDSSettings.get(key);
    } catch {
      continue;
    }
    if (typeof v === 'string' && v !== '') return v;
  }
  return undefined;
}

/** True when `methodId` is one the engine can render (`_raw` is always available). */
export function isKnownMethod (methodId: string | undefined | null, methodIds: string[]): methodId is string {
  return !!methodId && (methodId === '_raw' || methodIds.includes(methodId));
}

/**
 * The method the field opens in. The person's preferred method wins over the method the value
 * was recorded in (`source.key`): opening a Mira observation must not switch a Creighton chart
 * to Mira (B-2026-10-26-10). The recorded method is used only when no preference is set.
 */
export function initialConvertibleMethod ({ preferred, sourceKey, methodIds }: { preferred?: string; sourceKey?: string; methodIds: string[] }): string {
  if (isKnownMethod(preferred, methodIds)) return preferred;
  if (isKnownMethod(sourceKey, methodIds)) return sourceKey;
  return '';
}

/**
 * A stored observation of a single-component method as one of its option values.
 * - Bridges store it as `{ <field>: value }` (e.g. `{ mucus: '10KL' }`): the value is unwrapped.
 * - A case-insensitive method (Creighton) may hold another spelling (`'6ck'`): the option's own value is returned.
 * Anything else (multi-component, unknown value) comes back unchanged.
 */
export function canonicalObservation (methodDef: any, data: any): any {
  const components: any[] = methodDef?.components || [];
  if (components.length !== 1) return data;
  const field = components[0].field;
  const value = data !== null && typeof data === 'object' && field in data ? data[field] : data;
  const options: any[] = components[0].options || [];
  const exact = options.find((o: any) => o.value === value);
  if (exact) return exact.value;
  if (methodDef.caseInsensitive && typeof value === 'string') {
    const folded = options.find((o: any) => typeof o.value === 'string' && o.value.toUpperCase() === value.toUpperCase());
    if (folded) return folded.value;
  }
  return value;
}

/**
 * Options a picker shows: those the method offers (`offer: false` hides one: Creighton incomplete codes, plan 131), plus the
 * stored value when it is a hidden one, so an existing entry still reads as selected.
 */
export function offeredOptions (options: any[] | undefined, current: any): any[] {
  return (options || []).filter((o: any) => o.offer !== false || o.value === current);
}

/** Localized label of an observation in a method ("Creamy"); falls back to the raw value. */
export function observationLabel (methodDef: any, data: any): string {
  const components: any[] = methodDef?.components || [];
  const labelOf = (comp: any, v: any): string => {
    const opt = comp?.options?.find((o: any) => o.value === v);
    return opt?.label ? (localizeText(opt.label) || String(v)) : String(v);
  };
  if (components.length === 1) data = canonicalObservation(methodDef, data);
  if (components.length === 1 && (data == null || typeof data !== 'object')) return labelOf(components[0], data);
  if (components.length > 1 && data && typeof data === 'object') {
    return components
      .filter(c => data[c.field] != null)
      .map(c => labelOf(c, data[c.field]))
      .join(' · ');
  }
  return typeof data === 'object' ? JSON.stringify(data) : String(data);
}

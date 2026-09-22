import type { ItemDef } from './itemDefToSchema';

/**
 * `ratio/generic` is a LEGACY Pryv eventType whose JSON Schema is an object with two
 * required properties, `{ value, relativeTo }`. An item that declares it with
 * `type: select` lists scalar `options[].value` entries, so those are **numerators**:
 * the content that must be stored is `{ value: <chosen option>, relativeTo: <denominator> }`.
 *
 * The denominator is `max(option values)`. That rule used to live ONLY here, computed
 * inline in two places (`eventData.ts` and `itemDefToSchema.ts`), while other consumers
 * hardcoded a constant instead: bridge-chartneo carried `2`, bridge-cycles-files carried
 * `10`. All were correct, because all equalled the max. The hazard was the next edit: add
 * an option and this library would start writing the new maximum while a hardcoding
 * consumer kept writing the old, so one item would carry two different denominators and
 * `value / relativeTo` would stop being comparable across writers, with nothing erroring.
 *
 * data-model **3.9.0** closed that by making the model own the rule: it derives, validates
 * and publishes the value as the item's `ratioRelativeTo`. Read it.
 * (data-model plan 100, finding F1; see its AGENTS.md "ratio/generic stores an OBJECT".)
 */

let warnedLegacyDerivation = false;

/** Is this item a `select` whose event type is `ratio/generic`? */
export function isSelectRatioGeneric (itemDef: ItemDef, eventType: string): boolean {
  return itemDef.data.type === 'select' && eventType === 'ratio/generic';
}

/**
 * The denominator to store in `content.relativeTo`.
 *
 * Prefers the model's published `ratioRelativeTo`. Falls back to deriving it for a pack
 * older than 3.9.0, which does not publish the field: on such a pack no consumer can read
 * it, so deriving is the correct legacy behaviour rather than a second source of truth.
 * The fallback warns once so the stale pack is visible rather than silent.
 */
export function ratioGenericRelativeTo (itemDef: ItemDef): number {
  const published = (itemDef.data as any).ratioRelativeTo;
  if (typeof published === 'number' && published > 0) return published;

  if (!warnedLegacyDerivation) {
    warnedLegacyDerivation = true;
    const name = (itemDef as any).key ?? (itemDef.data as any)?.streamId ?? 'unknown';
    console.warn(
      '[hds-forms] item "' + name + '" does not publish ratioRelativeTo; ' +
      'deriving it from the option list. Update the data model to 3.9.0 or later.'
    );
  }
  return Math.max(...((itemDef.data.options || []) as Array<{ value: unknown }>).map((o) => Number(o.value)));
}

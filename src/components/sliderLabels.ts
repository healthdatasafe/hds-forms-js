import type { appTemplates } from 'hds-lib';
import type { SliderLabel } from '../schema/schemas';

/**
 * The item's slider anchors with a form's overrides applied (`ItemLabels.sliderLabels`, B-2026-11-12-1): per raw
 * value, the override's `label` / `description` win over the item's. An anchor the item lacks is added when the
 * override gives it a label.
 */
export function mergeSliderLabels (
  base: Record<string | number, SliderLabel> | undefined,
  over: appTemplates.ItemLabels['sliderLabels']
): Record<string | number, SliderLabel> | undefined {
  if (over == null || Object.keys(over).length === 0) return base;
  const merged: Record<string | number, SliderLabel> = { ...(base ?? {}) };
  for (const [raw, o] of Object.entries(over)) {
    const b = merged[raw];
    const label = o?.label ?? b?.label;
    if (label == null) continue;
    const description = o?.description ?? b?.description;
    merged[raw] = description != null ? { label, description } : { label };
  }
  return merged;
}

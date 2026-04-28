# Changelog

## [Unreleased]

## [0.8.0] - 2026-04-28

### Changed — `package.json.exports.import` now points at TS source (Plan 49)
- `exports[.].import` switched from `./js/hds-forms.mjs` (pre-built ESM bundle) to `./src/index.ts` (TS source).
- Added wildcard subpath exports: `./src/*` and `./js/*` so deep imports keep working.
- Added `src` to `"files"` so the published package includes the TS source.
- `default` export still points at the compiled bundle for non-Vite/CJS consumers.

**Why.** Vite resolves the `import` condition in dev mode. With the previous pre-built bundle as `import`, `require("hds-lib")` inside that bundle was bundled by esbuild into the consumer's chunk separately from the consumer's own `import 'hds-lib'`, creating two `HDSModel` singletons → duplicate-singleton bug that broke Plan 45's mcp-chrome smoke test. Pointing `import` at TS source lets Vite resolve `hds-lib` once through its normal module graph + dedup. Production builds and CJS consumers are unaffected (still hit `default`).

This brings `hds-forms-js` in line with `_claude-memory/conventions.md § Package exports: TS source for bundlers`. See `_plans/49-local-dev-dependency-graph-study/PLAN.md` for the full root-cause analysis.

## [0.7.0] - 2026-04-27

### Changed — multi-form label overrides (Option A)
- `HDSFormField.labelOverrides` now accepts either a single `FieldLabelOverrides` object **or** an array of `FieldLabelOverridesWithSource[]`. With a single override the rendering is unchanged. With an array of length > 1 the field renders one stacked block per override, each prefixed by a small caption identifying its source contact + form, all bound to the same value. This lets the patient app surface multiple forms requesting the same item (e.g. EQ-5D-5L wording from one doctor + a custom form from another) without losing either wording.
- `FieldLabelOverrides`, `FieldLabelOverridesWithSource`, `ItemCustomization` are now type aliases re-exported from `hds-lib` (`appTemplates.ItemLabels`, `appTemplates.ItemLabelsWithSource`, `appTemplates.ItemCustomization`) — single source of truth across forms-js / lib / consumer apps.

## [0.6.0] - 2026-04-24

### Added (plan 44 — EQ-5D-5L)
- **New `type: slider` field type.** Numeric input on a bounded scale with optional display-layer scaling. Items declare `min`, `max`, `step`; optional `slider.{orientation, labels, display{multiplier, precision, suffix}}`. Storage is the raw value in the item's `eventType`; display is UI-only. Enables VAS-style inputs (e.g. raw `0..1` stored, shown as `0..100`). Horizontal by default; vertical opt-in. Includes ARIA slider pattern, per-tick label rendering, and paired numeric readout.
- **Form-level label overrides** on the existing `section.itemCustomizations` bag (piggybacks on `hds-lib`'s persisted `CollectorRequest` shape — zero schema change). New `FieldLabelOverrides` and `ItemCustomization` types exported from the package index. `HDSFormField` accepts a new `labelOverrides` prop; `HDSFormSection` extracts per-itemKey overrides and forwards them. Enables questionnaire-specific wording (e.g. EuroQol first-person sentences) to live in templates while the underlying `data-model` items stay generic and reusable.

### Changed (plan 44)
- `FormBuilder` preview now forwards `section.itemCustomizations` to `HDSFormSection` so label overrides are visible during form-builder editing (previously only available on published / invited-patient renders).

### Fixed (plan 44)
- Preview passed a synthetic section object to `HDSFormSection` that omitted `itemCustomizations`; overrides were silently invisible in the builder preview.

## [0.5.0] - 2026-03-23

### Added
- `ItemSearchPicker` component — reusable searchable item picker with collapsible groups, counts, auto-expand on search. Exported from lib for use across apps.
- `Convertible.tsx` rewritten: method picker → observation dropdowns (Option B)
  - Loads converter engine, lists methods from model
  - `preferred-input-{itemKey}` setting hides method selector, shows method label
  - `_raw` method shows dimension stop dropdowns
  - All labels localized via method definitions
- `NumberInput` now shows unit label (Kg/Lbs) based on `unitSystem` setting + per-item variation override
- `HDSFormField` accepts `itemKey` prop for preferred API resolution
- Test app: settings panel wired to `HDSSettings._testInject`, converter preferences UI, HDS logo + docs link, ItemSearchPicker in Single Field tab

### Changed
- Settings renamed: `converter-auto-` → `preferred-display-`, `converter-default-` → `preferred-input-`
- Convertible field value uses `vectors` key (was `data`)

## [0.4.0] - 2026-03-19

### Added
- `convertible` item type with `Convertible.tsx` field component (dimension sliders + source display)
- `ConvertibleData` interface with `converter-engine` field in schema types

### Changed
- Removed CNAME: publish at `healthdatasafe.github.io/hds-forms-js/`

## [0.3.0] - 2026-03-16

### Fixed
- Added `resolve.dedupe` to prevent duplicate hds-lib singletons

### Added
- Support for `canBeNull` in composite sub-fields
- Settings tab to test app (Plan 11 preview)

### Changed
- Switched to Vite library build, point types to source TS
- Removed `js/` from git (rebuilt by `prepare` on install)
- Bumped Node engine to `>=24`

## [0.2.0] - 2026-03-09

### Added
- Shared FormBuilder component with slot-based architecture
- Item browser: group by key prefix, show description on hover
- ReminderEditor component integrated into FormBuilder
- Companion field schema utilities (`getCompanionSchema`, `extractCompanionDefaults`)
- DatasetSearch edit mode with readonly pre-filled companion fields
- Form Builder PoC tab in test app (Phase 1c)
- Native variation/eventType support in `formDataToActions`
- DatasetSearch field component

### Changed
- Simplified medication intake UI: removed frequency/asNeeded, inline layout
- Improved DatasetSearch: source filter, source tags, clear button
- Renamed package to `hds-forms-js`, added TS exports for bundlers

### Fixed
- TypeScript types and ratio/generic options bug
- `.nojekyll` added to deploy script for GitHub Pages

## [0.1.0] - 2026-02-25

### Added
- Initial release
- HDS form rendering library
- Dynamic form generation from HDS data model definitions
- Deploy script for gh-pages publishing

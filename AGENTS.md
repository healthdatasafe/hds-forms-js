# Agent primer — hds-forms-js

This file orients agents (Claude or others) working on `hds-forms-js`. It deliberately **does not duplicate** information that already lives in this repo — it links you to the right document for each concern. Read this first, then read the linked sources as you start a task.

---

## Read first

Before touching code, read these in order:

1. **[README.md](README.md)** — what the package is, the public component API, and how a consumer mounts a form.
2. **[CHANGELOG.md](CHANGELOG.md)** — every behaviour change in reverse chronological order. The most recent entries describe the field types and props you are likely to touch (e.g. `slider`, multi-form `labelOverrides[]`).
3. **[`src/index.ts`](src/index.ts)** — the canonical list of public exports. If a consumer needs something that is not exported here, **add the export** (don't let consumers reach into deep paths).
4. **[`src/schema/schemas.ts`](src/schema/schemas.ts)** — the discriminated union of `ItemData` types (`checkbox`, `date`, `text`, `number`, `select`, `composite`, `datasource-search`, `convertible`, `slider`) and the `schemaFor(...)` JSON-Schema bridge.
5. **[`src/components/HDSFormField.tsx`](src/components/HDSFormField.tsx)** — the field-type dispatcher. Every supported type is routed here.
6. **[`src/components/HDSFormSection.tsx`](src/components/HDSFormSection.tsx)** — section-level composition: items + section overrides + variation pickers + entry list (recurring sections).
7. **[`src/schema/eventData.ts`](src/schema/eventData.ts)** — `prefillFromEvents`, `matchEventsToItemDefs`, `formDataToActions`, `formDataToEventBatch`. The bridge between Pryv events and form values.

The whole repo is small enough that you should glance at the rest of `src/` once per session before assuming behaviour.

---

## Mental model

`hds-forms-js` is a thin React layer on top of [hds-lib-js](https://github.com/healthdatasafe/hds-lib-js). Every form field renders an HDS **item** (an `HDSItemDef` from the [data-model](https://github.com/healthdatasafe/data-model)). The library does **not** define new clinical concepts — it renders the ones declared in the data-model.

```
data-model (YAML) ──▶ hds-lib-js (HDSModel.itemsDefs) ──▶ hds-forms-js (this repo) ──▶ React DOM
                                                              │
                                                              └──▶ formDataToActions / formDataToEventBatch ──▶ Pryv events
```

What this implies:

- **Storage shape is set by the data-model**, not by this library. If the slider stores `0.73` raw and displays `73 /100`, that's because the item declares `eventType: ratio/proportion` + `slider.display.{multiplier:100, suffix:'/100'}`. Do not reshape values in this layer.
- **Wording is layered**, not stored here. `itemDef.data.label` is the canonical wording. Form-level overrides (per `CollectorRequest.sections[].itemCustomizations[itemKey].labels`) are passed in by the consumer and merged in `HDSFormField` — see "Label overrides" below.
- **Validation lives in JSON Schema**. `schemaFor(itemData)` produces a JSON Schema; consumers can plug it into AJV / `react-jsonschema-form` if they prefer schema-driven validation over the React component path.

---

## The field-type contract

Every supported field type follows the same flow:

1. **Schema** — declared in [`src/schema/schemas.ts`](src/schema/schemas.ts) as a discriminated union member on `type: '<name>'`. The corresponding `<name>(schema, value)` action under `SCHEMAS_PER_TYPE` decorates the JSON Schema (range, enum, format, etc.).
2. **Renderer** — a single React component under [`src/components/fields/`](src/components/fields/) (`Checkbox.tsx`, `Slider.tsx`, …). Receives `FieldProps` (`value`, `onChange`, `label`, `description`, `required`, `disabled`) plus type-specific props.
3. **Dispatch** — [`HDSFormField`](src/components/HDSFormField.tsx) `switch (itemData.type)` to the right renderer and computes the effective `label` / `description` / `option labels` from the item def + any override.
4. **Event conversion** — [`src/schema/eventData.ts`](src/schema/eventData.ts) maps form values back to `events.create` / `events.update` / `events.delete` actions. New field types need entries here too if their stored shape differs from the form value.

When you add a new field type, all four touchpoints get an entry — never just the renderer.

### Field types currently supported

| Type | Renderer | Storage | Notes |
|---|---|---|---|
| `checkbox` | `Checkbox` | boolean *(or `activity/plain` events with no content)* | When `eventType: activity/plain`, the **event's existence** is the boolean — no `content` field. |
| `date` | `DateInput` | string `YYYY-MM-DD` *(or `event.time` for date-only events)* | Stored as `event.time` (unix seconds) when the item's eventType is the date itself. |
| `text` | `TextInput` | string | |
| `number` | `NumberInput` | number | Honours `variations.eventType` (unit picker, e.g. kg ⇄ lb). |
| `select` | `Select` | option `value` (string \| number) | Options' raw values are storage-true; labels can be overridden per-form. |
| `composite` | `Composite` | object | One sub-field per declared property; each rendered via `HDSFormField` recursively. |
| `datasource-search` | `DatasetSearch` | object `{drug, intake}` (medication) or similar | See [`src/schema/companionFields.ts`](src/schema/companionFields.ts) for how companion sub-properties are derived from the eventType schema. |
| `convertible` | `Convertible` | `{source, vectors}` | Backed by hds-lib's converter engines (Euclidean distance over weighted vectors). |
| `slider` | `Slider` | raw number in `[min..max]` | Display layer scales via `slider.display.{multiplier, precision, suffix}`. ARIA slider pattern; `aria-valuetext` carries the displayed value, `aria-valuemin/max/now` carry the raw values. |

When the renderer's *displayed* value differs from the *stored* value (currently only `slider`), the same display rules must be reused everywhere the value surfaces — see hds-lib's [`eventToShortText`](https://github.com/healthdatasafe/hds-lib-js/blob/main/ts/HDSModel/eventToShortText.ts) which mirrors the slider display logic for diary/timeline/text summaries.

---

## Label overrides — single form vs. multiple forms

`HDSFormField.labelOverrides` accepts either:

- **A single `FieldLabelOverrides` object** — one form's override; applied directly. Use this for the doctor-side preview / single-form contexts.
- **A `FieldLabelOverridesWithSource[]` array** — produced by hds-lib's [`appTemplates.collectItemLabels(itemKey, contacts)`](https://github.com/healthdatasafe/hds-lib-js/blob/main/ts/appTemplates/itemLabels.ts). Use this when the same item may be requested by multiple active forms with different wording (e.g. EQ-5D-5L from one practitioner + a custom form from another).
  - Length 0 → no override, canonical labels used.
  - Length 1 → behaves like the single-object case.
  - Length ≥ 2 → **every variant is rendered**, each prefixed by a small caption identifying the source contact + form. The same value/onChange is shared across all variants — one save satisfies every requesting form.

Type aliases re-export from hds-lib (`appTemplates.ItemLabels`, `appTemplates.ItemLabelsWithSource`, `appTemplates.ItemCustomization`) to keep one source of truth for the shape. When you change those types, update [`src/components/HDSFormField.tsx`](src/components/HDSFormField.tsx) and [`src/components/HDSFormSection.tsx`](src/components/HDSFormSection.tsx) together.

---

## Conventions enforced in this repo

### React + TypeScript

- ESM + TypeScript; no class components.
- Each field renderer is a single file under [`src/components/fields/`](src/components/fields/), default export named like the file.
- Tailwind classes inline in JSX. No separate stylesheets.
- Accessibility is non-negotiable for new field types: `<label>` association, `aria-describedby` for descriptions, ARIA pattern matching the widget role (e.g. `role="slider"` for sliders).

### Build / publish

- `npm run prepare` (Vite library build) produces `js/hds-forms.js` + `js/hds-forms.mjs`. Consumers pulling via `git+https://...` install hit the `prepare` hook automatically — **never publish without `js/` rebuilt**.
- `npm run build` does the same plus emits TS declarations.
- `tsc --emitDeclarationOnly` is part of `npm run build`. If the `.d.ts` looks stale, delete `js/` and rebuild.
- The published demo (test app) builds from [`src-test-app/`](src-test-app/) and deploys to gh-pages — see `scripts/deploy.sh`.

### Tests

- [`tests/`](tests/) — vitest, pure unit tests on schema generation and event-data conversion. No DOM. Add tests next to similar existing ones.
- Visual / interaction verification happens in `src-test-app/` (run `npm run test-app`).

### Versioning

- Bump `version` in `package.json` for **every** observable change.
- Add a `## [x.y.z] - YYYY-MM-DD` block under `[Unreleased]` in [CHANGELOG.md](CHANGELOG.md). One bullet = one observable change.

### Gotchas

- **`tsc` stale output**: `tsc` may skip re-emitting a `.js` / `.d.ts` file if it doesn't notice an internal change. After `npm run build`, **verify the relevant file in `js/` actually contains your change** before committing.
- **Vite cache in consumer apps**: when a public type changes and a Vite-based consumer doesn't pick it up after `npm install`, clear `<consumer>/node_modules/.vite` and restart the dev server.
- **`exports.import` MUST point at `./src/index.ts`** (TS source) for dev-mode consumers. Pointing at the pre-built bundle (`./js/hds-forms.mjs`) causes Vite to inline a second copy of `hds-lib` into the consumer's chunk → duplicate-singleton bug (broke Plan 45 — fixed in Plan 49). Verify with `cd _local && npm run verify-live-source`. Full methodology in `_claude-memory/conventions.md § Live cross-repo development`.
- **Display vs. storage drift**: the slider is the canonical example. If you add another field type with `display`-layer scaling, mirror the formatter in hds-lib's `eventToShortText` so the diary / timeline render matches what the user typed.
- **Override resolution order** in `HDSFormField`: array (length>1 stack) → array (length 1, treated as single) → single object → fall back to `itemDef.data.{label,description}`. Do not introduce a fifth path.

---

## Cross-repo relationships

`hds-forms-js` lives between the data-model and consumer apps:

- **[hds-lib-js](https://github.com/healthdatasafe/hds-lib-js)** — runtime data-model loader and types. `HDSModel.itemsDefs.forKey(itemKey)` is how this lib resolves items at render time. `appTemplates.{ItemLabels, ItemLabelsWithSource, ItemCustomization, collectItemLabels}` are re-exported here as form-renderer aliases.
- **[data-model](https://github.com/healthdatasafe/data-model)** — the YAML source for every item / field shape this lib renders. When you add a new field type here, the data-model item-schema needs the matching `type:` enum value first ([`src/schemas/items.js`](https://github.com/healthdatasafe/data-model/blob/main/src/schemas/items.js)).

When a public type changes here, type-check both consumer repos before merging.

---

## When in doubt

- For a question about the data-model (item shape, hooks, scale placement): read [data-model `AGENTS.md`](https://github.com/healthdatasafe/data-model/blob/main/AGENTS.md).
- For a question about Pryv data primitives (events, streams, accesses): read [hds-lib-js `AGENTS.md`](https://github.com/healthdatasafe/hds-lib-js/blob/main/AGENTS.md).
- For a question about something this lib does that has no doc here: extend this file or `README.md` — that's a documentation bug, fix it before fixing the code.

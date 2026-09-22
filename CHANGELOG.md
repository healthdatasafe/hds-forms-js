# Changelog

## [0.18.0] - 2026-09-22

### Changed

- **The `ratio/generic` denominator is read from the data model instead of being derived here.**
  That legacy Pryv eventType stores an object `{ value, relativeTo }`, both required, so a `select`
  item on it lists numerators and the denominator is `max(option values)`. This library computed that
  inline **in two places** (`src/schema/eventData.ts` and `src/schema/itemDefToSchema.ts`), and it was
  the only place the rule was written down. Other consumers hardcoded a constant instead:
  `bridge-chartneo` carried `2`, `bridge-cycles-files` carried `10`. All were correct, because all
  equalled the max, so nothing was broken. The hazard was the next edit: add an option to an item and
  this library would start writing the new maximum while a hardcoding consumer kept writing the old,
  so one item would carry **two different denominators** and `value / relativeTo` would stop being
  comparable across writers, with nothing erroring.

  data-model **3.9.0** now derives, validates and publishes the value as the item's `ratioRelativeTo`.
  Both call sites now go through one helper, `src/schema/ratioGeneric.ts`, which prefers the published
  field. Found by the data-model plan 100 coherence review, finding F1.

  **Backwards compatible.** On a pack older than 3.9.0 the field is absent, and since no consumer can
  read it there, deriving remains the correct legacy behaviour rather than a competing source of truth.
  The helper falls back to deriving and warns once, so a stale pack is visible rather than silent. A
  published value that is not a positive number is ignored in favour of deriving.

  Also consolidates `isSelectRatioGeneric`, which was duplicated in `eventData.ts`, into the same
  helper module.

## [0.17.0] - 2026-09-19

### Added

- **`ConsentPanel` can render a selectable permission list.** New optional `consent` prop taking
  the annotations `pryv` 3.12.0 carries in `authRequest.consent`:
  - `allowUserChoice` — false (the default) keeps today's accept-all-or-deny behaviour;
  - `mandatory` — ids the user cannot leave out, rendered checked and disabled with a
    "required" marker;
  - `optIn` — ids offered NOT pre-selected, so the user has to choose them.

  Ids are a stream permission's `streamId` or a feature permission's `feature`; the new exported
  `permissionId()` resolves which.

- `onAccept` now receives the granted subset **when the list is selectable**, and is still called
  with no argument otherwise. **Backwards compatible:** a caller that passes no `consent` sees no
  checkboxes and no change in the callback, so `hds-webapp`'s `BridgeConsentDialog` and every
  other existing consumer are unaffected.

- Accept is disabled while a selectable list has nothing granted — an empty grant is not a
  consent, and the platform would refuse it anyway.

- New label `required`.

### Notes

Tests follow this repo's existing static-markup style rather than introducing jsdom and
testing-library for one feature; they assert the rendering contract (which boxes appear, which
are checked, which are locked), and the toggle behaviour is exercised end to end in
app-web-user-account's browser verification. 131 tests passing.

## [0.16.1] - 2026-09-18

### Changed

- **`hds-lib` 2.0.0 → 2.5.0.** Part of the 2026-09-18 workspace-wide sweep: `hds-lib` had drifted
  across the workspace from 0.6.0 to 2.5.0, and the lockfile was the only thing pinning it here.

  hds-lib **2.0.0**'s single breaking change narrowed `HDSItemDef.eventTemplate()` to refuse
  guessing which declared variation the caller meant, and it reaches only the four items that
  declare variations (`body-weight`, `body-height`, `body-blood-serum-glucose-fasting`,
  `profile-avatar`). This package has no `eventTemplate()` call site, so it is not affected.
  Everything else across 1.x → 2.x is additive.

  Gate: tsc clean, eslint clean, 123 tests passing.

## [0.16.0] - 2026-09-15

### Added
- **`itemCustomizations[itemKey].pin` — fix a `datasource-search` item's concept so an intake question renders a field instead of a search box.**

  An intake form asking "how many IVF cycles have you had?" wants one numeric
  field. The model's answer is `treatment-coded` at context `treatment-fertility`
  with the regimen pinned to IVF and `count: N` — but the form engine could not
  express the pin, so the respondent was shown a concept search box and had to
  find "In vitro fertilization" themselves before the count field appeared.

  A pinned field renders the concept as static text, shows the companion fields,
  and locks whichever companion sub-keys the concept pre-fills. It emits its
  value on mount, so a question nobody touches still submits the concept.

  The pin carries the resolved concept, not just an id: datasets-service exposes
  only `?search=` and `/sources`, with no lookup-by-id route, so an id-only pin
  would need a new endpoint and a deploy before any form could use it. Storing
  the concept also makes a pinned answer byte-identical to a searched-for one,
  and the id still travels inside it (`hdsId` is a `valueField` on every
  datasource). The tradeoff is that a pin does not follow an upstream
  relabelling — the same staleness every already-submitted event carries.

  A `pin.datasource` that disagrees with the item's own datasource renders a
  visible error instead of falling back to the search box: a silent fallback
  looks exactly like "the author forgot to pin", so the mistake would ship as a
  working-but-wrong form.

  New: `ItemPin`, `asItemPin()`, `pinDisplayLabel()`, `buildPinnedValue()`.
  Backward compatible — no pin means the previous behaviour, unchanged. Adds 15
  tests. Closes the `hds-forms-js` entry in `_plans/TODO-ASAP.md`.

## [0.15.0] - 2026-09-15

### Changed
- **`ConsentPanel`'s `consentText` accepts a `ReactNode`, not just a `string`.**

  It is the only part of the panel the requesting app writes, and the only place
  a user learns in their own words what an app will do with their data — the rest
  of the screen is an app id and canonical stream names. It is markdown by
  convention, so a `string`-only prop forced consumers to either show the raw
  source or drop the message.

  A string still renders pre-line exactly as before; a node renders as given, and
  the `whitespace-pre-line` class is applied only for strings so a node's own
  block structure is not double-spaced. Rendering stays the consumer's job
  deliberately: this text is untrusted, so the panel must never be handed raw
  HTML to inject.

  Widened while fixing `B-2026-09-15-3`, where a consent screen had stopped
  passing the message at all. Backward compatible — `string` is a `ReactNode`,
  and the one existing consumer passing a plain string is unaffected.

  Adds four tests, including that the message renders **before** the permission
  list. Reading order is the requirement, not merely presence: what the app says
  it will do, then the technical breakdown it introduces.

## [0.14.0] - 2026-09-11

### BREAKING — the variation choice is now passed into `eventTemplate()`

Requires **hds-lib 2.0.0**, where `eventTemplate()` throws rather than silently returning
`eventTypes[0]` for an item declaring `variations.eventType`
([hds-lib-js#13](https://github.com/healthdatasafe/hds-lib-js/issues/13)). For those items the
option **is** the stored unit, so a weight entered in pounds was written as kilograms with nothing
failing.

- **`formDataToActions` and `formDataToEventBatch` now agree.** Both read
  `formData['<key>__eventType']` and pass it *into* `eventTemplate()`. `formDataToActions`
  previously overrode `template.type` afterwards, and `formDataToEventBatch` ignored the choice
  entirely, so the two produced different event types from identical input. That divergence was the
  third item in the issue.
- **`jsonFormForItemDef` accepts `opts.eventType`** and forwards it.
- **A variation item with no choice now throws** instead of quietly writing the first declared
  option. Callers that build form data themselves must supply `<key>__eventType`.

### Fixed — the unit selector no longer renders blank

`HDSFormSection` never initialised `<key>__eventType`, so the variation `<Select>` rendered with
`value={undefined}` until the user touched it, and submitting without touching it stored the first
declared option. It is now seeded from `getPreferredInput(key).eventType`, which is the user's
resolved preference (per-item setting, then `unitSystem`, then the first option). This is also what
keeps the throw above off the UI path: the form knows the preference, so it states the choice
explicitly rather than leaving the primitive to guess.

### Added

- **`<ConsentPanel>`** — the shared "this app wants these permissions, allow?" body used by every
  HDS consent surface (bridge connections in hds-webapp, access requests in the account app).
  Pure presentational: app identity, optional consent text, permission rows with level icons,
  expiry notice, mismatch warning, Refuse / Allow. Consumers supply the frame (modal, card) and
  the side effects; every label is overridable through `labels` for i18n. Styled with stock
  Tailwind plus the `primary` scale from `css/tokens.css`, so it renders the same in both apps.

### Changed

- **`backloop.dev` now installs from GitHub instead of npm** (2026-09-07). The service stopped
  being public on 2026-09-04: a certificate authority must revoke any certificate whose private
  key is published, and both did. The two packages also moved into repositories of their own, so
  both are now pinned by tag.

  ```
  backloop.dev             git+https://github.com/perki/backloop.dev-node.git#v5.1.0
  vite-plugin-backloop.dev git+https://github.com/perki/backloop.dev-vite.git#v2.2.0
  ```

  5.1.0 rather than 5.0.0 is deliberate. 5.0.0 fails to start when no secret is configured;
  5.1.0 falls back to a shared self-signed certificate, so local development still works without
  one. That certificate installs once per machine from <https://backloop.dev/public/>, and
  Firefox will not accept it because it ignores the system trust store. To use your own
  certificate instead, point `BACKLOOP_DEV_CERT` and `BACKLOOP_DEV_KEY` at the PEM files.

  **One-time step in every existing checkout.** npm does not replace a package that moved from
  the registry to a git URL: it leaves the old directory on disk while `npm ls` and
  `package-lock.json` both report the new version, so the old code keeps loading.

  ```sh
  rm -rf node_modules/backloop.dev node_modules/vite-plugin-backloop.dev && npm install
  ```


### Added — `display.multiplier` on `number` items (storage stays raw)

`number` items accept an optional `number.display` block (`multiplier` / `precision` /
`suffix`), mirroring the `slider.display` block that already existed. Storage is
unchanged — always the raw value in the item's eventType — but the user now sees the
value in its conventional reporting scale.

The driving case is lab percentages in the serum blood-chemistry domain: HbA1c,
hematocrit, RDW, transferrin saturation and the WBC differential are genuine fractions,
so they store `0..1` on `ratio/proportion` and render as `42%` via `multiplier: 100`.
Without this, a clinician-facing value would sit at rest in an alien scale.

- `ValueDisplay` replaces `SliderDisplay` as the shared type name; `SliderDisplay`
  remains an alias, so existing imports are unaffected.
- Scaling is **bidirectional** on a number input — unlike a slider, whose control works
  in the raw scale and only scales its readout, the user *types* the displayed value, so
  what's typed is divided by the multiplier before storage.
- The field is text-backed while focused: round-tripping each keystroke through raw
  storage would destroy in-progress input (`"5."` parses to `5`, so a decimal could
  never be typed).
- `precision` has **no default** on number inputs, unlike sliders (which default to 0
  when multiplier ≥ 10). That default would render HbA1c 5.4% as "5".
- Float noise is stripped on both sides: `0.29 * 100` is `28.999999999999996` when
  displayed, and `5.4 / 100` is `0.054000000000000006` when stored — neither reaches the
  user or the database.
- Logic extracted to `src/schema/valueDisplay.ts` (`toDisplayText` / `toRawValue`) and
  covered by `tests/valueDisplay.test.ts`.

## [0.13.0] - 2026-08-07

### Added — `multi-select` field type
Renders items whose content is an **array** of chosen option values, for the case where several options
are simultaneously true (data-model 3.0.0, [site-agents#9](https://github.com/healthdatasafe/site-agents/issues/9)
/ [#10](https://github.com/healthdatasafe/site-agents/issues/10)). Until now the library had no
multi-value control at all — `Select` renders a single `<select>` and emits a scalar.

- **`MultiSelect`** component (exported): a **checkbox group**, not `<select multiple>` — the source
  questionnaires print these as checkbox lists and multi-select dropdowns are poor on touch. Empty
  selection is `null` rather than `[]`, matching the other fields' "no answer" representation, and the
  stored array follows the item's declared option order regardless of tick order.
- **`HDSFormField`** routes `multi-select` to it, reusing `select`'s option-label override logic.
- **`schemaFor`** emits `{ type: 'array', uniqueItems: true, items: { type: 'string', oneOf: [...] } }`.
  Note the allowed values live under `items.oneOf`, not the root `oneOf` a `select` produces.

## [0.12.0]

### Changed — no design-system dependency; theming is now a documented two-token contract

hds-forms-js is public, `style-package` (`hds-style`) is private. The optional
`hds-style` peer dependency put a private-repo git URL in this repo's `package.json`
and lockfile, and left the actual styling contract undocumented — a consumer had no
supported way to re-theme the library.

The library never used the design system's semantic tokens (`--hds-background`,
`--hds-card`, the palettes, the chart colors, Flowbite, `prose`). Of `hds-style`'s
211 lines it consumed exactly two things, now cherry-picked into `css/tokens.css`:

- the `--color-primary-50…950` scale backing the 82 `primary-*` utilities across 16
  components — now derived from `var(--hds-primary, #0D9488)`, so a consumer rebrands
  the whole library by setting **one** variable;
- the class-based `dark` variant backing 364 `dark:` utilities. This was a silent
  failure mode: without it Tailwind v4 falls back to `prefers-color-scheme`, so a
  consumer's `.dark` toggle did nothing and the cause was undiscoverable.

`css/tokens.css` is self-defaulting — importing it is the whole setup. Apps that
already import `hds-style/css/theme.css` are unaffected: both derive the scale from
the same `--hds-primary`, so an active HDS palette keeps driving the colors.

- **Removed:** `hds-style` from `peerDependencies` / `peerDependenciesMeta`, and from
  `src-test-app` (which now imports the local `css/tokens.css`).
- **Added:** `css/tokens.css`, exported as `hds-forms-js/css/*` and shipped via `files`.
- **Added:** README "Theming" section documenting the contract.

No component source changed — this is packaging and documentation only.

### Changed — test app: scoped demo access

The test app's hardcoded `sample-mira` apiEndpoint used an access with `read` on `*`.
It was revoked and replaced with a dedicated access scoped to `read` on `mira-demo`
only. The test app ships to gh-pages, so this token is **public by construction** —
the mitigation is minimal scope on a throwaway demo account, not secrecy.

The test app keeps its `hds-react-timeline` dependency (a private repo) for the
Timeline demo. That public→private reference is deliberate, and also pulls
`style-package` into `src-test-app`'s lockfile transitively. Neither affects the
published library, which depends on neither: `files` ships only `js`, `src` and `css`.

## [0.11.2] - 2026-06-19

### Fixed — object-content event types now write/read correctly via `eventData` (#6)

`HDSFormSection` → `formDataToActions` / `formDataToEventBatch` wrote a **scalar**
event `content` for items whose HDS event type requires an **object**, so the
store rejected the event (`INVALID_TYPE "must be object"`). This broke `select`
items whose `eventType` is `ratio/generic` (e.g. the STORMM `fertility-ttc-tta`
item) — the action/batch path disagreed with the JSON-schema path
(`_jsonFormForItemDef`), which already wrapped the value as
`{ value, relativeTo: max(option values) }`.

- `formDataToActions` / `formDataToEventBatch` now emit canonical object content
  (`{ value, relativeTo }`) for `select` + `ratio/generic`, mirroring
  `_jsonFormForItemDef`. Already-object values are passed through unchanged.
- `matchEventsToItemDefs` / `prefillFromEvents` unwrap the object back to the
  select's scalar, so the round-trip is symmetric.

## [0.11.1] - 2026-06-19

### Changed — dependency refresh: hds-lib 1.2.1 (pryv ecosystem 3.7.1)

Re-pinned `hds-lib` to 1.2.1, which carries the pryv ecosystem bump to 3.7.1
(matches the open-pryv.io 2.0.0-rc.4 prod cores — Plan 78). Also auto-fixed a
pre-existing `@stylistic/jsx-curly-newline` lint error in `FormBuilder.tsx`.
No API changes.

## [0.11.0] - 2026-06-16

> **Plan 71 (questionnaire request/answer event pair) — renderer + builder + helpers + FormBuilder coverage banner.** Released alongside data-model v1.10.0 and hds-lib-js v1.2.0.

### Added — questionnaire renderer + builder + helpers (Plan 71 C2/C3/C4/D1/D2)
- **`HDSQuestionnaireForm`** (`src/components/HDSQuestionnaireForm.tsx`) — patient-side renderer. Takes a `questionnaire/request-v1` content payload, renders one card per question with the 4-state status selector (`answered` / `no` / `unknown` / `declined`) + conditional UI per status. Sub-field qualifier supported in three shapes (`select-segmented` / `text` / `number`). Reference-collection for `answered` rows delegated to a parent-supplied `renderAnsweredBody` callback.
- **`QuestionnaireBuilder`** (`src/components/QuestionnaireBuilder.tsx`) — doctor-side editor for ONE `Questionnaire` instance (title + description + per-question card with itemRef / scope / subField editor + key-grammar-validated add). Mutates the instance in place via its public API.
- **`FormBuilder` integration** — new "Bundled questionnaires" panel between sections and the action slot. Drafts live in parallel React state, mirror-synced to `CollectorRequest.questionnaires` on every change; drafts with 0 questions don't persist. Three new labels: `bundledQuestionnaires` / `addQuestionnaire` / `removeQuestionnaire`.
- **`prefillQuestionnaire(opts)`** (`src/questionnaire/prefill.ts`) — fans out a parallel `events.get` per question, scoped by the item's eventType + the question's temporal scope (`ever` / `window` / `latest` with `withinDays`). Returns prefilled `AnswerEntry` map. Optional `matchEvent` callback for client-side content-shape filtering when storage shape can't be server-filtered.
- **`buildAnswerBatch(opts)`** (`src/questionnaire/submit.ts`) — composes the Pryv `events.batch` (typed events first, answer event last). Validation + `clientData.related` mirror delegated to hds-lib's `Questionnaire.buildAnswerEvent`.
- **`submitAnswerBatch(connection, result)`** — thin wrapper around Pryv `connection.api()` for the common case.

### Added — Phase G post-verification polish
- **`QuestionnaireBuilder` drug-code editor** — auto-renders when `itemRef` starts with `medication-`. Two inputs (system + code), writes `params.drug.codes: [{system, code}]`. Defaults system to `atc`. Empty code clears the params.
- **`QuestionnaireBuilder` sub-field details editor** — auto-renders when sub-field type is set. Edits `subField.label`; for `select-segmented` also exposes an editable `options[].value/label` list with `+ option` / `×` buttons.
- **`prefillQuestionnaire` — variations.eventType + defensive item lookup.** `resolveQuestionEventType` now reads `data.variations.eventType.options[].value` for items like `body-weight` (kg/lb) and returns the full list as `string[]`; `fetchCandidatesForQuestion` passes the array through to Pryv's `types` filter. `forKey(_, false)` makes unknown itemRefs skip the question instead of throwing the whole prefill (2 new prefill tests).
- **`FormBuilder` coverage badge + Apply button** — every bundled questionnaire shows a live `request.checkQuestionnaireCoverage(draft)` summary. When permissions are missing, an amber banner offers "Add missing permissions to request" → calls `request.applyQuestionnaireCoverage(draft)` and re-renders. When everything's covered, an emerald "All question items are covered" banner appears. Unknown itemRefs are surfaced in both states. Four new labels: `coverageOk` / `coverageMissing` / `coverageUnknown` / `coverageApply`.

### Tests
- 63 → 81 vitest passing (+18 new across `prefillQuestionnaire`, `scopeToQueryParams`, `fetchCandidatesForQuestion`, `buildAnswerBatch`, variations.eventType, defensive forKey).

### Bundle
- Build bundle: 119 KB → 133.89 KB (gzip 25 → 28.16 KB). +14 KB for renderer + builder + helpers + index re-exports.

## [0.10.0] - 2026-05-04

### Added — date/time + duration companions, generalized DatasetSearch (Plan 46)

- **`<EventTimeInput>`** — date/time companion bound to the surrounding Pryv event's `event.time`. Honours `mandatory` / `allowNull` from the host item's `dateTime` block.
- **`<EventDurationInput>`** — duration companion bound to `event.duration`. Four modes (No / Ongoing / Length / End time); honours `mandatory` / `allowNull` / `maxSeconds`. Drives the new `treatment-{basic,coded}` items' span without mutating event payload schemas (Pryv-native fields).
- **`<DatasetSearch>`** generalised — handles `{drug}` / `{regimen}` / `{procedure}` payload shapes uniformly. Companion fields render inline alongside the search field. Pre-filled companions are read-only when bound to a coded selection.
- **Item context (D3 mechanic)** — `HDSFormSection.itemCustomizations[itemKey].context` pins an itemDef to a descendant streamId (e.g. `procedure-fertility`). The walk-up resolution lives in `hds-lib`'s `forEvent()`; cross-subtree contexts are rejected.

### Changed

- Test app refactor (`src-test-app/`): unified Single Field / Datasets panels; removed bespoke Plan 46 (D3) and Medication tabs. Test app now exercises `EventTimeInput` / `EventDurationInput` via item-driven companion rendering.

### Notes

- Public API additions only; existing `<HDSFormField>` / `<HDSFormSection>` callers are unaffected.
- All 61 unit tests pass.

## [0.9.0] - 2026-04-28

### Added — custom-field rendering & form-engine bridge (45-custom-fields-appTemplates Phase 4)

#### `HDSFormSection`
- New optional props `customFieldKeys: string[]` + `customFields: CustomFieldDeclaration[]`.
  For each declared key the section builds a `VirtualItemDef` via
  `appTemplates.customFieldDeclarationToVirtualItem(decl)` and renders through
  the existing `<HDSFormField>`. Custom-field form values are stored under
  `__cf::{templateId}::{key}` so they don't collide with canonical itemKeys.

#### Form-engine bridge — `src/schema/customFields.ts`
- `CUSTOM_FIELD_KEY_PREFIX` — agreed sentinel `__cf::`.
- `customFieldFormKey(decl)` — `__cf::{templateId}::{key}` formatter.
- `isCustomFieldKey(key)` — predicate for downstream filters.
- `buildCustomFieldEntries(customFieldKeys, customFields) → Array<{ key, itemDef }>`
  — converts a section's custom-field declarations into entries structurally
  compatible with `formDataToActions` / `prefillFromEvents`. Mixed canonical
  + custom-field arrays work without modification: both expose
  `data.streamId`, `data.eventType` and `eventTemplate()`.

#### Public surface (`src/index.ts`)
- Exports the four bridge helpers.

#### Tests (`tests/customFields.test.ts`) — 21 new
- VirtualItemDef shape contract per `note/txt | note/html | count/generic | date/iso-8601 | activity/plain`.
- Options → select rendering with `{value, label: { en }}` shape.
- `customFieldFormKey` / `isCustomFieldKey` / `CUSTOM_FIELD_KEY_PREFIX` semantics.
- `buildCustomFieldEntries` selection + skip-unknown behaviour.
- Round-trip: `formDataToActions` create / update / delete actions for
  custom-field values, plus `prefillFromEvents` matching by
  `(streamId, eventType)` and picking the most recent matching event.
- Mixed canonical + custom-field round-trip — entries don't interfere.

**Net: 57 tests passing (21 new this version, 36 pre-existing).**

### Requires `hds-lib` ≥ 0.9.0 (custom-field types, helpers and template loader).

## [0.8.1] - 2026-04-28

### Changed — hide deprecated itemDefs from pickers (Plan 50 Phase 4)
- `FormBuilder` item browser and `ItemSearchPicker` now load itemDefs via `model.itemsDefs.getAllActive()` (introduced in `hds-lib` 0.7.2) — items flagged `deprecated: true` in pack.json are no longer offered when a doctor is designing a new form. Existing forms still resolve every item correctly (readers use `forKey`/`forEvent`, which are unchanged).
- `ItemSearchPicker` now accepts an optional `includeDeprecated` prop (default `false`) for engineer-facing tools (e.g. the data-model browser) that need to inspect every item.

Requires `hds-lib` ≥ 0.7.2. Contract documented in `data-model/AGENTS.md § "deprecated: true on items"`.

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

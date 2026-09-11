# hds-forms

React component library for rendering forms from HDS item definitions. Converts HDS ItemDefs to form fields using Tailwind CSS styling, and handles bidirectional data conversion between form values and Pryv events.

## Theming

hds-forms is theme-agnostic — it depends on no design-system package. It needs exactly two things from the host app, both provided by a single import:

```css
@import "tailwindcss";
@import "hds-forms-js/css/tokens.css";
```

| What | Why |
|------|-----|
| A `primary` color scale (`--color-primary-50` … `--color-primary-950`) | components render buttons, focus rings and active states with `bg-primary-500`, `text-primary-700`, … |
| A **class-based** `dark` variant | components emit `dark:` utilities throughout; Tailwind v4 otherwise defaults to `prefers-color-scheme`, so toggling `.dark` on `<html>` would silently do nothing |

`tokens.css` is self-defaulting, so importing it is enough. **Rebrand the entire library with one variable:**

```css
:root { --hds-primary: #7C3AED; }
```

The full scale is derived from it via `color-mix()`. Override individual steps (`--color-primary-600`, …) if you need exact control. Everything else the components use is stock Tailwind (`gray-*`, spacing, typography) — no other tokens required.

> Using the HDS design system? Import `hds-style/css/theme.css` as usual; it defines the same scale from the same `--hds-primary`, so the active HDS palette keeps driving the colors and `tokens.css` becomes redundant (harmless if both are imported).

## Components

### `<HDSFormField>`

Renders a single form field based on an HDS item data definition.

```tsx
import { HDSFormField } from 'hds-forms';

<HDSFormField
  itemData={itemDef.data}
  value={value}
  onChange={(v) => setValue(v)}
/>
```

Supported field types: `checkbox`, `date`, `text`, `number`, `select`, `composite`, `datasource-search`.

#### Date / time / duration companions

When an item declares a `dateTime` or `duration` block, `<HDSFormField>` renders the corresponding companion input next to the value field — the companions write to the surrounding Pryv event's `event.time` / `event.duration` (Pryv-native), not to the payload schema. Companions can be exposed individually:

```tsx
import { EventTimeInput, EventDurationInput } from 'hds-forms';

<EventTimeInput value={time} onChange={setTime} mandatory={false} />
<EventDurationInput value={duration} onChange={setDuration} maxSeconds={315360000} />
```

`EventDurationInput` has four modes — **No** (point-in-time), **Ongoing** (open-ended), **Length** (numeric + unit), **End time** (computed) — and respects `mandatory` / `allowNull` / `maxSeconds` from the item definition.

### `<HDSFormSection>`

Renders a full form section (multiple fields + submit button). Resolves item keys via `getHDSModel()`.

```tsx
import { HDSFormSection } from 'hds-forms';

// Permanent section (default) — one-time profile data
<HDSFormSection
  section={{ type: 'permanent', itemKeys: ['bloodType', 'allergies'] }}
  onSubmit={(formData) => console.log(formData)}
/>

// Recurring section — repeated entries with date picker
<HDSFormSection
  section={{ type: 'recurring', label: { en: 'Daily tracking' }, itemKeys: ['temperature', 'notes'] }}
  onSubmit={(formData) => console.log(formData)}
  entries={previousEntries}
  onEditEntry={(index) => handleEdit(index)}
  onDeleteEntry={(index) => handleDelete(index)}
/>
```

Recurring sections render a date picker (defaults to today), an "Add entry" button, and a list of previously submitted entries with edit/delete actions.

#### Custom fields (Plan 45)

Sections accept optional `customFieldKeys: string[]` + `customFields: CustomFieldDeclaration[]`. Each custom-field key is rendered alongside canonical items via the existing `<HDSFormField>`. Form values for custom fields live under `__cf::{templateId}::{key}` so they can't collide with canonical itemKeys.

```tsx
<HDSFormSection
  section={{
    type: 'recurring',
    itemKeys: ['fertility-cycles-start'],
    customFieldKeys: ['dcom'],
    customFields: appTemplate.customFields // from hds-lib's loadTemplate()
  }}
  onSubmit={...}
/>
```

For the submit / prefill round-trip, use `buildCustomFieldEntries(customFieldKeys, customFields)` to produce `{ key, itemDef }[]` entries that plug straight into `formDataToActions()` and `prefillFromEvents()` alongside canonical entries. See `hds-lib`'s [`CUSTOM-FIELDS-AND-SYSTEM.md`](https://github.com/healthdatasafe/hds-lib-js/blob/main/ts/appTemplates/CUSTOM-FIELDS-AND-SYSTEM.md) for the full design reference.

#### Item context (Plan 46 — D3 mechanic)

Sections can pin an item to a descendant stream via `itemCustomizations[itemKey].context`:

```tsx
<HDSFormSection
  section={{
    type: 'recurring',
    itemKeys: ['procedure-coded'],
    itemCustomizations: {
      'procedure-coded': { context: 'procedure-fertility' }
    }
  }}
  onSubmit={...}
/>
```

The resulting event uses the descendant streamId (`procedure-fertility`) instead of the item's default parent (`procedure`). `forEvent()` walks back up to resolve the original itemDef. Cross-subtree contexts are rejected. See data-model `documentation/TREATMENT-PROCEDURE.md` for the design rationale.

### `<DatasetSearch>`

Renders a typeahead search field bound to a remote dataset endpoint (e.g. `datasets-service`'s `/medication`, `/treatment`, `/procedure`). On selection, populates the host item's payload (`drug` / `regimen` / `procedure`) and any companion fields (`intake.{doseValue, doseUnit, route}`, procedure `findings[]`, free-text `notes`). Companion fields render inline.

### `<ConsentPanel>`

The one consent body for "this app wants these permissions, allow?". Pure presentational: no
fetch, no router, no global state. Wrap it in your own frame (a modal, a card in an auth flow) and
wire the side effects on `onAccept` / `onRefuse`.

```tsx
import { ConsentPanel } from 'hds-forms-js';

<ConsentPanel
  app={{ name: app.name, icon: <img src={app.iconUrl} alt='' className='h-8 w-8 rounded-md' /> }}
  title={`${app.name} would like to connect`}   // optional: defaults to app.name; `{app}` labels keep the plain name
  consentText={app.consentMessage?.en}
  permissions={[{ streamId: 'body-weight', level: 'read', name: 'Weight' }, { streamId: '*', level: 'manage' }]}
  expireAfterSeconds={3600}          // optional: renders the expiry notice
  mismatchWarning                    // optional: `true` for the default text, or a string
  busy={submitting && 'accepting'}   // disables both buttons, swaps the label
  onAccept={accept}
  onRefuse={refuse}
  labels={{ requesting: t('consent.requesting'), accept: t('common.accept'), refuse: t('common.reject') }}
>
  {error && <p className='text-red-600'>{error}</p>}   {/* optional content above the buttons */}
</ConsentPanel>
```

Permissions follow Pryv's shape (`streamId`, `level`, optional `name` / `defaultName`); the wildcard
`'*'` renders as `labels.streamAll`. Every label has an English default (`DEFAULT_CONSENT_LABELS`);
`{app}` and `{seconds}` placeholders are substituted. Set `eyebrow` or `footnote` to `''` to hide them.

### `<EntryList>`

Displays a compact table of recurring entries. Used internally by `HDSFormSection` but also exported for custom layouts.

## Schema Utilities

```ts
import { schemaFor, jsonFormForItemDef } from 'hds-forms';

// Generate JSON Schema from item data
const schema = schemaFor(itemDef.data);

// Full conversion pipeline: schema + event data converter
const { schema, eventDataForFormData } = jsonFormForItemDef(itemDef);
const eventData = eventDataForFormData(formValues);
```

## Event Data Conversion

```ts
import { prefillFromEvents, formDataToEventBatch } from 'hds-forms';

// Pre-fill form from existing Pryv events
const values = prefillFromEvents(itemDefs, events);

// Convert form submission to Pryv event batch
const batch = formDataToEventBatch(itemDefs, formData, timestamp);
```

## Test App

An interactive test application is included in `src-test-app/`. It provides a UI to exercise all components and field types with the real HDS model.

```bash
npm run test-app:setup   # install test app dependencies (one-time)
npm run test-app         # launch dev server
npm run build:app        # build test app into dist/ for gh-pages
```

## Prerequisites

- Node.js >= 20
- npm
- `hds-lib` (HDS model must be initialized before using components)

## Setup

```bash
npm run setup
```

## Development

```bash
npm run dev        # library watch mode
npm run build      # library build (outputs to js/)
npm run test       # run unit tests
npm run test:watch # run tests in watch mode
npm run lint       # check linting
npm run typecheck  # check types
```

## HTTPS for local development

The dev server runs over HTTPS on a `*.backloop.dev` hostname, which resolves to `127.0.0.1`.
Certificates come from the [`backloop.dev`](https://github.com/perki/backloop.dev-node) package,
installed directly from GitHub rather than npm.

**You need nothing to get started.** With no configuration the package downloads a shared,
self-signed certificate. Install it once per machine by following
<https://backloop.dev/public/>, and the browser warning goes away.

Two things worth knowing:

- **Firefox will not accept it**, because it ignores the system trust store. Use a Chromium-based
  browser, or supply your own certificate.
- **Bring your own certificate** from mkcert, Caddy, a company CA or openssl: point
  `BACKLOOP_DEV_CERT` and `BACKLOOP_DEV_KEY` at the PEM files and nothing is downloaded.

If you are updating an existing checkout, delete the stale copy first. npm does not replace a
package that moved from the registry to a git URL: it leaves the old directory in place while
`npm ls` reports the new version.

```sh
rm -rf node_modules/backloop.dev node_modules/vite-plugin-backloop.dev && npm install
```

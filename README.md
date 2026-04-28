# hds-forms

React component library for rendering forms from HDS item definitions. Converts HDS ItemDefs to form fields using Tailwind CSS styling, and handles bidirectional data conversion between form values and Pryv events.

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

Supported field types: `checkbox`, `date`, `text`, `number`, `select`, `composite`.

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

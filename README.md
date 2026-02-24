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

<HDSFormSection
  section={{ itemKeys: ['temperature', 'bloodPressure', 'notes'] }}
  values={prefilled}
  onSubmit={(formData) => console.log(formData)}
/>
```

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
npm run dev       # watch mode
npm run build     # production build
npm run lint      # check linting
npm run typecheck # check types
```

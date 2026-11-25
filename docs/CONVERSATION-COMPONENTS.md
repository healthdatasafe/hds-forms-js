# Conversation components (`hds-forms-js/conversation`)

1. [What this is](#1-what-this-is) · 2. [Quick start](#2-quick-start) · 3. [The thread model](#3-the-thread-model) ·
4. [The components](#4-the-components) · 5. [The hook](#5-the-hook-usedocumentconversations) ·
6. [Rules a host must not break](#6-rules-a-host-must-not-break) · 7. [Theming, texts, fallbacks](#7-theming-texts-fallbacks) ·
8. [The contact's side](#8-the-contacts-side-viewer-contact) · 9. [Testing your integration](#9-testing-your-integration) ·
10. [Versions and changes](#10-versions-and-changes)

## 1. What this is

The standard conversation between a person and a contact (a doctor, the HDS Reader, another service's AI) is defined by
the data model's [`documentation/CONVERSATION.md`](https://github.com/healthdatasafe/data-model/blob/main/documentation/CONVERSATION.md)
(data-model 4.22.0 to 4.27.0: codes in 4.24.0, the self-contained anchor and duplicates in 4.25.0, a document's date
and kind, her note and a document's values in 4.26.0, the `ready` notice in 4.27.0). Every item of that conversation
has a component here, so **any HDS app on either side of a conversation** renders it the same way: the person's app
(hds-webapp), a doctor dashboard, another AI's own UI. Nothing here tests who the contact is: the components dispatch on
the item's kind and code, never on an app code.

| hds-forms-js | needs hds-lib | data-model |
|---|---|---|
| 0.37.0 | ≥ 2.61.0 | ≥ 4.25.0 |
| 0.38.0 | ≥ 2.62.0 | ≥ 4.26.0 |
| 0.39.0, 0.40.0 | ≥ 2.63.0 | ≥ 4.26.0 |
| 0.41.0 to 0.46.1 | ≥ 2.63.0 | ≥ 4.27.0 |
| 0.47.0 to 0.49.0 | ≥ 2.69.0 | ≥ 4.33.0 |

The components are **presentational**: they take hds-lib `cmcConversation` views and callbacks, and do no I/O. All the
I/O sits in **one hook**, `useDocumentConversations` (§ 5), which reads every relationship's conversation and answers it
through hds-lib. hds-webapp's `src/pages/Chat.tsx` is a complete host.

**See them:** the test app's Conversation tab
([healthdatasafe.github.io/hds-forms-js/?tab=conversation](https://healthdatasafe.github.io/hds-forms-js/?tab=conversation),
`src-test-app/src/ConversationPanel.tsx`) shows the read-only components on fixtures: her app and a contact's app,
English and French, light and dark.

## 2. Quick start

**Install.** Since 0.42.0, `hds-lib`, `hds-feminine-cycle-ui` and `pdfjs-dist` are **peer dependencies**: the host
installs them and the library uses that one copy. Pin `hds-lib` at or above the minimum of § 1 (npm installs the
minimum in place of an older tag of the same repo, silently).

```json
"hds-forms-js": "github:healthdatasafe/hds-forms-js#0.49.0",
"hds-lib": "github:healthdatasafe/hds-lib-js#2.69.0",
"hds-feminine-cycle-ui": "github:healthdatasafe/hds-feminine-cycle-ui#0.13.1",
"pdfjs-dist": "6.4.299"
```

**CSS** (Tailwind v4, the library's tokens; see the README's Theming):

```css
@import "tailwindcss";
@import "hds-forms-js/css/tokens.css";
```

**A thread** (the person's side; the HDS model is initialized, `connection` is hers, `rels` her relationships with
`accessId`, `localCollectorStreamId`, `grantedPermissions`, `appCode`):

```tsx
import { Fragment, useEffect, useState } from 'react';
import { cmcDocuments } from 'hds-lib';
import {
  useDocumentConversations, useStepChoices, nextStep, conversationProgress,
  ConversationStepBubble, DocumentStatusBubble, ContactWorkingIndicator, workState
} from 'hds-forms-js/conversation';

function Thread ({ connection, rels, alertEventsKey, contactName, sourceOf }: ThreadProps) {
  const [documentAlerts, setDocumentAlerts] = useState<any[]>([]);   // hds-lib DocumentAlert + its `stream`
  useEffect(() => {
    const streams = rels.map(r => r.localCollectorStreamId).filter((s): s is string => s != null);
    Promise.all(streams.map(s => cmcDocuments.listDocumentAlerts(connection, s).then(l => l.map(a => ({ ...a, stream: s })))))
      .then(lists => setDocumentAlerts(lists.flat()));
  }, [connection, rels, alertEventsKey]);
  const { documents } = useDocumentConversations(connection, rels, { alertEventsKey, documentAlerts });
  const { choices, handlers } = useStepChoices();
  return <>
    {documents.map(doc => {
      const status = doc.status?.hds?.status ?? null;
      const progress = conversationProgress(doc.conversation, doc.engines, { status });
      const step = doc.checking ? null : nextStep(doc.conversation, doc.engines, { status, document: doc.document, ...choices[doc.key] });
      return <Fragment key={doc.key}>
        <DocumentStatusBubble title='Lab report' status={doc.status} notices={doc.notices} progress={progress} contactName={contactName} />
        {workState(doc.status, Date.now() / 1000) !== 'idle' && <ContactWorkingIndicator contactName={contactName} status={status} documentTitle='Lab report' sinceS={doc.status?.time} />}
        {step && <ConversationStepBubble key={step.key} step={step} conversation={doc.conversation} progress={progress}
          contactName={contactName} title='Lab report' sourceOf={sourceOf} actions={doc.actions} {...handlers(doc.key)} />}
      </Fragment>;
    })}
  </>;
}
```

`alertEventsKey` changes when an alert arrives (hds-webapp joins its alert events' `id:modified`); `sourceOf(attachmentId)`
returns her file as `{ url, kind: 'pdf' | 'image' }` for `AnchoredDocumentView`.

## 3. The thread model

**What the host renders and what the library renders.** The host owns the thread: its own messages and her own, the
message box, the order of documents, the titles it gives them, the files (`sourceOf`), adding and sharing a document.
The library renders the conversation items inside it: per document a `DocumentStatusBubble` (its state, "6 values · 1
question · 4 answered", "See everything" opening the `DocumentConversationCard` overview), her answers as her bubbles
(`ConversationAnswerBubble`; `answerRuns` folds a run of confirmations into "You confirmed 12 values"), the contact's
notices (`NoticeBubble`), and **one** `ConversationStepBubble` as the contact's last bubble: the next step, with replies
she just taps.

**The order of steps** (`nextStep`, a pure function of the conversation: leaving and coming back shows the same step):
`is-this-yours` (nothing is written before it, R3) → the document's date and kind when the contact proposes them (§ 4,
`proposed-document`) → the document's `which-date` → the questions about one value (a `choose` brings a re-proposal
while she goes on) → the values to `check` (one at a time, on the document) → once all of those are answered, the values
read clearly as **one batch turn** ("22 items have been found with a high level of confidence. Do you want to review
them one by one?", the list to see, "No, save them all" / "Yes, one by one"; `batchMin` 3, `Infinity` for strictly one by
one; never a value to check, one asked about or one her record holds) → the clear values one by one → one **summary**:
kept aside or unmapped ("Ask for it"), waiting for the contact (a re-proposal, an engine not vouched…), set aside
("Review the N set aside"), questions this version cannot answer, "N values already in your record" ("Add anyway"); "OK"
closes it. While the contact still works (`received`, `reading`) there is no step, only `ContactWorkingIndicator`; while
her app checks her record (`doc.checking`), none either.

**What "Later" means.** "Later" **writes nothing** (`onLater` → `StepOptions.deferred`): an answer `skip` would let the
contact delete the value once its work is `done` (R10), so the value stays open, the contact waits, and the summary
brings it back. `useStepChoices(store?, key?)` keeps these flow choices ("One by one", "Later", the summary closed,
"Review the ones set aside") for the session, under `hds.conversation.steps` in `sessionStorage` by default
(`store: null`: memory only; any `{ getItem, setItem }` otherwise). None of them writes to her account.
`handlers(docKey)` gives `onDeclineBatch`, `onLater`, `onAcknowledgeSummary`, `onReviewSkipped`; `choose(docKey,
choice)` sets any other `StepOptions`.

**What she types while a step waits** is her note on it (§ 4, Her note): the reply she taps carries it; the host's own
send button sends it alone (the contract's `skip` + `note`), after a one-line warning that it sets the item aside.

## 4. The components

| Component | Renders | CONVERSATION.md |
|---|---|---|
| `nextStep` + `ConversationStepBubble` | what she answers next, as the contact's last bubble with quick replies | the document's `question`, `proposed-value`, `proposed-document` events |
| `DocumentStatusBubble` | a document in the thread: its state, progress, notices, "See everything" | alert `task-status`, `notice` |
| `DocumentConversationCard` | one document's conversation at once (the overview): state, notices, questions, proposed values, actions | everything with the same `about` |
| `QuestionCard` | a question with what she needs to answer it, and its answer | event `question` (`code`, `options`, `context.identity` / `dates` / `anchor`, `candidateId`) |
| `DocumentFieldsEditor` | a document's kind and date as she changes them | answer to `proposed-document` |
| `ValueCorrectionEditor` | the value as she corrects it, with the item's own field and units | answer `correct` (`hdsExtraction.corrected`) |
| `DocumentValuesList` | a document's values: read from it, and also printed in it | `hdsDocumentValues`, `hdsPrintedIn` |
| `AnchoredDocumentView` | her document zoomed and highlighted where a value (or the identity) is printed | `anchor` (= `clientData.hdsSourceAnchor`) |
| `ContactWorkingIndicator` + `workState` | "HDS Reader is reading “Lab report”…" with moving dots and the time, like a typing indicator; then "No news from HDS Reader…" | alert `task-status` `received` / `reading` |
| `TaskStatusLine` | the state of the contact's work | alert `task-status` (`status`, `counts`, `errorCode`), R4, R8 |
| `NoticeBubble` | a notice from the contact | alert `notice` (`code`), R6, R12 |
| `ConversationAnswerBubble` | one of her answers, in words, on her side | event `answer` (`action`, `written`, `timePrecision`, `basis`, `note`) |

Each component's full props are its exported `…Props` type. Every component takes `className`; the bubbles and cards
take the host's own surface classes (`bubbleClassName`, `surfaceClassName`) so they look like its other bubbles. Touch
targets are 44 px. An action returns `{ ok: true, refused? } | { ok: false, reason }`; the component shows the
failure (`role=alert`).

### `ConversationStepBubble`

- **Purpose:** the step that waits for her (one by one), as a bubble from the contact with replies she taps.
- **Props:** `step`, `conversation`, `progress?`, `contactName`, `title`, `sourceOf`, `actions` (`null`: shown, no
  answer possible), `locale?`, `loadPdfJs?`, `pdfOptions?`; the flow callbacks of `useStepChoices`
  (`onDeclineBatch`, `onLater`, `onAcknowledgeSummary`, `onReviewSkipped`); her note (`note`, `onClearNote`,
  `onNoteAsMessage`, `noteAloneSignal`).
- **States:** a question (as `QuestionCard`); a value ("I read **Ferritine 48 ng/mL (30 - 400)**. Save it as Ferritin:
  48 µg/L?", "See it on the document", open from the start for a value to check; Confirm · Correct (the item's field,
  inline) · Already in my record · Later); a proposed document; the batch; the summary.
- **Binding:** the answer carries the `shownAt` of when this step first showed (R3); give the bubble `key={step.key}`.
- **Accessibility:** replies are a `role=group` named by the step; expandable parts carry `aria-expanded`; a failed
  answer is a `role=alert`.

### A proposed document (`proposed-document`, CONVERSATION.md § A document's date and kind)

A document shared into a chat waits for its date and kind (`clientData.hdsDocumentPending`, written by her app at
import: hds-webapp's `ImportPopup pendingFields`). The contact proposes both; `nextStep(conv, engines, { …, document })`
(the document event, `DocumentConversationData.document`) gives `{ kind: 'document', proposed, pending }` right after
`is-this-yours` (its `which-document-kind` / `which-document-date` questions first, as question steps). The bubble:
"This looks like a Laboratory report from 18 November 2026. Save that on the document?" (only the pending fields;
`check`: "I am not sure of the date." and the document on its anchor). Confirm → `actions.confirmDocument(candidateId,
undefined, shownAt)`; Change → `DocumentFieldsEditor` → `confirmDocument(candidateId, { documentKind?, time?,
timePrecision? }, shownAt)` (only what she changed); Later writes nothing. A host reads her documents again after an
answer with `applied`. Document kinds come from the pack (`documentKindLabel`, `documentKindOptions`).

### Her note (`answer.note`, at most `NOTE_MAX_LENGTH` characters)

While a step waits, what she writes in the chat line is a note: the host passes it as `note` (with `onClearNote`,
`onNoteAsMessage` for "Send as a message instead"); the bubble shows "Your note: “…” · goes with your answer" and the
reply she taps carries it (every `ConversationActions` method takes a trailing `note`). The chip says "{name} can read
it." and offers "Send the note alone": the contract's `skip` + `note` on the item (`dismiss(…, 'skip', …, note)`,
`answer({ action: 'skip' }, …, note)`, or `skipDocument` for a proposed document), with its warning; the host's own send
button does the same through `noteAloneSignal`. `ConversationAnswerBubble` shows it under her answer; `answerRuns` never
folds it. A contact that reads no notes says so once (`notice` `note-not-read`).

### `DocumentStatusBubble`

- **Purpose:** a document in the thread, from the contact's side of it.
- **Props:** `title`, `status`, `notices?`, `progress?`, `contactName`, `onOpenDocument?`, `saved?`, `expanded?` /
  `onToggle?` ("See everything"), `children?` (the overview the host renders when expanded), `bubbleClassName?`.
- **Texts:** `progressText` ("6 values · 1 question · 4 answered"), `statusText`.

### `DocumentConversationCard`

One document's conversation, all at once (the overview behind "See everything"): the state of the work and its notices;
`is-this-yours` first (nothing is confirmable before she says the document is hers, when the contact asked); the
document's questions; the values read, each with its printed line and what would be saved. A value opens "Can you
confirm this value is XYZ?" on `AnchoredDocumentView`, then Confirm, Correct, or "Already in my record". "Confirm the N
values read clearly" covers the `clear` values with nothing waiting (`batchCandidates`).

```tsx
<DocumentConversationCard
  conversation={cmcConversation.conversationOf(items, docId)}
  status={cmcConversation.taskStatusOf(alerts, docId)}
  notices={alerts.filter(a => a.kind === 'notice' && a.hds.about === docId)}
  engines={cmcConversation.vouchedEnginesFor(rel.appCode)}
  title='Lab report'
  contactName='Dr Martin'
  sourceOf={(attachmentId) => ({ url: fileUrl(attachmentId), kind: 'pdf' })}
  actions={{ confirm, correct, dismiss, answer }}   // each gets the card's shownAt; null: read-only
  onNotMyDocument={takeBack}                         // "This is not my document" when no is-this-yours was asked
/>
```

- **Callbacks:** `actions.confirm(candidateIds, shownAt)`, `correct(candidateId, correction, shownAt)`,
  `dismiss(candidateIds, 'skip' | 'request-item' | 'duplicate', shownAt)`, `answer(questionId, { action, option?,
  time?, timePrecision? }, shownAt)`. `shownAt` (`shownAtOf`) is the latest `modified` of what the card shows, on the
  server's clock (R3).
- **When a value is confirmable** (`rowBlock(conv, pv, engines, { status })`, null when it is): not when the document is
  not hers; not when hds-lib's `proposalRefusal` refuses it (answered, replaced, its status, its proposal, the engine
  not vouched for this relationship: R9); not while the contact still works (`received`, `reading`: its questions may
  still come); not before `is-this-yours` is confirmed; not while a question about it waits or a `choose` waits for its
  re-proposal; not without a date. `isWritten` wins over all (a value written stays written while the contact deletes
  what was answered, R10).

### `QuestionCard`

| `code` | Shows | Answers |
|---|---|---|
| `is-this-yours` | the printed name and birth date (`context.identity`) and "See it on the document" (`context.anchor`); without an identity, "No name or birth date could be read…" and "See the document" (on `context.anchor`, the header block); after a profile match, "Matched to your profile" and "Not mine" | `confirm`, `not-mine` |
| `which-date` | the dates the document prints (`context.dates`: day, printed text, label, role), another day, "I do not know" | `confirm` + `time` (12:00 UTC of the day) + `timePrecision: day`, or `timePrecision: unknown` |
| `which-unit` | the UCUM options as people read them (`1` "no unit (a ratio)", `10*6/mL` → 10⁶/mL, `uL` → µL) | `choose` + `option` |
| `which-specimen` | specimen codes by their hds-lib `SPECIMEN_CODES` label (`serum-plasma`, `whole-blood`, `citrated-plasma`, `rbc`, `urine`, `urine-24h`, `semen`, `csf`, `stool`, `saliva`; `other`, labelled by this library), or item keys by name | `choose` |
| `which-analyte` | item keys by their name | `choose` |
| `is-fasting` | Yes / No | `choose` |
| `which-document-kind` / `which-document-date` | the pack's document kinds / the dates it prints | `choose` / `confirm` + `time` |
| unknown or `x-…` | "… asks a question this app cannot answer yet", no buttons (R8) | — |

An option the version cannot label is shown, not selectable. Every choice question offers Skip (settles nothing).

### `DocumentFieldsEditor`

The document's kind (the pack's `documentKinds`) and date with its precision, prefilled with the proposal; returns
only what she changed, for `confirmDocument`.

### `ValueCorrectionEditor`

The item's own field (`HDSFormField`, prefilled) and, when the item offers several, its units; the result is checked like
a proposal (hds-lib `checkValueProposal`, R9) and returned as a `ValueCorrection`, which the host writes through
`acceptProposedValues` (never directly). The printed flag and interpretation are dropped; the reference range is kept only
in the same unit (`correctedClientData`). A refused correction is a `role=alert`.

### `DocumentValuesList`

`documentValuesOf(document, events)` → `{ source, matched }`: `source`, written from it (`clientData.related` + a
`sourceKey` of the document, or its `hdsDocumentValues` index); `matched`, values of hers it also prints, found already
in her record (`hdsPrintedIn`). `DocumentValuesList({ values, onOpenValue?, sourceOf?, dayText?, loadPdfJs?, pdfOptions? })`:
"Read from this document (n)", "Also printed here (n)" ("already in your record, not from this document"); nothing when
both are empty. A row is a button when the host passes `onOpenValue(eventId, event)`. `dayText(time, event)` gives its
date in the host's words: read the event's `clientData.hdsTimePrecision` (a value known to the month or the year has no
day), not its `time` alone. With `sourceOf`, a value read from
this document that carries `clientData.hdsSourceAnchor` gets "See it on the document" / "Hide the document" (an
`AnchoredDocumentView` under its row, `aria-expanded`); a value of the second group was read elsewhere and gets none.

### `AnchoredDocumentView`

Her own document (PDF through pdf.js, or a picture), zoomed onto an anchor's box and highlighted: a printed row opens
whole, with its value (zoomed to a readable line, from its label, only when it would be too small to make out); zoom out
to the whole page and back; pinch, drag, + / −. Props and the pdf.js setup: the README's section. A `role=region` named "Your
document, {label}", the page a `role=img`, loading and errors a `role=status`. Anchors are read through
`anchorOn(anchor, about)`: an anchor naming another document (`eventId`, data-model 4.25.0) is ignored (R11).

### `ContactWorkingIndicator` and `workState`

```tsx
{cards.filter(c => workState(c.status, nowS) !== 'idle').map(c =>
  <ContactWorkingIndicator key={c.key} contactName='HDS Reader' status={c.status?.hds?.status} documentTitle={c.title} sinceS={c.status?.time} />)}
```

The contact at work on a document, at the end of the thread: three moving dots, "… received “X” and is starting on it…", "… is
reading “X”…", "… is working…" (an unknown status), and the time since `sinceS`, the latest `task-status`'s `time`. With
`status='sent'` and the time of her share: "Sent “X” to …", before the contact's first status.

Past its time, it stops saying the contact works. Her app knows only the last status and its age, never whether the
contact runs: it must not say it stopped, nor promise what the contact will do.

| Last status | Reads as it says | Then |
|---|---|---|
| none yet (`sent`) | 5 min | "No news from … about “X” for 12 min." |
| `received` | 5 min | "… has “X” and has not started reading it yet (12 min)." ("over an hour" past one: a contact that waits says so again every 12 h), and no news past 13 h |
| `on-hold` (4.33.0) | at once, without dots | "… has “X” and cannot read it right now (12 min). You have nothing to do.", "over an hour" past one, and no news past 25 h (it is said again at least once per 24 h) |
| `reading`, or one it does not know (R8) | 10 min | "No news from …" |

Each is followed by "Your document is kept in your account." A new status is one more row of `workInProgress.ts`.

`workState(status, nowS)` is `idle` (settled, or no status), `working`, `not-started`, `on-hold` or `no-news`; `progressState` is the
same from a status and a time. A host stops showing the indicator at the latest after `NO_NEWS_INDICATOR_MAX_S` (a day): the
document's own line keeps saying it. The component moves its own clock; `nowS` fixes it. Announced politely, once per
state: the moving time is hidden from screen readers, which hear since when. `isWorking` (hidden after 30 minutes) is
deprecated.

### `TaskStatusLine`, `NoticeBubble`, `ConversationAnswerBubble`

- `TaskStatusLine({ status, errorCode, counts, contactName, sinceS })`: "Waiting for your answers · 5 values, 1 question",
  "Being read · 1:05" while in progress with `sinceS`, then "Reading started · no news for 12 min",
  "Done", "Could not be read" + the error (`no-attachment`, `write-failed`, `reading-failed`, else a generic text).
  `role=status`.
- `NoticeBubble({ code, contactName, timeText?, bubbleClassName? })`: `ready`, `no-result-found`,
  `several-sampling-dates`, `typed-text-not-read`, `note-not-read`; any other code a generic text. Never text from the
  contact (R6, R12).
- `ConversationAnswerBubble({ answer, conversation, locale, timeText?, onOpenValue?, bubbleClassName? })`: "You
  confirmed 5 values", "You corrected a value", "You gave the day of the sample: 18 November 2026", "You said the
  document is yours", "Matched to your profile", "You answered: mmol/L"… (`answerText`); it still says what it answered
  once the contact deleted the question (R10). A written value opens with `onOpenValue(eventId)`. Her answer with
  `basis: not-pending` (her app settled a proposed document with nothing left to apply) gets no bubble.

### Helpers

`rowBlock`, `batchCandidates`, `isWritten`, `alreadyInRecord`, `shownAtOf`, `anchorOn`, `workState`, `answerText`,
`questionAnswerText`, `answerRuns`, `optionLabel`, `unitText`, `statusText`, `noticeText`, `errorText`, `reasonText`,
`questionText`, `itemLabel`, `proposalText`, `printedText`, `dayText`, `dayToTime`, `valueDayText`, `proposedDateText`,
`documentKindLabel`, `documentKindOptions`, `correctedClientData`, `progressText`, `conversationText` (one text by key).

## 5. The hook: `useDocumentConversations`

`useDocumentConversations(connection, rels, options)` reads, per relationship with a system channel, the conversation
alerts on its collectors stream and the items on its two conversation children, settled per document
(`conversationOf`), with the actions that answer them. A document gets an entry only when it is shared in that
relationship, or covered by its grant (R11).

**Options:** `alertEventsKey` (changes when an alert arrives: read again), `documentAlerts` (hds-lib
`listDocumentAlerts` per relationship, each with its `stream`), `provisionStreams?(streamIds)` (create the items' model
streams before a value is written: an account that never used an item has none), `onGranted?()` (her app granted a
relationship its conversation children: read the relationships again), `autoConfirmIdentity?` (default true),
`autoMarkDuplicates?` (default true).

**State:** `documents` (per document: `key`, `rel`, `about`, `conversation`, `status`, `notices`, `engines` (the
vouched engines, R9), `time`, `checking`, `document`, `actions`), `answers` (her answers with their document),
`looseNotices` (notices about no shared document), `failed`, `reload()`.

**Actions** (`doc.actions`, `ConversationActions`): `confirm`, `correct`, `dismiss`, `answer`, `confirmDocument`,
`skipDocument`; each takes `shownAt` and a trailing `note`, writes through hds-lib, then reads the conversation again.

**What it does without a tap:**
- It reads again when an alert arrives, after each answer, and when the app comes back to the front.
- A contact that talks with no children yet gets them (her app creates and grants them, once per relationship and
  screen), then `onGranted`.
- **Profile match:** on `is-this-yours`, when the printed name and birth date match her profile, it answers `confirm`
  with `basis: profile-match`, once per document (`autoConfirmIdentity`).
- **Values she already has** (CONVERSATION.md § A value she already has): once the contact waits for her answers, it
  answers `duplicate` with `basis: existing-value` for the open values her record holds on that day, again for each value
  that arrives (`autoMarkDuplicates`); meanwhile `checking` is true and a host shows no step, so a value she has is never
  offered to save. The summary and the overview list them with "Add anyway" (a confirmation). The contact deletes them
  at `done`; the progress still counts them from her answers.
- **Not pending:** it answers `skip` (`basis: not-pending`) for a proposed document with nothing left to apply.
- **Notes:** it removes her notes once the contact's work is `done` (hds-lib `removeNotes`).

## 6. Rules a host must not break

The contract's rules (CONVERSATION.md § Rules) that a host can break by how it wires the components:

- **R3, an answer binds to what was shown.** Pass the `shownAt` the component gives; key `ConversationStepBubble` by
  `step.key` so a changed step gets a new one; write nothing before she answers (the hook's two automatic answers carry
  their `basis`).
- **R9, the proposal is checked before it is shown and before it is written.** Pass `doc.engines` (hds-lib
  `vouchedEnginesFor(rel.appCode)`) as they are; never widen them, never write a proposed value yourself (corrections go
  through `acceptProposedValues`).
- **R11, pointers resolve only inside the relationship.** Pass `documentAlerts` with the `stream` each was read from,
  and resolve anchors through `anchorOn` / `sourceOf` on her own files only.
- **R6 and R12, nothing from alert words.** Show notices and errors only through `NoticeBubble` / `TaskStatusLine`
  (fixed texts by code); never render a contact's text from an alert.
- **R10, retention.** Do not treat a deleted question or value as unanswered: her answers keep what they answered.

## 7. Theming, texts, fallbacks

**Theming.** Tailwind with the library's tokens (`css/tokens.css`: a `primary` scale derived from `--hds-primary`,
class-based dark mode; the README's Theming). Surfaces take the host's classes (`bubbleClassName`, `surfaceClassName`).

**Texts.** English and French, through hds-lib `localizeText`: the host sets the language with hds-lib
`settings.setPreferredLocales([...])`. `CONVERSATION_TEXTS` lists every key (`ConversationTextKey`), each `{ en, fr }`;
a language it lacks shows the English text. Specimen labels come from hds-lib `SPECIMEN_CODES` (en, fr, es), document
kinds and item names from the pack. Adding a language: add it to every entry of `CONVERSATION_TEXTS`, and to the
completeness tests (`tests/conversation.test.tsx`, `tests/docConversation.test.tsx`), which check French today.

**Fallbacks (R8, readers dispatch).**

| What arrives | What shows |
|---|---|
| a question code this version does not know, or `x-…` | "… asks a question this app cannot answer yet", no buttons |
| an option it cannot label | shown, not selectable |
| a `task-status` it does not know | "… is working…", "In progress" on the status line; with no newer one for 10 minutes, no news since |
| a notice code it does not know | "{name} sent a message this app cannot show yet." |
| an error code it does not know | "{name} could not finish this document." |
| a specimen code outside `SPECIMEN_CODES` (other than `other`) | the option shown, not selectable |

## 8. The contact's side: `viewer: 'contact'`

A contact's app (a doctor dashboard, a service's console, another AI's UI) shows the same conversation read-only, in its
own words (0.43.0). Pass `viewer='contact'` and her name (`personName`; "The person" without it):

- `ConversationAnswerBubble`: "Anna confirmed 5 values", "Anna set it aside", "Matched to Anna's profile", "Anna's note:
  fasting" (`contact.answer.*`, `contact.note`); the bubble sits on the other side (`bubbleIn`) and reads "From Anna" to
  a screen reader. `answerText(answer, conversation, locale, { viewer: 'contact', personName })` gives the same words
  alone.
- `TaskStatusLine`: its own work, "Not opened yet", "Reading started · no change for 12 min", "Waiting for Anna's answers · 5 values"; errors without naming itself
  ("This document could not be read yet; reading is tried again.").
- `DocumentConversationCard`: always read-only (`actions` is ignored); the state of the work as above, the questions and
  values as she was asked them.

Not offered to a contact yet: asking her a question or proposing a value from these components (`writeQuestion`,
`writeProposedValues` stay hds-lib calls); the contract has no labels for a third party's question yet (`x-` codes). To
change what a connected person shares, a contact sends `cmcScope.proposeDataSetUpdate` (she answers in her
conversation), never a second invite.

## 9. Testing your integration

- **Fixtures:** `src-test-app/src/ConversationPanel.tsx` builds her answers, statuses and notices as hds-lib's
  `parseConversationItems` gives them; copy them for your own component tests. The library's tests show each component
  per state under happy-dom: `tests/conversation.test.tsx`, `tests/docConversation.test.tsx`, `tests/oneByOne.test.tsx`,
  `tests/useStepChoices.test.tsx`.
- **A counterparty on test accounts:** a contact's side is hds-lib calls on her account through the relationship
  (`cmcConversation.writeQuestion`, `writeProposedValues`, `writeProposedDocument`, `postConversationAlert`). Script the
  scenarios you need (one day, undated with a unit question, duplicates, a proposed document, notices, `reading-failed`
  then a retry, an unknown code, a late proposal after `done`) on throwaway accounts, never on a real person's.
- **R9 in tests:** a proposal is confirmable only from a vouched engine; a scripted counterparty runs as that app, or
  the test passes `engines`. Never loosen the check in the host.

## 10. Versions and changes

Each [CHANGELOG](../CHANGELOG.md) entry states the hds-lib and data-model it needs (the table in § 1). Before 1.0 a minor
version may change an export; the CHANGELOG says so under **Changed** with what to use instead. Pin a tag, never a
branch, and read the entries between your pin and the new one before moving.

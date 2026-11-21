# Conversation components (`hds-forms-js/conversation`)

The standard conversation between a person and a contact (a doctor, the HDS Reader, another service's AI) is defined by
the data model's [`documentation/CONVERSATION.md`](https://github.com/healthdatasafe/data-model/blob/main/documentation/CONVERSATION.md)
(4.22.0, codes added in 4.24.0). Every item of that conversation has a component here, so **any HDS app on either side
of a conversation** renders it the same way: the person's app (hds-webapp), a doctor dashboard, another AI's own UI.
Nothing here tests who the contact is: the components dispatch on the item's kind and code, never on an app code.

The components are **presentational**: they take hds-lib `cmcConversation` views and callbacks, and do no I/O. The
host reads the conversation (`listConversationAlerts`, `conversationStreamsFor`, `listConversationItems`,
`conversationOf`, `taskStatusOf`) and writes the answers (`acceptProposedValues`, `answerQuestion`,
`answerProposedValues`), all in hds-lib. hds-webapp's `src/hooks/useConversations.ts` is a complete example of a host.

```ts
import {
  DocumentConversationCard, QuestionCard, ValueCorrectionEditor, AnchoredDocumentView,
  TaskStatusLine, NoticeBubble, ConversationAnswerBubble, ContactWorkingIndicator,
  rowBlock, batchCandidates, isWritten, shownAtOf, isWorking
} from 'hds-forms-js/conversation';
```

Texts: English and French, through hds-lib `localizeText` (the host sets the locale; `CONVERSATION_TEXTS` lists every
key). Styling: Tailwind with the library's tokens (`css/tokens.css`: `primary` scale, class-based dark mode); bubbles
and cards accept the host's own surface classes (`bubbleClassName`, `surfaceClassName`) so they look like its other
bubbles. Touch targets are 44 px.

## What maps to what

| Component | Renders | CONVERSATION.md |
|---|---|---|
| `useDocumentConversations` (hook) | reads every relationship's conversation and answers it (no UI) | all of it, the person's side |
| `nextStep` + `ConversationStepBubble` | what she answers next, as the contact's last bubble with quick replies (one by one) | the document's `question` and `proposed-value` events |
| `DocumentStatusBubble` | a document in the thread: its state, progress, notices, "See everything" | alert `task-status`, `notice` |
| `DocumentConversationCard` | one document's conversation at once (the "See everything" overview): state, notices, questions, proposed values, actions | everything with the same `about` |
| `TaskStatusLine` | the state of the contact's work | alert `task-status` (`status`, `counts`, `errorCode`), R4, R8 |
| `ContactWorkingIndicator` + `isWorking` | "HDS Reader is reading “Lab report”…" with moving dots, like a typing indicator | alert `task-status` `received` / `reading` |
| `NoticeBubble` | a notice from the contact | alert `notice` (`code`: `no-result-found`, `several-sampling-dates`, `typed-text-not-read`, `x-…`), R6, R12 |
| `QuestionCard` | a question with what she needs to answer it, and its answer | event `question` (`code`, `options`, `context.identity` / `dates` / `anchor`, `candidateId`) |
| (in the card) value rows and the review | a proposed value: the printed line, what would be saved, confirm / correct / skip / already in my record / ask for it | event `proposed-value` (`printed`, `proposal`, `status`, `reason`, `requestKey`, `anchor`) |
| `ValueCorrectionEditor` | the value as she corrects it, with the item's own field and units | answer `correct` (`hdsExtraction.corrected`) |
| `AnchoredDocumentView` | her document zoomed and highlighted where a value (or the identity) is printed | `anchor` (= `clientData.hdsSourceAnchor`) |
| `ConversationAnswerBubble` | one of her answers, in words, on her side | event `answer` (`action`, `written`, `timePrecision`, `basis`) |

## One by one: `useDocumentConversations`, `nextStep`, `ConversationStepBubble`, `DocumentStatusBubble`

perki: "The questions should appear like if I was chatting with someone, one by one, with proposals of action I can
just click." A thread shows each document as a `DocumentStatusBubble` (its state, "6 values · 1 question · 4
answered", "See everything" opening the `DocumentConversationCard` overview), her answers as her bubbles
(`answerRuns` folds a run of confirmations into "You confirmed 12 values"), and **one** `ConversationStepBubble` as the
contact's last bubble: the next step.

```tsx
const { documents } = useDocumentConversations(connection, relationships, {
  alertEventsKey,            // changes when an alert arrives
  documentAlerts,            // hds-lib listDocumentAlerts per relationship, each with its `stream` (R11)
  provisionStreams,          // create the items' model streams before a value is written
  onGranted                  // her app granted a relationship its conversation children: read the relationships again
});
const doc = documents[0];
const status = doc.status?.hds?.status ?? null;
const step = nextStep(doc.conversation, doc.engines, { status, ...choices });   // null: nothing to answer
{step && <ConversationStepBubble key={step.key} step={step} conversation={doc.conversation}
  progress={conversationProgress(doc.conversation, doc.engines, { status })} contactName='HDS Reader' title='Lab report'
  sourceOf={sourceOf} actions={doc.actions}
  onDeclineBatch={() => choose({ batchDeclined: true })}
  onLater={(id) => choose({ deferred: [...deferred, id] })}
  onAcknowledgeSummary={() => choose({ summaryAcknowledged: true })}
  onReviewSkipped={() => choose({ deferred: [], includeSkipped: true })} />}
```

**The order of steps** (`nextStep`, a pure function of the conversation: leaving and coming back shows the same step):
`is-this-yours` (nothing is written before it, R3) → the document's `which-date` → the questions about one value (a
`choose` brings a re-proposal while she goes on) → the values to `check` (one at a time, on the document) → once all of
those are answered, the values read clearly as **one batch turn** (perki: "22 items have been found with a high level
of confidence. Do you want to review them one by one?", the list to see, "No, save them all" / "Yes, one by one";
`batchMin` 3, `Infinity` for strictly one by one; never a value to check, one asked about or one her record holds) →
the clear values one by one → one **summary**: kept aside or unmapped ("Ask for it"), waiting for the contact (a
re-proposal, an engine not vouched…), set aside ("Review the N set aside"), questions this version cannot answer, "N
values already in your record" ("Add anyway"); "OK" closes it. While the contact still works (`received`, `reading`)
there is no step, only `ContactWorkingIndicator`.

**Values she already has** (CONVERSATION.md § A value she already has, hds-lib 2.61.0): once the contact waits for her
answers, `useDocumentConversations` answers `duplicate` with `basis: existing-value` for the open values her record
holds on that day (`autoMarkDuplicates`), again for each value that arrives; meanwhile the document's `checking` is true
and a host shows no step, so a value she has is never offered to save. They are never a step and never in the batch;
the summary and the overview list them with "Add anyway" (a confirmation). The contact deletes them at `done`; the
progress still counts them ("3 already in your record") from her answers.

**Anchors** are read through `anchorOn(anchor, about)`: an anchor naming another document (`eventId`, data-model 4.25.0)
is ignored (R11). `is-this-yours` without a printed identity shows the document at once, on its `context.anchor` (the
header block).

**A value step**: "I read **Ferritine 48 ng/mL (30 - 400)**. Save it as Ferritin: 48 µg/L?", "See it on the
document" (open from the start for a value to check), Confirm · Correct (the item's field, inline) · Already in my
record · Later. **"Later" writes nothing** (`onLater` → `StepOptions.deferred`): an answer `skip` would let the
contact delete the value once its work is `done` (R10), so the value stays open, the contact waits, and the summary
brings it back. The step's `shownAt` is when it first showed (R3).

**Typed text**: a message typed while a step waits stays a plain chat message (the contract has no comment on an
answer yet); the host shows "A message does not answer the question above." under its message box
(`conversationText('composerHint')`).

## A document's date and kind, her note, a document's values (4.26.0)

**Proposed document** (`proposed-document`, CONVERSATION.md § A document's date and kind). A document shared into a
chat waits for its date and kind (`clientData.hdsDocumentPending`, written by her app at import: hds-webapp's
`ImportPopup pendingFields`). The contact proposes both; `nextStep(conv, engines, { …, document })` (the document event,
`DocumentConversationData.document`) gives `{ kind: 'document', proposed, pending }` right after `is-this-yours` (its
`which-document-kind` / `which-document-date` questions first, as question steps). The bubble: "This looks like a
Laboratory report from 18 November 2026. Save that on the document?" (only the pending fields; `check`: "I am not sure
of the date." and the document on its anchor); Confirm → `actions.confirmDocument(candidateId, undefined, shownAt)`;
Change → `DocumentFieldsEditor` → `confirmDocument(candidateId, { documentKind? , time?, timePrecision? }, shownAt)`
(only what she changed); Later writes nothing. `useDocumentConversations` answers `skip` (`basis: not-pending`) for a
proposal with nothing left to apply; that answer gets no bubble. A host reads her documents again after an answer with
`applied`.

**Her note** (`answer.note`, at most `NOTE_MAX_LENGTH` characters). While a step waits, what she writes in the chat line
is a note: the host passes it as `note` (with `onClearNote`, `onNoteAsMessage` for "Send as a message instead"); the
bubble shows "Your note: “…” · goes with your answer" and the reply she taps carries it (every `ConversationActions`
method takes a trailing `note`). `ConversationAnswerBubble` shows it under her answer; `answerRuns` never folds it. A
contact that reads no notes says so once (`notice` `note-not-read`: "{name} does not read notes."). The hook removes
the note once the contact's work is `done` (hds-lib `removeNotes`).

**A document's values.** `documentValuesOf(document, events)` → `{ source, matched }`: `source`, written from it
(`clientData.related` + a `sourceKey` of the document, or its `hdsDocumentValues` index); `matched`, values of hers it
also prints, found already in her record (`hdsPrintedIn`). `DocumentValuesList({ values, onOpenValue?, dayText? })`:
"Read from this document (n)", "Also printed here (n)" — "already in your record, not from this document"; nothing when
both are empty.

**Specimen labels** come from hds-lib `SPECIMEN_CODES` (en, fr, es); document kinds from the pack
(`documentKindLabel`, `documentKindOptions`).

## `DocumentConversationCard`

One document's conversation with a contact, all at once (the overview behind "See everything"). It shows the state of the work and its notices; `is-this-yours` first
(nothing is confirmable before she says the document is hers, when the contact asked); the document's questions; the
values read, each with its printed line and what would be saved. A value opens "Can you confirm this value is XYZ?" on
`AnchoredDocumentView`, then Confirm, Correct, or "Already in my record". "Confirm the N values read clearly" covers
the `clear` values with nothing waiting (`batchCandidates`).

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

- `actions.confirm(candidateIds, shownAt)`, `correct(candidateId, correction, shownAt)`, `dismiss(candidateIds,
  'skip' | 'request-item' | 'duplicate', shownAt)`, `answer(questionId, { action, option?, time?, timePrecision? },
  shownAt)` → `{ ok: true, refused? } | { ok: false, reason }`. `shownAt` (`shownAtOf`) is the latest `modified` of
  what the card shows, on the server's clock: an answer binds to what was shown (R3).
- **When a value is confirmable** (`rowBlock(conv, pv, engines, { status })`, null when it is): not when the document is
  not hers; not when hds-lib's `proposalRefusal` refuses it (answered, replaced, its status, its proposal, the engine
  not vouched for this relationship: R9); not while the contact still works (`received`, `reading`: its questions may
  still come); not before `is-this-yours` is confirmed; not while a question about it waits or a `choose` waits for its
  re-proposal; not without a date. `isWritten` wins over all (a value written stays written while the contact deletes
  what was answered, R10).

## `QuestionCard`

| `code` | Shows | Answers |
|---|---|---|
| `is-this-yours` | the printed name and birth date (`context.identity`) and "See it on the document" (`context.anchor`); without an identity, "No name or birth date could be read…" and "See the document"; after a profile match, "Matched to your profile" and "Not mine" | `confirm`, `not-mine` |
| `which-date` | the dates the document prints (`context.dates`: day, printed text, label, role), another day, "I do not know" | `confirm` + `time` (12:00 UTC of the day) + `timePrecision: day`, or `timePrecision: unknown` |
| `which-unit` | the UCUM options as people read them (`1` "no unit (a ratio)", `10*6/mL` → 10⁶/mL, `uL` → µL) | `choose` + `option` |
| `which-specimen` | specimen codes (`serum-plasma`, `whole-blood`, `citrated-plasma`, `rbc`, `urine`, `urine-24h`, `semen`, `csf`, `stool`, `saliva`, `other`) or item keys by name | `choose` |
| `which-analyte` | item keys by their name | `choose` |
| `is-fasting` | Yes / No | `choose` |
| unknown or `x-…` | "… asks a question this app cannot answer yet", no buttons (R8) | — |

An option the version cannot label is shown, not selectable. Every choice question offers Skip (settles nothing).

## `ContactWorkingIndicator` and `isWorking`

```tsx
{cards.filter(c => isWorking(c.status, Date.now() / 1000)).map(c =>
  <ContactWorkingIndicator key={c.key} contactName='HDS Reader' status={c.status?.hds?.status} documentTitle={c.title} />)}
```

A typing indicator for the contact's work, at the end of the thread: "… received “X” and is starting on it…", "… is
reading “X”…", "… is working…" (an unknown status). `isWorking(status, nowS, maxAgeS = WORKING_MAX_AGE_S /* 30 min */)`
is true while the document's latest `task-status` is `received` or `reading` (or unknown: R8) and younger than
`maxAgeS`, so a contact that stopped without a last status never shows as working for ever. `role=status`,
`aria-live=polite`; the dots stand still under reduced motion.

## `TaskStatusLine`, `NoticeBubble`, `ConversationAnswerBubble`

- `TaskStatusLine({ status, errorCode, counts, contactName })`: "Waiting for your answers · 5 values, 1 question",
  "Done", "Could not be read" + the error (`no-attachment`, `write-failed`, `reading-failed`, else a generic text).
- `NoticeBubble({ code, contactName, timeText?, bubbleClassName? })`: `no-result-found`, `several-sampling-dates`,
  `typed-text-not-read`; any other code a generic text. Never text from the contact (R6, R12).
- `ConversationAnswerBubble({ answer, conversation, locale, timeText?, onOpenValue?, bubbleClassName? })`: "You
  confirmed 5 values", "You corrected a value", "You gave the day of the sample: 18 November 2026", "You said the
  document is yours", "Matched to your profile", "You answered: mmol/L"… (`answerText`); it still says what it answered
  once the contact deleted the question (R10). A written value opens with `onOpenValue(eventId)`.

## `ValueCorrectionEditor`

The item's own field (`HDSFormField`, prefilled) and, when the item offers several, its units; the result is checked
like a proposal (hds-lib `checkValueProposal`, R9) and returned as a `ValueCorrection`, which the host writes through
`acceptProposedValues` (never directly). The printed flag and interpretation are dropped; the reference range is kept
only in the same unit (`correctedClientData`).

## `AnchoredDocumentView`

See the README's section: her own document (PDF through pdf.js, or a picture), zoomed onto an anchor's box and
highlighted; zoom out to the whole page and back; pinch, drag, + / −. Used by the value review and by `is-this-yours`.

## Helpers

`rowBlock`, `batchCandidates`, `isWritten`, `shownAtOf`, `isWorking`, `answerText`, `questionAnswerText`,
`optionLabel`, `unitText`, `statusText`, `noticeText`, `errorText`, `reasonText`, `questionText`, `itemLabel`,
`proposalText`, `printedText`, `dayText`, `dayToTime`, `correctedClientData`, `conversationText` (one text by key).

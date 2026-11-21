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
| `DocumentConversationCard` | one document's conversation: state, notices, questions, proposed values, actions | everything with the same `about` |
| `TaskStatusLine` | the state of the contact's work | alert `task-status` (`status`, `counts`, `errorCode`), R4, R8 |
| `ContactWorkingIndicator` + `isWorking` | "HDS Reader is reading “Lab report”…" with moving dots, like a typing indicator | alert `task-status` `received` / `reading` |
| `NoticeBubble` | a notice from the contact | alert `notice` (`code`: `no-result-found`, `several-sampling-dates`, `typed-text-not-read`, `x-…`), R6, R12 |
| `QuestionCard` | a question with what she needs to answer it, and its answer | event `question` (`code`, `options`, `context.identity` / `dates` / `anchor`, `candidateId`) |
| (in the card) value rows and the review | a proposed value: the printed line, what would be saved, confirm / correct / skip / already in my record / ask for it | event `proposed-value` (`printed`, `proposal`, `status`, `reason`, `requestKey`, `anchor`) |
| `ValueCorrectionEditor` | the value as she corrects it, with the item's own field and units | answer `correct` (`hdsExtraction.corrected`) |
| `AnchoredDocumentView` | her document zoomed and highlighted where a value (or the identity) is printed | `anchor` (= `clientData.hdsSourceAnchor`) |
| `ConversationAnswerBubble` | one of her answers, in words, on her side | event `answer` (`action`, `written`, `timePrecision`, `basis`) |

## `DocumentConversationCard`

One document's conversation with a contact. It shows the state of the work and its notices; `is-this-yours` first
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

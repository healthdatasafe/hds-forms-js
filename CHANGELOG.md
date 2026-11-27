# Changelog

## [Unreleased]

## [0.61.0] - 2026-11-27

The forms side of data-model 4.47.0 (plan 128 SUB-F, L6). Released before any contact lists an anchored date (R8,
release order: forms and the webapp, then the engine).

### Added

- Text for the notice `pages-not-read` (4.47.0, a document read page by page) in en, fr, es, it, pt-BR; it names no
  page and no date (R6).
- **A date with its crop** (`which-date`, `which-document-date`; `context.dates[].anchor`, 4.47.0): a date carrying
  `anchor` is shown with the crop of her document where it is printed (`AnchoredDocumentView`), and its button
  appears only once the crop is shown. A date whose crop cannot be shown (the file cannot be read, the picture fails,
  an anchor on another document or without a usable box) is not offered as a one-tap date; "Another day" stays. A date
  without `anchor` is shown as before.
- `AnchoredDocumentView` `onStatus?: (status) => void` (`loading`, `shown`, `failed`, `page-missing`), and the type
  `AnchoredDocumentStatus`.
- `useDocumentConversations` option `otherNames?: OtherName[] | null` (default absent): her other names
  (`contact/other-name-v1` contents) are passed to hds-lib's profile match as `profile.otherNames` (R3, 4.47.0); a
  document tried before they arrived is tried again with them. Absent: her profile only, as before. Read by an hds-lib
  whose `ProfileForMatch` has `otherNames`; an older one ignores it.
- **"Remember this name"** (R3, 4.47.0): `QuestionCard` and `DocumentConversationCard` prop
  `rememberName?: { profile, otherNames, onRemember } | null`, **off by default**. When given, after her own `confirm`
  (no `basis`) on an `is-this-yours` whose printed name is none of her names, the card offers to save it; she accepts
  or changes its given and family parts, and `onRemember({ given?, family? })` is called (the host writes the event;
  nothing reaches the contact). Never in a contact's app. Also exported: `RememberNameOffer`, `nameToRemember`,
  `isKnownName`, `splitPrintedName`, `namesOf` and the types `OtherName`, `NamesForMatch`, `RememberedName`,
  `RememberNameOptions`. A host turns it on only after the production sweep of PROFILE.md § Other names.

## [0.60.0] - 2026-11-27

### Added

- Texts for the notices of data-model 4.45.0 (plan 128 SUB-F), in en, fr, es, it, pt-BR: `several-result-columns`,
  `lines-may-be-missing`, `grid-not-located` (never says the document is a chart), `kind-not-read`.

### Fixed

- `columns-not-read` (data-model 4.39.0, sent by engine 0.11.0 on demo) had no text: the app showed "sent a message
  this app cannot show yet". It now has its own words.

## [0.59.0] - 2026-11-27

### Added

- `DocumentFieldsEditor` `initial?: { documentKind?, day? }`: starting values that are hers (e.g. read from the file by
  the host), sent on Save unless she clears or changes them, so Save confirms them (the host shows they were read from
  the file). Until now only what differed from `proposal` was sent, so a pre-filled value she kept was lost. A kind the
  pack does not offer (unknown or deprecated), or a day that is not a real date, is ignored; read once, at mount. Without
  it, nothing changes (plan 144, 135-1).

### Removed

- The conversation text `composerHint` (all locales): nothing read it (plan 144, 135-4). A host that overrides or reads
  `CONVERSATION_TEXTS.composerHint` (or uses it as a `ConversationTextKey`) no longer typechecks; none in HDS does.

## [0.58.1] - 2026-11-27

### Fixed

- **`ChartReview`**: a day where she corrected one value while another was still open no longer asks "You recorded
  this day otherwise · Keep mine / Replace with the chart's" (which offered to put the misread value back over her
  correction). What she confirmed or corrected from this chart is the chart's own; a day is "recorded otherwise" only
  by a record made elsewhere. Seen in a demo run with planted errors (plan 139 R6).
- A proposed checkbox value without content (the mucus peak day) reads "Yes" ("Would be saved as Mucus peak day:
  Yes"), not "NaN.NaN.NaN": its day is said beside it (`proposalText`).

## [0.58.0] - 2026-11-27

### Added

- `useMethodNotation(itemKeys, { methodId })`: the notation in a given charting method instead of the signed-in
  person's preferred one, for a professional typing the chart of a person they follow in that chart's method. Without
  it, nothing changes. Type `MethodNotationOptions` exported.

### Changed

- Tested against the released hds-feminine-cycle-ui 0.19.1 and hds-lib 2.78.0 (dev pins); peer ranges unchanged.

## [0.57.1] - 2026-11-27

### Changed

- French: the notation picker's sticker row reads "Timbre" (was "Tampon"), the word of the French Creighton material and
  data-model (perki, 2026-11-27).

## [0.57.0] - 2026-11-27

Needs hds-lib ≥ 2.77.0 for the Creighton change (it fetches converter v2); with an older one nothing changes.

### Changed

- The notation picker honours an annotation's `notFor` (Creighton model v2, plan 136): the frequency row hides once
  the record can only be `0`, `0` alone is complete, and a frequency picked before is not stored with it
  (`annotationAppliesTo`, `recordOf`). `2`, `2W`, `4` still require one. Editing an older `0` that carries a
  frequency shows it; saving a new pick drops it.

## [0.56.1] - 2026-11-27

Needs what 0.56.0 needs.

### Changed

- **`ChartReview`**: the day she taps is detailed under its own row (through `CycleChart`'s `rowNote`), above the next row
  and the chart's legend, so on a phone it shows without scrolling past the legend. Nothing else moves.

### Fixed

- **`ChartReview`**: her records on days outside the chart's rows were counted under the chart as "not on the chart …
  outside these cycles"; a host passing her whole record had that line with all of them. They are left out of it now.
- **`ChartReview`** did not compile in a host built without `strictNullChecks` (its sources are type-checked by the
  host): a refusal's reason is read with `'reason' in`, as elsewhere.

## [0.56.0] - 2026-11-26

Needs hds-lib ≥ 2.74.0, data-model ≥ 4.39.0, as 0.55.0, and hds-feminine-cycle-ui ≥ 0.18.0 (peer, was ≥ 0.12.0).

### Added

- **`ChartReview`**: a paper chart read as a dated grid (Creighton), checked as a chart beside her own records
  (hds-feminine-cycle-ui `CycleChart`), the day she taps under it with its box on her document. Per day: Confirm, Change
  (one value), Not on my chart; recorded otherwise: Keep mine (`duplicate`), Replace with the chart's only with
  `onReplace`, asked twice; a box not read: Enter it myself (`onEnterDay`, her own form, then `skip`) or Skip; Previous /
  Next. A dated row can be confirmed at once, after its crop is shown, for its days read in full and not recorded; an
  undated row cannot. Refusals are kept per value: said on their day, marked "!" on the chart, counted above it. The host
  imports `hds-feminine-cycle-ui/cycle-chart.css`. Texts `chart.*` (en, fr, es, it, pt-BR). A day the same as her
  record stays one to check while its values are open: "Already in my record" (`duplicate`), on her tap.
- **`chartDraftOf(conversation, { streamOf?, written? })`**: the rows of a chart draft from a dated grid's proposed values
  (a row per page and `grid.row`, a day per box; `draft` / `edited` / `incomplete` / `unread`; dated by her
  `which-row-date` answer), with each day's candidate ids, boxes not read and anchor. `boxKey` is exported from labels.
### Fixed

- `hds-feminine-cycle-ui` was bundled into `js/` though it is a peer dependency (since 0.42.0): a host loaded a second
  copy. It is external now, like `hds-lib` and `pdfjs-dist`.
- A proposed observation of one field (`{ mucus: '10KL' }`) read while the converter is not loaded was said as JSON
  ("{"mucus":"10KL"} · X2"): it is said by its code ("10KL · X2 (creighton)").

### Added (test app)

- Test app: a Chart review tab (`?tab=chart`) on invented data; its hds-lib pin raised to 2.74.0 (2.69.0 has no
  `isDatedGrid`).

## [0.55.0] - 2026-11-26

Needs hds-lib ≥ 2.74.0, data-model ≥ 4.39.0 (`which-column-date`, plan 128 PER-COLUMN-READING.md § 9).

### Added

- A `which-column-date` question is answered like a `which-row-date`: the document opens on the marked column's heading
  (`context.anchor`), she types the day printed above it, with its year, or skips; she may change it until a value of the
  column is written. Asked with the row dates, before the value questions. Texts `column-date.label`, `question.which-column-date`
  (en, fr, es, it, pt-BR).

## [0.54.1] - 2026-11-26

Needs hds-lib ≥ 2.70.0, data-model ≥ 4.36.0, as 0.50.0.

### Fixed

- `MethodNotationPicker`: a stored record the picker does not offer (a Creighton H or M bleeding with a mucus code,
  saved before the picker) opens with "Recorded as: H 6C AD" above an unpicked picker, instead of an unpicked picker
  alone; the line goes once she picks. Test `[MNP-REC]`.

## [0.54.0] - 2026-11-26

Needs hds-lib ≥ 2.70.0, data-model ≥ 4.36.0, as 0.50.0.

### Changed

- **`ConsentPanel` and `HDSQuestionnaireForm` show their default texts in the current language** (English, French,
  Spanish, Italian, Brazilian Portuguese), labels a host does not pass included (hds-webapp passes neither `required`,
  `expiresAfter`, `mismatchWarning`, `accepting` nor `refusing`). New exports `CONSENT_TEXTS` / `consentLabels()` and
  `QUESTIONNAIRE_FORM_TEXTS` / `questionnaireFormLabels()`; `DEFAULT_CONSENT_LABELS` and `DEFAULT_QUESTIONNAIRE_LABELS`
  stay English.

### Fixed

- `ReminderEditor`: "Relative to" is a picker of the form's other items (it showed the key only); the data model's
  default reads its durations in words and its item by label, with no "[undefined]" when it has no days; a duration not
  in the list (`P10D`) is selected and shown instead of "—".
- `QuestionnaireBuilder`: a question key already used is refused in the builder's language; hds-lib's English message
  goes to the console only.
- `DatasetSearch`: "Use …" shows typed text holding `$&` or `$1` as typed.

## [0.53.0] - 2026-11-26

Needs hds-lib ≥ 2.70.0, data-model ≥ 4.36.0, as 0.50.0.

### Added

- **Filing a document as she confirms its kind (data-model 4.35.0).** `ConversationStepBubble` `filingOf`: the
  document's step, and Change under it, say where the document goes for that kind, who will now see it and who no longer
  will, with a tick; off by default when someone gains or loses it, or when not all its readers are known. What she ticked
  (`StepFiling`) comes back as the last argument of `ConversationActions.confirmDocument`; `useDocumentConversations`
  passes hds-lib `file`. Without `filingOf` nothing changes, and nothing is filed. One tick for the step and its Change;
  `StepFiling.key` (optional) is the host's own identity of the readers, so two readers with one name are told apart.
  Its texts in the five languages (es, it, pt-BR are machine drafts, as in 0.51.0).

### Fixed

- **A kind or a date she answered in a question is said on the document's step**, a kind with "you do not know its
  date" too. It was applied and not shown, and Confirm stayed off when the proposal had neither, or when she had answered
  that she does not know the date.

## [0.52.0] - 2026-11-25

Needs hds-lib ≥ 2.70.0, data-model ≥ 4.36.0, as 0.50.0.

### Changed

- **Her answer comes before her document.** In a step (a value, a proposed document) and in a question (`which-row-date`,
  `which-date`, `is-this-yours`), the buttons, the correction editor and the date field are right under the text, and "See
  it on the document" with the picture come after them. On a phone the picture took the screen and Confirm fell under it.

## [0.51.0] - 2026-11-25

Needs hds-lib ≥ 2.70.0.

### Added

- **Spanish, Italian and Brazilian Portuguese** for every text of the forms, the builders and the conversation (plan 138,
  machine drafts, native review to follow), including the dated-grid texts of 0.50.0.

## [0.50.0] - 2026-11-25

Needs hds-lib ≥ 2.70.0, data-model ≥ 4.36.0.

### Added

- **A dated grid is answered (data-model 4.36.0).** `which-row-date`: the box on her document, zoomed, and a date field (its
  year too, not a day to come); a step of its own, row by row, before the values; its answer can be changed while no value of
  the row is written. A box is named by its place ("Row 3, box 14: 10KL x2"), a box read in part says so, and the boxes with
  writing that were not read are counted (they are not results read). Steps and values follow the grid, never where a tilted
  picture puts a box. A value's day on such a document is its own alone (hds-lib `answeredDateOf`).

## [0.49.0] - 2026-11-25

Needs hds-lib ≥ 2.69.0, data-model ≥ 4.33.0, as 0.48.0 (the texts of a dated grid show with data-model 4.36.0 and hds-lib 2.70.0).

### Added

- **Texts for a dated grid (data-model 4.36.0, plan 128), en and fr:** the question `which-row-date` and her answer, the reason
  `not-read`. Texts only: the question is not a step yet, and `rowBlock` does not read hds-lib `answeredDateOf` yet.

### Fixed

- `FormBuilder` in another language: the item groups carry the label of their stream (they were the bare item prefix,
  "activity"), and a new questionnaire and its first question start in the language shown. English groups change too
  ("Physical Activity").

## [0.48.0] - 2026-11-25

Needs hds-lib ≥ 2.69.0, data-model ≥ 4.33.0, as 0.47.0.

### Added

- **How many results were read on a picture.** A picture may not be read in full, and nothing in an answer says so: the
  document's card, and its first step about values, say "12 results read on this picture. Compare with the page: a line may
  be missing." Told by `extraction.backend` (anything but `text-layer`).

### Changed

- **"Since 14:30" is one text per language, with its article** (plan 138): `time.sinceTime`, `sinceTimeOne`, `sinceDay`,
  `sinceDayVowel`, read into `{since}` of the conversation texts (Italian "dalle 14:30", Spanish "desde la 1:30"). English is
  unchanged; French says "depuis le 23 novembre", for a screen reader (it left the article out). `sinceText` replaces
  `momentText` (neither is exported).
- **The day beside a value**: `valueDayText` also says it for a value read from a picture, and for a value with no day of its
  own once she answered it (new optional argument: the conversation). "On {day}" replaces "sampled {day}", and the texts of
  the date answers no longer name a sample: the document may be a chart.
- `which-date` about the whole document says what the day is used for.

### Fixed

- **A picture she confirms values on stayed on "Opening your document…"** from the second value on: a cached picture loads
  before the view waits for it.
- **Answers are written one at a time.** The next step can be answered while the last one is still being written; two writes
  at once lost entries of the document's list of values.
- **Correct:** Save waits for a change (unchanged, it wrote "corrected") and for a complete value, and says which.
- **A date question shows her document** ("See the document", as "Is this yours?"): the days may have been read from a
  picture she has not open. On the value's line when it is about one, else on the first page.
- The same day printed under two roles no longer shares a React key.
- **A proposed cervical-fluid observation is said as it was read, with its frequency.** The line she confirms left it out
  ("10KL — … (Creighton)", the same for X1, X2 or none), and showed the observation converted to the method she displays.
  `proposalText`: "10KL — Stretchy, clear, lubricative · X2 — seen twice (Creighton)".
- **Correct opens in the method the value was read in.** With a method of her own it opened there, so a Creighton cell was
  corrected to a Billings record. `HDSFormField` and `Convertible`: `inputMethod`, the method a field opens in and keeps.
- **A refused value is said when the contact's alert was not posted.** The outcome was a success without the refusals, so a
  value that changed meanwhile was not saved and nothing said it.
- **Confirming again after a write that failed in the middle no longer says it failed.** The values already saved are refused
  as answered: ignored for a confirm (they show as saved). A correction refused so says the document was updated.

## [0.47.0] - 2026-11-25

Needs hds-lib ≥ 2.69.0, data-model ≥ 4.33.0.

### Added

- **How long, and no news, in a document's conversation.** `ContactWorkingIndicator` and the document cards count the time
  since the contact's latest `task-status` (`sinceS`; her share's while there is none: `sentAt`). Without a newer one they
  stop saying the contact reads: after 10 minutes of `reading` (or an unknown status), or 5 after her share, "No news from
  HDS Reader about “…” for 12 min"; after 5 minutes of `received`, "… has not started reading it yet (12 min)", and no news
  past 13 hours. On the card: "Reading started · no news for 12 min". They say what her app knows, never that the contact
  stopped. A screen reader hears since when, once. `workState`, `progressState`, `isInProgress`,
  `NO_NEWS_INDICATOR_MAX_S` for hosts.

- **`on-hold` (data-model 4.33.0): the contact has the document and cannot work on it now.** The indicator says so at once,
  without dots ("… has “…” and cannot read it right now (12 min). You have nothing to do."), the card "Waiting to be read";
  no news past 25 hours. Not settled: nothing is confirmable, except a proposed date and kind of the document, which stays
  answerable. A value that cannot be confirmed yet reads "… has not finished with this document yet" (it said "is still
  reading", untrue on hold).

### Deprecated

- `isWorking` and `WORKING_MAX_AGE_S` (the indicator disappeared after 30 minutes while the card said "Being read").

### Changed

- `FormBuilder`, `QuestionnaireBuilder`, `ReminderEditor`, `ItemSearchPicker`, `DatasetSearch` and `repeatableLabel` show their own texts in the current language (English and French) instead of English only; `labels` still win.
- `useDocumentConversations` (needs hds-lib 2.65.0): a document gets its conversation when the contact's grant reads it
  (`cmcDocuments.readsDocument`: its own share child, a stream under `documents`), not only when it reads every document
  or a current `document-shared` alert was sent. A document the platform hides from the contact (a stream at `none` or
  `create-only`) gets none unless shared. Every document talked about is read, in one batch per relationship. Her notes
  count as about an unshared document on the same rule, and not while the document could not be read. A permission
  changed at equal count reads the conversation again (plan 140).

### Fixed

- Her note on an answer is removed once the contact's `done` is later than it, also when the document is then read again or on
  hold (hds-lib 2.69.0, the new peer floor: `latestDoneOf`). It waited for the next `done`.
- `FormBuilder` and `QuestionnaireBuilder` keep the other languages of a text: an edit changes the language shown, as the
  host's own fields do. Before, an edit of a question or of a questionnaire's title was saved as English only and its
  other languages were lost, and a section's name was always shown and edited in English.

## [0.46.1] - 2026-11-24

### Changed

- `AnchoredDocumentView` opens on the whole printed row, so the value is in view with its label and unit. Before, a row
  wider than the view opened at a comfortable size from its left edge, and on a phone (or in a popup) only its label
  showed. A row under 6 px high (`LEAST_LINE_PX`) still opens that way.

## [0.46.0] - 2026-11-24

### Added

- `DocumentValuesList`: `dayText(time, event)` gets the value's event second, so a host can date a value as far as its
  date is known (`clientData.hdsTimePrecision`) instead of reading its `time` as an exact day (B-2026-11-23-5).

### Fixed

- `schemaFor` / `jsonFormForItemDef`: a composite date part whose eventType takes a partial date (allergy
  `lastOccurrence`) carries the eventType's `pattern`, not `format: date`, so a validator accepts a stored `2022` or
  `2024-03` (B-2026-11-24-1).

## [0.45.0] - 2026-11-23

### Added

- `missingRequiredParts(itemData, value)`: the parts of a composite's value that its eventType requires and that are
  blank (allergy-coded: `allergen`, `status`); `[]` for any other item. A host disables its save while it is not
  empty, so the generic form no longer writes an allergy with no status (B-2026-11-21-6).

### Fixed

- A composite date part whose eventType takes a partial date (allergy `lastOccurrence`: `YYYY`, `YYYY-MM` or
  `YYYY-MM-DD`) is a precision select (not known, year, month, day) with its year, month or day input. Before, a
  stored `2022` or `2024-03` showed as an empty date, and typing one replaced it with a full day (B-2026-11-21-10).
- `MultiSelect`: checkbox ids are per field (`useId`), not `ms-<value>`. Two multi-selects sharing an option value
  had the same ids, so a label could tick the other field's box (B-2026-11-21-9).

## [0.44.0] - 2026-11-23

Needs hds-lib ≥ 2.63.0, data-model ≥ 4.27.0.

### Added (plan 135, S6: other apps)

- `useStepChoices(store?, key?)`: her choices about the flow of each document's conversation ("One by one", "Later",
  the summary closed, "Review the ones set aside"), kept for the session in `sessionStorage` (key
  `hds.conversation.steps`, as hds-webapp kept them) or in a store the host passes; `handlers(docKey)` gives the four
  `ConversationStepBubble` callbacks. Moved from hds-webapp's `Chat.tsx` so a second app does not copy it.

## [0.43.1] - 2026-11-23

### Fixed

- `Select`: a required field with no value shows a disabled empty `--` placeholder. Before, it showed the first real
  option while its value stayed null, so the form looked filled and its Save stayed disabled (plan 133).

## [0.43.0] - 2026-11-23

Needs hds-lib ≥ 2.63.0, data-model ≥ 4.27.0.

### Added (plan 135, S6: other apps)

- `viewer: 'person' | 'contact'` and `personName` on `ConversationAnswerBubble`, `TaskStatusLine` and
  `DocumentConversationCard`: a contact's app shows her answers in the third person on its side ("Anna confirmed 5
  values", "Anna's note: …"), its own work ("Waiting for Anna's answers"), errors without naming itself; the card is
  always read-only for a contact. `answerText` / `questionAnswerText` take the same reader as a fourth argument;
  `personNameOf`, types `ConversationViewer`, `AnswerReader`. A test fails on an `answer.*` text without its
  `contact.answer.*`.

## [0.42.0] - 2026-11-22

Needs hds-lib ≥ 2.63.0, data-model ≥ 4.27.0 (unchanged from 0.41.0).

### Added (plan 135, S3)

- `DocumentValuesList sourceOf`: a value read from the document that carries `clientData.hdsSourceAnchor` gets "See it
  on the document", the document zoomed where it is printed (`AnchoredDocumentView`, with `loadPdfJs` / `pdfOptions`).
  `onOpenValue` also gets the value's event, second (additive).

### Changed (plan 135, S1 packaging)

- **`hds-lib`, `hds-feminine-cycle-ui` and `pdfjs-dist` are peer dependencies** with a minimum (hds-lib ≥ 2.63.0,
  hds-feminine-cycle-ui ≥ 0.12.0, pdfjs-dist ^6.4.299), no longer dependencies at an exact tag. A host installs them
  itself, and the library uses the host's copy: one `hds-lib` (it holds singletons, `getHDSModel`, `HDSProfile`) and
  one pdf.js (its worker must match its API). npm 7+ adds a missing peer on its own. With npm, a host whose own
  `hds-lib` pin is an older tag of the same repo gets the minimum installed in its place without an error, so bump the
  pin to match.
- CI: a `consumer-typecheck` job runs hds-webapp's `npm run typecheck` against the branch's sources (it needs the
  `HDS_CI_TOKEN` secret, hds-webapp being private, and skips green without it).

## [0.41.0] - 2026-11-21

### Added (plan 135, data-model 4.27.0)

- Notice `ready`: "{name} can read your documents: share one in this conversation" (CONVERSATION.md "Rendering
  `ready`"); `NoticeBubble detail` for the host's second line (the vouched app's description).

## [0.40.0] - 2026-11-21

### Added (plan 135, HDS3's live run on demo)

- `ConversationStepBubble noteAloneSignal`: the host's own send button, pressed while a step waits, sends the note alone
  (D-1; the host shows the warning first). With the host passing what she types as `note`, the note rides on the reply
  she taps without her pressing send.
- A proposed document without an anchor shows "See the document" (its first page); with one, "See it on the document".
- `DocumentStatusBubble saved`: once the work is `done`, "6 values saved · See them" (opens the document).
- `ContactWorkingIndicator status='sent'`: "Sent “X” to HDS Reader. Waiting for HDS Reader to start…", her app's state
  between her share and the contact's first task-status.

### Fixed

- `is-this-yours`: the printed birth date reads as a date in her language ("December 20, 1959") when it is a day
  (`birthDay`, or an ISO date printed), else as printed.

## [0.39.0] - 2026-11-21

### Added (plan 135, hds-lib 2.63.0)

- **Her note alone** (D-1): the note chip on a step offers "Send the note alone", the contract's `skip` with `note`
  (a value, a question, or a proposed document through `ConversationActions.skipDocument` → hds-lib
  `skipProposedDocument`), with its warning ("This sets the item aside; you can still confirm it until {name} has
  finished."); the chip says "{name} can read it."
- A test fails on a conversation text missing its en or fr.
- hds-lib 2.63.0.

### Fixed

- `conversationProgress` no longer counts her answer on a proposed document (`applied`, `not-pending`, its candidate) as
  a value ("14 values" for 13).
- Her `skip` reads "You set it aside" (was "You skipped").

## [0.38.0] - 2026-11-21

### Added (plan 135, data-model 4.26.0, hds-lib 2.62.0)

- **A document's date and kind, one by one.** `nextStep` gives a `document` step right after `is-this-yours` (its
  `which-document-kind` / `which-document-date` questions first) when the contact proposed them and a field still
  waits on the document (`StepOptions.document`, hds-lib `documentProposalRefusal`). `ConversationStepBubble`: "This
  looks like a Laboratory report from 18 November 2026. Save that on the document?", Confirm · Change
  (`DocumentFieldsEditor`: the pack's kinds, a day, "I do not know the date"; only what she changed is sent) · Later.
  `ConversationActions.confirmDocument` (hds-lib `acceptProposedDocument`). Her answers: "You confirmed the document's
  date and kind"; her app's `not-pending` skip shows no bubble.
- **Her note** (`answer.note`): every action takes a trailing `note`; `ConversationStepBubble` shows a draft (`note`,
  `onClearNote`, `onNoteAsMessage`) and sends it with the reply she taps; `ConversationAnswerBubble` shows it; a noted
  answer is never folded into a run; notice `note-not-read`.
- **`useDocumentConversations`**: reads the document event when the contact proposed its date and kind
  (`DocumentConversationData.document`); `autoSettleProposedDocuments` when nothing is left to apply; `removeNotes`
  once the contact is done (or 24 h after on not-mine / unshared); `note` and `confirmDocument` in its actions.
- **A document's values:** `documentValuesOf(document, events)` (source: `related` + `sourceKey`, or
  `hdsDocumentValues`; matched: `hdsPrintedIn`) and `DocumentValuesList` ("Read from this document (n)", "Also printed
  here (n)" — "already in your record, not from this document").
- Specimen labels from hds-lib `SPECIMEN_CODES`; document kinds by the pack's label (`documentKindLabel`,
  `documentKindOptions`); `proposedDateText`.
- `conversationProgress` leaves the document's own questions out of `questions`.
- hds-lib 2.62.0.

## [0.37.0] - 2026-11-21

### Added

- **The conversation one by one** (plan 128, perki: "like chatting with someone, one by one, with proposals of action
  I can just click"), for any contact and any HDS app:
  - `nextStep(conversation, engines, options)`: what she answers next about a document, a pure function of the
    conversation: `is-this-yours` → the document's date → questions about one value → values to check → the values read
    clearly as one batch turn, once every question and value to check is answered (perki: "X items have been found
    with high level of confidence, do you want to review them one by one?", "No, save them all" / "Yes, one by one";
    never a value to check, never one her record holds) → the clear values one by one → a summary (kept aside, waiting
    for the contact, set aside, unanswerable, already in her record with "Add anyway"). `conversationProgress`,
    `progressText` ("28 values · 1 question · 9 answered · 3 already in your record", counted also over what the
    contact deleted at `done`), `documentOrder` (the order the document prints).
  - **Values her record already holds** (hds-lib 2.61.0, `basis: existing-value`): `useDocumentConversations` runs
    `autoMarkDuplicates` once the contact waits for her answers and for each new value (`checking` meanwhile: no step
    yet; a value found stays so until the conversation read again shows it answered), `alreadyInRecord`, "Add anyway"
    in the summary and the overview; her app's answer reads "Your app found 5 values already in your record", not "You
    said…".
  - A cumulative report (values of several sampling days): each value says its day and printed time ("Would be saved
    as Ferritin: 12 ng/mL, sampled 5 November 2020, 08:30"), `valueDayText`; a one-day report does not.
  - `anchorOn(anchor, about)`: an anchor naming another document (`eventId`) is ignored (R11). `is-this-yours` with no
    printed identity shows the document at once, on the header block the contact anchored.
  - `<ConversationStepBubble>`: the step as the contact's last bubble with quick replies (Confirm · Correct · Already in
    my record · Later; the options of a question; the batch; the summary), the document on the value, `shownAt` from
    when it first showed. "Later" (`onLater`) writes nothing: a `skip` would let the contact delete the value once its
    work is done (R10).
  - `<DocumentStatusBubble>`: a document in the thread: its state, progress, notices, "See everything" (the
    `DocumentConversationCard` overview).
  - `useDocumentConversations(connection, relationships, options)`: the person's side of every relationship's
    conversation (read, settle per document, R11, answer through hds-lib with the item streams created first, the
    conversation children granted when a contact talks with none, `is-this-yours` answered on a profile match), moved
    here from hds-webapp so any HDS app gets the whole behaviour.
  - `answerRuns`: a run of single confirmations as one bubble ("You confirmed 12 values").
  - `QuestionCard variant='plain'`; `ValueLine`, `ValueReview`, `useConversationRun`, `blockText` shared by the card
    and the step.
  - `readSourceAnchor` reads the anchor's `eventId` (data-model 4.25.0); `anchorDocumentId(clientData)`: the anchor's
    document, else the one event `related` names.
  - hds-lib 2.61.0.
- **`docs/CONVERSATION-COMPONENTS.md`**: every conversation component, what it renders, the CONVERSATION.md kind and
  fields it maps to, props, texts and examples, for any HDS app on either side of a conversation.

## [0.36.0] - 2026-11-21

### Added

- **`<ContactWorkingIndicator>`: the conversation's standard "working" indicator** (plan 128, perki's request), as a
  typing indicator from the contact: three moving dots and what it does ("HDS Reader is reading “Lab report”…", "…
  received your document and is starting on it…", "… is working…" for a status this version does not know), on the
  contact's side, announced politely to screen readers, the dots still for reduced motion. `isWorking(status, nowS)`
  says when to show it: the document's latest `task-status` (R4) is `received` or `reading` (or unknown, R8: in
  progress) and less than `WORKING_MAX_AGE_S` (30 min) old, so a contact that stopped without a last status never
  shows as working for ever; `awaiting-answers`, `done`, `error` or a newer status remove it. No data-model change:
  the contract's statuses already say it. en, fr.

### Fixed

- **"Is this document about you?" with no printed identity showed only the two buttons** (perki's live test): when the
  contact read no name or birth date (the question then carries no `context.identity`), the card now says so and
  offers "See the document" (her own document, its first page, zoomable); with an identity but no anchor, "See it on
  the document" opens the first page too. With both, unchanged: the printed name and birth date, and the document
  zoomed and highlighted on them.

## [0.35.1] - 2026-11-21

### Added

- **The conversation's two data-model 4.24.0 codes in words** (en, fr), instead of the generic text for an unknown
  code (R8): the notice `several-sampling-dates` (a cumulative report, one column per sampling day: the contact
  proposes nothing from it) and the `task-status` error `reading-failed` (the contact could not read the document
  yet and tries again by itself; she has nothing to do).

## [0.35.0] - 2026-11-21 (plan 128 P2; with plans 131 and 134, merged before it)

### Added

- **The person's side of a standard conversation with a contact, in `hds-forms-js/conversation`** (data-model 4.22.0
  `documentation/CONVERSATION.md`, plan 128 P2), for any relationship: the components render hds-lib 2.59.0
  `cmcConversation` views and call back the host, which reads and writes through hds-lib.
  - **`<DocumentConversationCard>`**: one document's conversation. The state of the work (`task-status`, R4), its
    notices, the questions with their context, and the values read from the document, each with its printed line and
    what would be saved. A value opens "Can you confirm this value is XYZ?" with her document zoomed and highlighted on
    where it is printed (`AnchoredDocumentView`), then Confirm, Correct (the item's own field), or "already in my
    record". "Confirm the N values read clearly" covers the clear ones; a value to check is confirmed only through the
    document. Nothing is confirmable while the contact still reads (it writes its values before its questions), before
    she says the document is hers when it asked, while a question about the value waits, before the contact
    re-proposes after her choice, or without a date; a value the contact cannot propose (R9: the engine is not vouched
    for this relationship) says so. A value written stays written while the contact deletes what was answered (R10).
    "This is not my document" answers `is-this-yours`, or hands the document back to the host when none was asked.
    The answer carries the card's `shownAt` (the latest `modified` of what it shows, the server's clock: R3).
  - **`<QuestionCard>`**: `is-this-yours` with the printed name and birth date (and the document on them),
    "matched to your profile" with "Not mine" after an automatic answer; `which-date` with the dates the document
    prints, another day or "I do not know"; `which-specimen`, `which-unit`, `which-analyte`, `is-fasting` with their
    options (an option this version cannot label is shown, not selectable); an unknown or third-party code is shown,
    not answerable (R8).
  - **`<ValueCorrectionEditor>`**: the value as she corrects it, with the item's field (`HDSFormField`) and its units,
    checked like a proposal (`checkValueProposal`); the printed flag and interpretation are not carried, the reference
    range only in the same unit.
  - **`<TaskStatusLine>`, `<NoticeBubble>`, `<ConversationAnswerBubble>`**: the state of the work, a notice (a code,
    never text from the contact), one of her answers in words (it still says what it answered once the contact deleted
    the question). Hosts give the bubbles and the card their own surface (`bubbleClassName`, `surfaceClassName`).
  - Option labels: the HDS Reader's specimen codes (`serum-plasma`, `whole-blood`, … `other`), UCUM units as people
    read them (`1` "no unit (a ratio)", `10*6/mL` → 10⁶/mL, `uL` → µL: `unitText`), item keys by their name.
  - Pure helpers: `rowBlock` (why a value cannot be confirmed now), `batchCandidates`, `isWritten`, `shownAtOf`,
    `answerText`, `optionLabel`, `unitText`, `statusText`, `noticeText`, `reasonText`, `questionText`, `proposalText`,
    `printedText`, `correctedClientData`. Every text in English and French (`CONVERSATION_TEXTS`, `localizeText`).

### Changed — conversation

- `hds-lib` 2.49.0 → 2.59.0 (the conversation types and helpers).
- `AnchoredDocumentView`'s zoom buttons follow the library's tokens and dark mode.

### Added — notation picker for a charting method (Creighton: sticker, number, letters)

- `useMethodNotation(itemKeys)` and `MethodNotationPicker`: the person's charting method enters several items as one
  record (mucus and bleeding). Each `onChange` patch has one entry per item the picker writes, all `undefined` while
  the picks are incomplete; `NotationState` says whether the record is empty, valid, and how it is written ("L 6C").
- The picker is a facet filter over the method's records (`schema/notationFacets.ts`, `schema/methodNotation.ts`):
  a choice that leads to no record is not shown, a tap on a picked choice releases it. Everything comes from the
  model data: the offered codes and their `parts`, the method's `notation` rows and words (data-model), the sticker
  and bleeding letters (hds-feminine-cycle-ui spec). A change in the model's generator changes the choices with no
  code change.
- Stable styling hooks: `data-hds-notation-row`, `data-hds-notation-choice`, `data-hds-notation-record`.

### Changed

- `Convertible`: for a method whose definition carries `notation` (Creighton), its rows replace the stamp grid for
  the mucus field. An incomplete or cleared pick clears the value. Other methods keep the stamp grid.
- (plan 131) `Convertible` reads `{ mucus }` and case-folded values; options not offered are hidden.

## [0.34.0] - 2026-11-20

### Added

- **`hds-forms-js/conversation`, a new subpath for the components of a conversation with the person**, starting with
  **`<AnchoredDocumentView>`**: the person's own document, zoomed onto where a value is printed and highlighted, for
  "can you confirm this value?" (HDS Reader). It takes the file (`source: { url, kind: 'pdf' | 'image' }`) and the
  value's anchor (`clientData.hdsSourceAnchor`: page and `bbox` in percent of the page, origin top left); with no box
  it shows the page with no highlight and says so. She zooms out to the whole page and back to the value with one
  button, and pinches, drags and uses the + / − buttons and keys; buttons are 44 px touch targets, texts in English
  and French. On a phone a whole printed row is shown readable (a line at least 18 px tall), from its left edge where
  the label is printed. The host's confirm / correct controls go in as `children`. A PDF's anchored page is drawn by
  pdf.js (`pdfjs-dist` 6.4.299, the version hds-webapp uses, loaded only when a PDF is shown); a host that already
  loads pdf.js passes its own `loadPdfJs` and `pdfOptions`. Helpers: `readSourceAnchor` (reads and checks
  `hdsSourceAnchor`; a bad box is dropped, the page kept), `anchoredAttachment` (the attachment an anchor points into,
  with its kind), and the framing functions (`frameBox`, `fitPage`, `zoomAt`, `panBy`).
- **Test app: a "Document" tab** showing `AnchoredDocumentView` on a PDF or picture opened with its picker or given as
  `?src=<address>`, prefilled with the anchor of the haemoglobin line of the HDS Reader's synthetic report
  s-lab-fr-0001 (`?tab=document` opens it). The document itself is not published with the app.

### Fixed

- **Test app: it did not start** (`hds-feminine-cycle-ui` "does not provide an export named `RECORDED_PEAK_ITEM`"):
  hds-react-timeline needs the app's cycle-ui 0.11, and Vite resolved this library's own older copy (0.8.3). The app
  now dedupes `hds-feminine-cycle-ui`, as it does `hds-lib` and the timeline.

## [0.33.8] - 2026-11-20

### Fixed

- **The section form's default date was the UTC day, and a recurring entry was timed at UTC midnight**
  (B-2026-11-20-7). In Switzerland an entry made between midnight and 1–2 am defaulted to the day before, and a
  recurring entry landed at 01:00/02:00 local (west of UTC: on the previous evening). Both now use the local day:
  `todayString()` reads local date fields and `__time` is local midnight of the chosen date (`src/components/localDate.ts`).
- **Untranslated texts in the section form and the convertible field** (B-2026-11-20-8): "Date", "Add entry",
  "Submit", the entry list's "Previous entries" / "Actions" / "Edit" / "Delete", and Convertible's loading and
  unavailable messages, "Input method", "-- Select method --" and "Source" now go through `localizeText` with French
  values (`src/components/formTexts.ts`). English wording is unchanged.

### Tests

- **allOrNothing "coded form companions" no longer flakes** (B-2026-11-20-16): DatasetSearch's mount-time fetch of
  `{endpoint}/sources` hit the network (a ≈2.4 s DNS lookup of `example.invalid`) and pushed the test past the 5 s
  timeout under load. The test stubs `fetch`; it now runs in under 10 ms.

## [0.33.7] - 2026-11-18

### Fixed

- **QuestionnaireBuilder wrote the drug filter's code system as `atc`**, while datasets-service and the medication
  events it codes use `ATC`. New filters now default to `ATC`. A system already stored on a request is kept as is:
  the one reader of `params.drug` (hds-webapp's prefill) compares systems case-insensitively, so stored `atc`
  requests keep matching and need no migration.

### Documentation

- **README pin example: IVF is SNOMED `52637005`, not `63487001`** (*Assisted fertilization*, the same slip data-model
  corrected in 3.5.0). The example value now has the shape a datasets-service search returns (`system: 'SNOMED-CT'`,
  `source`, and the `hdsId` that `treatment/coded-v1` requires on each code), so a copied pin writes a valid event.

## [0.33.6] - 2026-11-17

### Fixed

- **0.33.5 did not typecheck in consumers below ES2022**: the "yes again" restore used `Object.hasOwn`, which a
  consumer compiling this package's sources with an older `lib` (hds-webapp) rejects. It uses
  `Object.prototype.hasOwnProperty.call`; no behaviour change. Use 0.33.6, not 0.33.5.

## [0.33.5] - 2026-11-17

### Added

- **`HDSQuestionnaireForm` takes its texts from the app** (plan 115, found on demo in the French hds-webapp): the four
  answer choices ("Yes", "No", "I don't know", "I'd rather not say"), the reason label and its placeholder were
  hard-coded in English, so a French form showed French questions with English choices. A `labels` prop
  (`QuestionnaireFormLabels`, partial) sets them; anything left out falls back to `DEFAULT_QUESTIONNAIRE_LABELS`
  (English, the previous texts). `[QFL-1]`, `[QFL-2]`.

### Fixed

- **Back to "yes" keeps the prefilled records** (plan 115): choosing another answer for a question the prefill had
  set to "yes", then "yes" again, reset its references to none, so the person was told no record matched and the
  answer could not be saved. "Yes" now restores the references the prefill found for that question (`initialAnswers`);
  a question the prefill did not answer still starts with none. `[QFL-3]`.

## [0.33.4] - 2026-11-16

### Fixed

- **Questionnaire answers keyed `__proto__` are kept** (B-2026-11-16-21): `prefillQuestionnaire` and
  `HDSQuestionnaireForm`'s answer state assigned `answers[key] = ...`, which sets the prototype for a question key
  named `__proto__` instead of adding it, so that answer was lost on prefill and on submit. Both now build the map with
  `Object.fromEntries`; prefill answers come back in the request's question order. Tests with the keys `__proto__`,
  `constructor`, `toString`, `valueOf` and `hasOwnProperty` (`questionnaire.test.ts`, `questionnaireFormKeys.test.tsx`).

## [0.33.3] - 2026-11-16

### Fixed

- **Red text and icons at AA** (B-2026-11-16-12, WCAG 1.4.3 / 1.4.11): the required-field `*` (`TextInput`, `Select`,
  `DateInput`, `Slider`, `NumberInput`, `MultiSelect`, `DatasetSearch`, `Convertible`) and `Convertible`'s "Converter
  engine not available" were `text-red-500` (3.8:1 on white, 3.6:1 on gray-50, 3.9:1 on the dark card). They are now
  `text-red-600 dark:text-red-300` (4.8:1 / 4.6:1 in light, 7.6:1 on gray-800 and 5.4:1 on gray-700 in dark).
  `DatasetSearch`'s companion "all or nothing" hint on the gray-700 panel goes from `dark:text-red-400` (3.6:1) to
  `dark:text-red-300` (5.4:1). `FormBuilder`'s section and item remove `×` were `text-red-400` with no dark variant
  (2.9:1 on white); they are now `text-red-600 dark:text-red-300` (4.8:1 on white, 5.4:1 on the dark hover row).
  The other red messages (`Composite`'s hint, `EventDurationInput`, `QuestionnaireBuilder`'s key error) and
  `EntryList`'s delete `✕` take the same pair, so red text passes on a gray-700 surface too; no `red-400` / `red-500`
  is left.

## [0.33.2] - 2026-11-16

### Fixed

- **Field edges at 3:1** (B-2026-11-15-15, WCAG 1.4.11): inputs, selects, textareas, checkboxes, the outline buttons
  and the scale's segmented control had hard-coded `border-gray-300` (#D1D5DB, 1.47:1 on white) and
  `dark:border-gray-600` / `-500` (about 1.9:1 on the dark fields), so hds-style 0.5.2's `--hds-input` did not reach
  them. They now use `border-[color:var(--hds-input,#848c97)]` in light and dark (#848C97 in every hds-style 0.5.2
  palette: 3.4:1 on white, 4.2:1 on gray-800). Without hds-style the fallback is the same #848C97. Decorative borders
  (cards, dividers, dashed "add" buttons, a pinned concept's static label) are unchanged.

## [0.33.1] - 2026-11-14

### Fixed

- **Primary buttons readable in dark** (plan 121 WP 5): from hds-style 0.5.0 dark primary is a light colour with dark
  text on it, so white text on `bg-primary-*` fell below AA (it was 3.6:1 already on the old dark blue). In dark the
  submit buttons (`HDSQuestionnaireForm`, `HDSFormSection`), the consent button (`ConsentPanel`), the builder's add
  button (`QuestionnaireBuilder`) and a selected scale option take `--hds-primary` with `--hds-primary-foreground`.
  Light unchanged.

## [0.33.0] - 2026-11-13

### Fixed

- **Every field has an accessible name** (B-2026-11-13-6): `TextInput`, `Select`, `DateInput`, `Checkbox` and `Slider`
  tie their visible label to the control (`useId` + `htmlFor`), so a composite's parts (a care visit's "Type of
  visit", "Reason", "Notes") are announced by name. `EventDurationInput` is a `role="group"` named by its "Duration"
  label, and its unit select is named "Unit". `Convertible`'s method, component and dimension selects carry their
  label as `aria-label`. Tests `accessibleNames.test.tsx`.

## [0.32.0] - 2026-11-13

### Added

- **Durations in `formDataToActions`** (plan 124 1.6, plan 46 follow-up): a 6th argument, a per-itemKey duration
  (`EventDurationInput`'s value: seconds, `null` ongoing, `0` none) for items with a `duration` block. Written on a
  created event (a checked activity included; `0` is left out) and on an updated one (`0` clears a span).

### Changed

- **`EventDurationInput` speaks the current language** (en, fr): its label ("Duration" by default instead of
  `event.duration`), modes, units and errors. A required duration that may be ongoing starts on Ongoing and now emits
  `null` on mount, so the host holds the value it shows.

## [0.31.0] - 2026-11-13

### Added

- **Plausibility warnings** (B-2026-11-05-6): `HDSFormField` shows a warning under an item's value when it looks
  implausible: a systolic not above its diastolic, a blood-pressure part, weight, height, temperature or heart rate out
  of its range for the unit chosen (so a value typed in the wrong unit falls out), with adult ranges when the age is
  known (`ageYears` prop, else the hooked `HDSProfile` date of birth). Warnings only; `plausibility={false}` turns them
  off. Helpers exported: `plausibilityWarnings`, `plausibilityText`, `ageInYears`.
- **Same-day duplicates**: `sameDayEntries` (the entries of an item on the day of a new value: all of them for an item
  entered once a day, `isOncePerDayItem`, else those with the same value and unit), for the host to ask before saving.

## [0.30.0] - 2026-11-12

### Added

- **A form overrides a slider's anchors** (B-2026-11-12-1): `HDSFormField` applies `labelOverrides.sliderLabels`
  (hds-lib 2.49.0 `ItemLabels.sliderLabels`, keyed by raw value) over the item's `slider.labels`, per anchor, for a
  single form and for each form when several ask the item. The EQ-5D-5L preset uses it for EuroQol's VAS anchors.
  `mergeSliderLabels` in `src/components/sliderLabels.ts`. Tests `[SLO1-4]`.

### Changed

- hds-lib 2.43.0 → 2.49.0.

## [0.29.3] - 2026-11-10

### Fixed

- **`PryvConnectionLike.get`** resolves `unknown`, like pryv's `Connection.get` (`Object | Object[]`), so a pryv
  `Connection` is accepted by `prefillQuestionnaire` without a cast (B-2026-10-26-27). The prefill reads `events` off
  the answer as before.

- **A deploy waits until the site serves it** (2026-11-08, B-2026-11-06-12): `scripts/deploy.sh` used to report success once
  the Pages branch was pushed, even when GitHub's own Pages deploy then failed and the previous build kept serving.
  It now runs `scripts/verify-pages.sh` (same helper as hds-webapp), which waits until the site's `version.json`
  names the commit just built, re-runs a failed `pages-build-deployment` run once, and fails (non-zero, with the
  run link) otherwise. `VERIFY_PAGES_TIMEOUT` (default 900 s).

## [0.29.2] - 2026-11-06

### Changed

- **hds-lib 2.43.0** (from 2.40.0): pryv 3.19.0 (pryv/lib-js#81, auto-login checks `requestedPermissions`), with
  2.41.0 (medication readers) and 2.42.0 (CMC vouching) in between. hds-lib is pinned by git tag, so a consumer on
  hds-lib 2.43.0 now gets one copy instead of two (DysNet had an npm `overrides` entry for it). No code change.

## [0.29.1] - 2026-11-04

### Fixed

- **A search pick no longer locks an invalid companion value.** `extractCompanionDefaults` pre-filled any value the
  search result had, `null` included, and `DatasetSearch` locks every pre-filled key read-only. datasets-service returns
  `route: null` / `doseUnit: null` for many medications, so the saved event carried `intake.route: null`, invalid
  under the intake schema (string + enum), with no way for the user to change it. Only a non-null value, inside the
  field's enum when it has one, is pre-filled now; the rest stays an ordinary input. Same rule for item pins and for
  reopening an entry, which use the same function. Found in the data-model 3.47.0 review (plan 120). Tests in
  `tests/companionDefaults.test.ts`.

## [0.29.0] - 2026-11-04

### Changed

- **`DatasetSearch` does not ask for the data-model 3.46.0 medication fields.** Every top-level property of a
  datasource-search type other than the concept became a companion input, so with a 3.46.0 pack every coded medication
  form would have shown raw "Status", "Skip Reason" and "Stop Reason" selects (`medication/coded-v1`), and "Status",
  "Status Changed", "Stop Reason" on `medication/prescription-v1`. Those are now hidden, and so are `timeOfDay`,
  `when` and `bounds` inside `intake` / `posology`: arrays were never rendered, and a half-filled `bounds` would break
  its `dependencies` / `not` rules. The host writes them from its own screens; an edit carries the stored values
  through unchanged. `CompanionSchema` gains `hidden` (the hidden top-level keys). Load data-model 3.46.0 only with
  this version or later. Tests in `tests/datasetSearch.test.tsx`.

## [0.28.1] - 2026-11-04

### Changed

- **hds-lib 2.40.0** (from 2.20.0; pryv 3.18.0, `@pryv/cmc` 3.23.0). No code change: the library calls neither
  `accessInfo()` nor `username()`, whose rejection of a refused token is the one behaviour change in pryv 3.18.0
  (pryv/lib-js#80). A consumer on hds-lib 2.40.0 now resolves a single hds-lib instead of a nested 2.20.0.

## [0.28.0] - 2026-11-03

### Added

- **`HDSFormField` `eventType` prop: the unit the host chose** for an item with `variations.eventType` (B-2026-10-28-39).
  The number field showed the person's preferred unit (per-item setting, then `unitSystem`), so editing a lb entry
  with a kg preference read "kg" next to the number while the host's Unit select said lb (the stored type was right).
  With `eventType` set to one of the item's options, the field shows that option's unit; otherwise the preference
  applies as before. `HDSFormSection` passes its own unit selection, and so does the test app. Tests
  `tests/variationUnit.test.tsx`.

## [0.27.0] - 2026-11-03

### Fixed

- **`FormBuilder` and `HDSFormSection` survive an item key the model does not know** (B-2026-11-03-1). A data set
  naming a removed or renamed key, an imported template or a data set saved against a newer model threw `Cannot find
  item definition with key` while the builder rendered, which blanked the doctor-dashboard editor. The builder now
  shows the key with an "unknown item" marker (new label `unknownItem`) and only its remove button; the section
  preview skips it. Tests `tests/unknownItemKey.test.tsx`.

- **Test app: Single Field builds events for unit-choice items** (2026-11-03, B-2026-10-27-3). It called
  `jsonFormForItemDef` without `eventType`, so `eventTemplate()` threw for every variation item (`body-weight`, glucose,
  the lab items) and no event or short text showed. It now seeds the unit like `HDSFormSection` (preferred input, else
  the first option), shows the unit select, and passes the choice. Test app only; the library is unchanged.

## [0.26.0] - 2026-10-29

### Fixed

- **A cleared optional text sub-field of a composite drops its key** instead of storing `''`, which a closed
  eventType's `minLength: 1` string rejects (`encounter/visit-v1` `reason`, `notes`). Same for a cleared date
  sub-field, and as the `DatasetSearch` companion fields already did. Only the empty string counts as cleared
  (whitespace is kept, as for a top-level item). A required sub-field still keeps `''`, and stored keys that
  are not form fields (an importer's participants or codings) still survive an edit. Tests
  `tests/compositeClear.test.tsx`.

## [0.25.0] - 2026-10-29

### Added

- **Number items on `ratio/generic`** (data-model 3.33.0, INR: `body-blood-coagulation-inr`). The typed number is the
  numerator and the item's authored `ratioRelativeTo` the denominator: every write path (`formDataToActions`,
  `formDataToEventBatch`, `jsonFormForItemDef`) stores `{ value, relativeTo }`, prefill unwraps it. A pack that
  publishes no `ratioRelativeTo` on such an item throws a clear error (nothing to derive it from).

### Fixed

- `HDSFormField` reads stored `{ value, relativeTo }` content passed as its `value` (hds-webapp passes an edited event's
  content, and the person's last entry, as is) as the field's scalar. A ratio/generic select opened that way used to
  show an extra `[object Object]` option, and a number field would have shown an empty input.

## [0.24.0] - 2026-10-28

### Added

- **Imported items** (data-model 3.27.0, `type: imported`: coded lab results on `lab-result/coded-v1`, written by an
  importer) and **any item type a newer data model adds**:
  - `HDSFormField` shows the item's name with "Not editable here." (EN/FR) instead of the red "Unknown field type".
  - `schemaFor` describes the item as an object instead of throwing `Cannot find schema for type`.
  - `ItemSearchPicker` offers only the types a form renders (hds-lib 2.28.0 `ENTERABLE_ITEM_TYPES`). That holds
    with any hds-lib pin, including when `includeDeprecated` is set.

## [0.23.0] - 2026-10-28

### Added

- **Document items** (data-model 3.25.0, `type: attachments`: files imported as attachments, metadata on
  `file/xds-v1`). `HDSFormField` shows the item's name with "Not editable here: add it as a document." (EN/FR)
  instead of "Unknown field type"; `schemaFor` describes it as an object instead of throwing; `ItemSearchPicker`
  never offers it, also with an hds-lib before 2.26.0 whose `getAllActive()` still lists it.

## [0.22.0] - 2026-10-28

### Added

- **All-or-nothing nested groups.** A nested composite group whose eventType object lists `required`
  keys (data-model 3.23.0 `intake.frequency`: `times`, `period`, `periodUnit`) keeps a partial entry
  as an on-screen draft and reports it upward only once every required key is set, so a partial
  object is never written. Its required fields get the asterisk once the group is started, and an
  alert asks to fill in all the fields or none. The item's top-level composite and groups without
  `required` behave as before. `HDSFormField` reads the item's eventType schema for a top-level
  composite and hands each sub-field its part (new internal prop `objectSchema`). Shared hook in
  `fields/allOrNothing.ts`. Tests `tests/allOrNothing.test.tsx`.
- **`DatasetSearch` companion fields render nested objects.** An object property of a companion
  (`intake.frequency` on `medication/coded-v1`) was skipped, so the coded intake form could not
  enter a frequency; it now renders as its own group, all or nothing like above.

## [0.21.0] - 2026-10-27

### Added

- **`NumberInput` steps by the value's decimals, and a `precision` prop.** With no `step` declared
  by the item, a number field steps by the decimals it is written with (36.52 → `step="0.01"`),
  at least `precision` (display decimals; `HDSFormField` takes it from its new `precision` prop,
  else the item's `number.display.precision`) and at least the decimals of `min` (the step
  base). The step follows what is typed, so a typed value is never a `stepMismatch`; with
  nothing declared and no decimals the input keeps `step="any"`. A zero or negative declared
  step is now treated as no step (`step="0"` is invalid HTML and fell back to 1). Replaces
  hds-webapp's DOM patching of `input.step`. New helpers `numberInputStep` and `decimalsOf` in
  `src/schema/valueDisplay.ts`.
- **`HDSFormField` `prefilled` and `onFieldTouched`.** A pre-filled field carries
  `data-hds-prefilled="true"` on a wrapper until it is focused, clicked or changed (the host
  styles it); `onFieldTouched(itemKey)` fires once on the first touch. Without either prop the
  DOM is unchanged. Replaces hds-webapp's `classList` toggling on the library's inputs.
- **`DatasetSearch` `recentEntries` and `onFreeText`.** The person's own entries are listed
  first ("Your entries"), on focus and above matching search results, deduped; picking one
  selects its concept only. When a search finds nothing, `onFreeText(text)` is offered as
  "Use “text”" (the value is not changed: the host routes a typed name); without it the list
  says "Nothing found".
- **`ItemSearchPicker` `searchLabel`** (default `Search items`), the search box's accessible
  name.

### Fixed

- **`Convertible` keeps the person's method when editing a value recorded in another one**
  (B-2026-10-26-10). It used to switch the form to the recorded `source.key`, so opening a Mira
  reading turned a Creighton chart's form into Mira's. Her method now wins; the stored
  observation is highlighted in her method's words (closest match, display only: an untouched
  field keeps the stored value) and the recorded method shows as "Recorded as …". The method is
  read from hds-lib's key: `preferred-input-<itemKey>` (`CERVICAL_FLUID_METHOD_KEY` for cervical
  fluid), then the legacy `preferred-input-<models>` (`CERVICAL_FLUID_METHOD_LEGACY_KEY`), so the
  form and `getPreferredInput` agree (B-2026-10-26-16). `HDSFormField` passes `itemKey` to it.
  A preferred method the engine does not know no longer hides the method picker.
- **Accessibility** (B-2026-10-27-11): the number input is tied to its label (`id` / `htmlFor`,
  description via `aria-describedby`); the `DatasetSearch` search box is tied to the field
  label; `ItemSearchPicker`'s search box has an accessible name and its count badges are
  `gray-700` on `gray-200` (dark: `gray-100` on `gray-600`), above 4.5:1 (was 3.9:1).

### Changed

- **hds-lib 2.20.0** (`github:healthdatasafe/hds-lib-js#2.20.0`, was unpinned at 2.8.0 in the
  lockfile) for the cervical-fluid method key constants. Consumers need hds-lib 2.20.0 or later.
- Dev: `happy-dom` for the interaction tests (touched fields, `Convertible`, `DatasetSearch`).

## [0.20.0] - 2026-10-02

### Changed

- **`type: system` items are never form fields** (data-model 3.13.0, hds-lib 2.7.0). `schemaFor` maps
  `system` to an object schema instead of throwing; `HDSFormField` renders nothing for it;
  `HDSFormSection` drops system keys from its fields and entry list; `ItemSearchPicker` leaves them out,
  including with `includeDeprecated`.

## [0.19.0] - 2026-09-23

### Fixed

- **A `min` / `max` / `step` published by the data model now reaches both the schema and the input.**
  data-model declares these as item-level properties on the `type: number` and `type: slider`
  branches (`src/schemas/items.js`), and this library dropped them on both paths: `schemaFor`
  emitted only `type: 'number'`, and `NumberInput` rendered a bare `<input type="number">`.
  `BUGS.md` `B-2026-09-23-2`.

  The driving case is `lifestyle-alcohol-typical-quantity`, added in data-model **3.10.0**: grams of
  ethanol with `min: 0`. `NumberData` already *declared* `min` in its TypeScript type, so the field
  round-tripped and looked supported; nothing read it.

  **Be precise about what this enforces.** `schemaFor` now carries `minimum` / `maximum` /
  `multipleOf` for any validator that consumes its output — there is none in HDS today, so that half
  is forward-looking. `NumberInput` puts the bounds on the element, which the browser enforces
  wherever the host runs native constraint validation: inside `HDSFormSection` and
  `HDSQuestionnaireForm`, which submit a real `<form>`. A host that renders `HDSFormField` outside a
  form (hds-webapp's `ItemInputDialog` does) still gets no enforcement, only the spinner affordances.

  Two details worth knowing:

  - **Bounds are converted into the display scale before reaching the DOM.** They are authored in the
    raw stored scale, and the input is display-scaled, so an item storing `0..1` on
    `ratio/proportion` and rendering as a percentage via `multiplier: 100` needs `max="100"`, not
    `max="1"` — otherwise the browser would reject every valid entry. New helper
    `toDisplayNumber(raw, display)` in `src/schema/valueDisplay.ts`, beside `toDisplayText`. The
    JSON Schema keeps the **raw** values, since that is the scale it validates.
  - **`min: 0` and `step: 0` are handled explicitly.** Zero is the most common bound in the model and
    a truthiness check would silently drop it, so the guard is `typeof === 'number'`. A zero *step*
    is deliberately not emitted, because `multipleOf: 0` matches nothing.

  One existing test asserted the slider schema was exactly `{ title, type }` — it pinned the missing
  bounds as correct. It now asserts they are present.

- **`NumberInput` emits `step="any"` when the item declares no step.** Per the HTML spec an
  `<input type="number">` without a `step` has step **1**, so a weight of 72.5 kg or an HbA1c of
  5.4% is a `stepMismatch` and blocks submission under native form validation. Exactly one item in
  the model declares a step today, so this affected nearly every numeric field. Adding `min` makes
  it worse rather than better, since `min` becomes the step base — which is why it is fixed in the
  same release that introduces `min`.

- **A `select` value that matches no option is no longer lost.** A controlled `<select>` whose value
  matches none of its options renders **blank**; under native form validation a `required` field
  then forces the user to overwrite a real reading just to submit. `HDSFormField` now appends a
  read-back option carrying the stored value.

  This matters because a `select` item may sit on a **continuous** eventType, where the options are
  the human-entry surface and a device bridge writes values in between. data-model **3.12.0** makes
  `fertility-test-opk` a select on `test-result/scale` (-1..1) with three options, while
  hds-webapp's HealthKit bridge maps an "estrogen surge" to `0.5` (`OVULATION_TO_SCALE[4]`). Without
  this, every such reading would have been silently overwritten on the next edit.

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

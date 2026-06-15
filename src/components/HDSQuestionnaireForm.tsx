import { useState, useEffect } from 'react';
import { localizeText, appTemplates } from 'hds-lib';

type QuestionDef = appTemplates.QuestionDef;
type AnswerEntry = appTemplates.AnswerEntry;
type AnswerStatus = appTemplates.AnswerStatus;
type QuestionnaireRequestContent = appTemplates.QuestionnaireRequestContent;

const l = localizeText;

const ALL_STATUSES: AnswerStatus[] = ['answered', 'no', 'unknown', 'declined'];

const STATUS_LABEL: Record<AnswerStatus, string> = {
  answered: 'Yes',
  no: 'No',
  unknown: "I don't know",
  declined: "I'd rather not say"
};

/**
 * Plan 71 Phase C — questionnaire renderer.
 *
 * Renders a `questionnaire/request-v1` payload as a list of questions, each
 * with a 4-state status selector (answered / no / unknown / declined),
 * optional sub-field qualifier capture (when status is "answered"), and an
 * optional reason field (when status is "declined").
 *
 * Reference collection for `answered` (which existing typed events satisfy
 * the question?) is delegated to the parent via `renderAnsweredBody` so the
 * consumer can wire the underlying item's renderer / search picker. The
 * parent owns the per-question `references[]` state and pushes updates back
 * via `onAnswerChange`.
 *
 * Prefill (C3) and batch submit (C4) are the parent's concern; this
 * component is the UI shell.
 */

interface HDSQuestionnaireFormProps {
  /** The instantiated questionnaire (request event content). */
  request: QuestionnaireRequestContent;
  /** Initial per-question answers (typically from prefill). */
  initialAnswers?: Record<string, AnswerEntry>;
  /** Called whenever any question's answer changes. */
  onAnswerChange?: (answers: Record<string, AnswerEntry>) => void;
  /** Called on form submit. */
  onSubmit: (answers: Record<string, AnswerEntry>) => void;
  /**
   * Optional renderer for the `answered` branch's reference-collection UI
   * (typically the underlying item's renderer / picker). The parent uses
   * `setReferences` to push the chosen eventIds back into the answer.
   */
  renderAnsweredBody?: (args: {
    questionKey: string;
    question: QuestionDef;
    references: string[];
    setReferences: (refs: string[]) => void;
  }) => React.ReactNode;
  disabled?: boolean;
  submitLabel?: string;
}

export function HDSQuestionnaireForm ({
  request,
  initialAnswers,
  onAnswerChange,
  onSubmit,
  renderAnsweredBody,
  disabled,
  submitLabel
}: HDSQuestionnaireFormProps) {
  const [answers, setAnswers] = useState<Record<string, AnswerEntry>>(initialAnswers || {});

  useEffect(() => {
    if (initialAnswers) setAnswers(initialAnswers);
  }, [initialAnswers]);

  function setAnswer (key: string, next: AnswerEntry | undefined) {
    setAnswers(prev => {
      const out = { ...prev };
      if (next == null) delete out[key];
      else out[key] = next;
      onAnswerChange?.(out);
      return out;
    });
  }

  function handleStatusChange (key: string, status: AnswerStatus) {
    switch (status) {
      case 'answered':
        setAnswer(key, { status: 'answered', references: [] });
        break;
      case 'no':
        setAnswer(key, { status: 'no' });
        break;
      case 'unknown':
        setAnswer(key, { status: 'unknown' });
        break;
      case 'declined':
        setAnswer(key, { status: 'declined' });
        break;
    }
  }

  function setReferences (key: string, refs: string[]) {
    const existing = answers[key];
    if (existing?.status === 'answered') {
      setAnswer(key, { ...existing, references: refs });
    }
  }

  function setQualifier (key: string, qualifier: unknown) {
    const existing = answers[key];
    if (existing?.status === 'answered') {
      setAnswer(key, { ...existing, qualifier });
    }
  }

  function setReason (key: string, reason: string) {
    const existing = answers[key];
    if (existing?.status === 'declined') {
      setAnswer(key, { ...existing, reason: reason || undefined });
    }
  }

  function handleSubmit (e: React.FormEvent) {
    e.preventDefault();
    onSubmit(answers);
  }

  const titleText = request.title ? l(request.title) : null;
  const descText = request.description ? l(request.description) : null;
  const questionEntries = Object.entries(request.questions);

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      {titleText && (
        <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>{titleText}</h2>
      )}
      {descText && (
        <p className='text-sm text-gray-700 dark:text-gray-300'>{descText}</p>
      )}

      {questionEntries.map(([key, question]) => (
        <QuestionBlock
          key={key}
          questionKey={key}
          question={question}
          answer={answers[key]}
          onStatusChange={(s) => handleStatusChange(key, s)}
          onReferencesChange={(refs) => setReferences(key, refs)}
          onQualifierChange={(q) => setQualifier(key, q)}
          onReasonChange={(r) => setReason(key, r)}
          renderAnsweredBody={renderAnsweredBody}
          disabled={disabled}
        />
      ))}

      <button
        type='submit'
        disabled={disabled}
        className='rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-300 disabled:opacity-50 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800'
      >
        {submitLabel || 'Submit'}
      </button>
    </form>
  );
}

interface QuestionBlockProps {
  questionKey: string;
  question: QuestionDef;
  answer: AnswerEntry | undefined;
  onStatusChange: (status: AnswerStatus) => void;
  onReferencesChange: (refs: string[]) => void;
  onQualifierChange: (qualifier: unknown) => void;
  onReasonChange: (reason: string) => void;
  renderAnsweredBody?: HDSQuestionnaireFormProps['renderAnsweredBody'];
  disabled?: boolean;
}

function QuestionBlock ({
  questionKey,
  question,
  answer,
  onStatusChange,
  onReferencesChange,
  onQualifierChange,
  onReasonChange,
  renderAnsweredBody,
  disabled
}: QuestionBlockProps) {
  const labelText = l(question.label) || questionKey;
  const status = answer?.status;

  return (
    <div className='rounded-lg border border-gray-200 p-4 dark:border-gray-700'>
      <div className='mb-2 text-sm font-medium text-gray-900 dark:text-white'>
        {labelText}
      </div>

      <div className='flex flex-wrap gap-3'>
        {ALL_STATUSES.map((s) => (
          <label
            key={s}
            className='flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200'
          >
            <input
              type='radio'
              name={`__q::${questionKey}::status`}
              checked={status === s}
              onChange={() => onStatusChange(s)}
              disabled={disabled}
              className='accent-primary-600'
            />
            {STATUS_LABEL[s]}
          </label>
        ))}
      </div>

      {status === 'answered' && answer?.status === 'answered' && (
        <div className='mt-3 space-y-2'>
          {renderAnsweredBody?.({
            questionKey,
            question,
            references: answer.references,
            setReferences: onReferencesChange
          })}
          {question.subField && (
            <SubFieldInput
              subField={question.subField}
              value={answer.qualifier}
              onChange={onQualifierChange}
              disabled={disabled}
            />
          )}
        </div>
      )}

      {status === 'declined' && (
        <div className='mt-3'>
          <label className='mb-1 block text-xs text-gray-600 dark:text-gray-400'>
            Reason (optional)
          </label>
          <input
            type='text'
            value={answer?.status === 'declined' ? (answer.reason ?? '') : ''}
            onChange={(e) => onReasonChange(e.target.value)}
            disabled={disabled}
            placeholder='e.g. privacy'
            className='block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
          />
        </div>
      )}
    </div>
  );
}

interface SubFieldInputProps {
  subField: NonNullable<QuestionDef['subField']>;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

function SubFieldInput ({ subField, value, onChange, disabled }: SubFieldInputProps) {
  const subLabel = subField.label ? l(subField.label) : null;
  if (subField.type === 'select-segmented' && Array.isArray(subField.options)) {
    return (
      <div>
        {subLabel && (
          <div className='mb-1 text-xs text-gray-600 dark:text-gray-400'>{subLabel}</div>
        )}
        <div className='inline-flex overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600'>
          {subField.options.map((opt) => {
            const selected = value === opt.value;
            return (
              <button
                key={String(opt.value)}
                type='button'
                onClick={() => onChange(opt.value)}
                disabled={disabled}
                className={
                  'px-3 py-1.5 text-sm focus:outline-none ' +
                  (selected
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600')
                }
              >
                {l(opt.label) || String(opt.value)}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  if (subField.type === 'text') {
    return (
      <div>
        {subLabel && (
          <div className='mb-1 text-xs text-gray-600 dark:text-gray-400'>{subLabel}</div>
        )}
        <input
          type='text'
          value={value == null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className='block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
        />
      </div>
    );
  }
  if (subField.type === 'number') {
    return (
      <div>
        {subLabel && (
          <div className='mb-1 text-xs text-gray-600 dark:text-gray-400'>{subLabel}</div>
        )}
        <input
          type='number'
          value={value == null ? '' : String(value)}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(raw === '' ? undefined : Number(raw));
          }}
          disabled={disabled}
          className='block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
        />
      </div>
    );
  }
  return null;
}

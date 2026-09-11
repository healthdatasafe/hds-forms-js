/**
 * Plan 71 Phase D — Questionnaire builder UI.
 *
 * Standalone component that edits ONE Questionnaire (title, description,
 * list of questions with itemRef + temporal scope + optional sub-field).
 *
 * Wired into FormBuilder (alongside sections/customFields) so a
 * CollectorRequest can bundle one or more questionnaires at first contact
 * (Option B, resolved 2026-06-15 — see Plan 71 SessionState). Also usable
 * standalone (for editing a saved questionnaire template).
 *
 * Editing model: the component mutates the `Questionnaire` instance in
 * place via its public API (`addQuestion` / `removeQuestion` / setters)
 * and bumps an internal version counter on every change to trigger React
 * re-renders. The parent receives an `onDirty` notification.
 */

import { useState, useMemo, useCallback } from 'react';
import { getHDSModel, localizeText, appTemplates } from 'hds-lib';

const l = localizeText;

type QuestionDef = appTemplates.QuestionDef;
type QuestionScope = appTemplates.QuestionScope;
type QuestionSubField = appTemplates.QuestionSubField;

const SCOPE_TYPES: Array<{ value: 'ever' | 'window' | 'latest', label: string }> = [
  { value: 'ever', label: 'Ever (lifetime)' },
  { value: 'window', label: 'Within window' },
  { value: 'latest', label: 'Latest, within' }
];

const SUB_FIELD_TYPES: Array<QuestionSubField['type']> = ['select-segmented', 'text', 'number'];

export interface QuestionnaireBuilderLabels {
  title: string;
  description: string;
  addQuestion: string;
  noQuestions: string;
  questionKey: string;
  questionLabel: string;
  itemRef: string;
  scope: string;
  withinDays: string;
  subField: string;
  noSubField: string;
  subFieldLabel: string;
  subFieldOptions: string;
  addOption: string;
  optionValue: string;
  optionLabel: string;
  drugSystem: string;
  drugCode: string;
  drugFilter: string;
  drugFilterHint: string;
  remove: string;
  invalidKey: string;
  invalidItemRef: string;
}

const DEFAULT_LABELS: QuestionnaireBuilderLabels = {
  title: 'Title',
  description: 'Description',
  addQuestion: 'Add question',
  noQuestions: 'No questions yet.',
  questionKey: 'Key',
  questionLabel: 'Question text',
  itemRef: 'Item',
  scope: 'Time scope',
  withinDays: 'Within days',
  subField: 'Sub-field',
  noSubField: '(none)',
  subFieldLabel: 'Sub-field label',
  subFieldOptions: 'Options',
  addOption: '+ option',
  optionValue: 'Value',
  optionLabel: 'Label',
  drugSystem: 'Code system',
  drugCode: 'Code',
  drugFilter: 'Drug filter',
  drugFilterHint: 'Restrict prefill matching to events whose drug.codes[] contains this code.',
  remove: 'Remove',
  invalidKey: 'Key must match [a-zA-Z0-9_-]+',
  invalidItemRef: 'Pick an item from the list'
};

const MEDICATION_ITEM_PREFIX = 'medication-';

function isMedicationItem (itemRef: string): boolean {
  return itemRef.startsWith(MEDICATION_ITEM_PREFIX);
}

export interface QuestionnaireBuilderProps {
  /** The Questionnaire instance to edit (mutated in place). */
  questionnaire: InstanceType<typeof appTemplates.Questionnaire>;
  /** Disable editing. */
  readOnly?: boolean;
  /** Called whenever the questionnaire is modified. */
  onDirty?: () => void;
  /** i18n overrides. */
  labels?: Partial<QuestionnaireBuilderLabels>;
}

export function QuestionnaireBuilder ({
  questionnaire,
  readOnly = false,
  onDirty,
  labels: labelOverrides
}: QuestionnaireBuilderProps) {
  const lb = { ...DEFAULT_LABELS, ...labelOverrides };
  const model = getHDSModel();
  const allItemDefs = useMemo(() => model.itemsDefs.getAllActive(), [model]);

  const [, setVersion] = useState(0);
  const refresh = useCallback(() => {
    setVersion((v) => v + 1);
    onDirty?.();
  }, [onDirty]);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [newKeyDraft, setNewKeyDraft] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);

  // Title / description handlers
  function updateTitle (value: string) {
    if (readOnly) return;
    if (value) (questionnaire as { title: appTemplates.QuestionnaireRequestContent['title'] }).title = { en: value };
    else (questionnaire as unknown as { title: null }).title = null as never;
    refresh();
  }

  function updateDescription (value: string) {
    if (readOnly) return;
    if (value) (questionnaire as { description: appTemplates.QuestionnaireRequestContent['description'] }).description = { en: value };
    else (questionnaire as unknown as { description: null }).description = null as never;
    refresh();
  }

  // Question add / remove / edit
  function tryAddQuestion () {
    if (readOnly) return;
    const key = newKeyDraft.trim();
    if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
      setKeyError(lb.invalidKey);
      return;
    }
    try {
      // Stub a minimal valid question — user fills item + scope after creation.
      const firstItem = allItemDefs[0];
      if (!firstItem) {
        setKeyError(lb.invalidItemRef);
        return;
      }
      questionnaire.addQuestion(key, {
        label: { en: key },
        itemRef: firstItem.key,
        scope: { type: 'ever' }
      });
      setNewKeyDraft('');
      setKeyError(null);
      setEditingKey(key);
      refresh();
    } catch (e) {
      setKeyError((e as Error).message);
    }
  }

  function removeQuestion (key: string) {
    if (readOnly) return;
    questionnaire.removeQuestion(key);
    if (editingKey === key) setEditingKey(null);
    refresh();
  }

  function updateQuestion (key: string, mutator: (q: QuestionDef) => void) {
    if (readOnly) return;
    const existing = questionnaire.getQuestion(key);
    if (!existing) return;
    mutator(existing);
    // Re-add to re-trigger validation (Questionnaire.addQuestion validates the shape).
    questionnaire.removeQuestion(key);
    try {
      questionnaire.addQuestion(key, existing);
    } catch (e) {
      // Restore prior state by re-adding with the previous shape; for
      // simplicity we surface and let the user fix it next call.
      console.warn(`Question '${key}' update failed validation:`, e);
    }
    refresh();
  }

  const keys = questionnaire.questionKeys;

  return (
    <div className='space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800'>
      <div className='grid grid-cols-2 gap-3'>
        <div>
          <label className='mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300'>{lb.title}</label>
          <input
            type='text'
            value={l(questionnaire.title) || ''}
            onChange={(e) => updateTitle(e.target.value)}
            disabled={readOnly}
            className='w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
          />
        </div>
        <div>
          <label className='mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300'>{lb.description}</label>
          <input
            type='text'
            value={l(questionnaire.description) || ''}
            onChange={(e) => updateDescription(e.target.value)}
            disabled={readOnly}
            className='w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
          />
        </div>
      </div>

      <div className='space-y-2'>
        {keys.length === 0 && (
          <div className='text-sm italic text-gray-500 dark:text-gray-400'>{lb.noQuestions}</div>
        )}
        {keys.map((key) => {
          const q = questionnaire.getQuestion(key)!;
          const isEditing = editingKey === key;
          return (
            <div
              key={key}
              className='rounded border border-gray-200 p-3 dark:border-gray-600'
            >
              <div className='flex items-start justify-between gap-2'>
                <div className='flex-1'>
                  <div className='text-xs font-mono text-gray-500 dark:text-gray-400'>{key}</div>
                  <div className='text-sm font-medium text-gray-900 dark:text-white'>
                    {l(q.label) || '(no label)'}
                  </div>
                  <div className='mt-1 text-xs text-gray-600 dark:text-gray-300'>
                    <span className='font-medium'>{lb.itemRef}:</span> {q.itemRef}
                    {' · '}
                    <span className='font-medium'>{lb.scope}:</span> {scopeToText(q.scope)}
                    {q.subField && (
                      <>
                        {' · '}
                        <span className='font-medium'>{lb.subField}:</span> {q.subField.type}
                      </>
                    )}
                  </div>
                </div>
                <div className='flex gap-1'>
                  <button
                    type='button'
                    onClick={() => setEditingKey(isEditing ? null : key)}
                    disabled={readOnly}
                    className='rounded border border-gray-300 px-2 py-0.5 text-xs hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700'
                  >
                    {isEditing ? '–' : '+'}
                  </button>
                  <button
                    type='button'
                    onClick={() => removeQuestion(key)}
                    disabled={readOnly}
                    className='rounded border border-red-300 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30'
                  >
                    {lb.remove}
                  </button>
                </div>
              </div>
              {isEditing && (
                <QuestionEditor
                  question={q}
                  itemDefs={allItemDefs}
                  onChange={(mutator) => updateQuestion(key, mutator)}
                  labels={lb}
                  readOnly={readOnly}
                />
              )}
            </div>
          );
        })}
      </div>

      {!readOnly && (
        <div className='flex items-center gap-2'>
          <input
            type='text'
            value={newKeyDraft}
            onChange={(e) => { setNewKeyDraft(e.target.value); setKeyError(null); }}
            placeholder={lb.questionKey}
            className='rounded border border-gray-300 bg-white px-2 py-1 text-sm font-mono dark:border-gray-600 dark:bg-gray-800 dark:text-white'
          />
          <button
            type='button'
            onClick={tryAddQuestion}
            className='rounded bg-primary-600 px-3 py-1 text-sm font-medium text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600'
          >
            {lb.addQuestion}
          </button>
          {keyError && (
            <span className='text-xs text-red-600 dark:text-red-400'>{keyError}</span>
          )}
        </div>
      )}
    </div>
  );
}

function scopeToText (scope: QuestionScope): string {
  if (scope.type === 'ever') return 'ever';
  return `${scope.type}/${scope.withinDays}d`;
}

interface QuestionEditorProps {
  question: QuestionDef;
  itemDefs: Array<{ key: string, label: string }>;
  onChange: (mutator: (q: QuestionDef) => void) => void;
  labels: QuestionnaireBuilderLabels;
  readOnly?: boolean;
}

function QuestionEditor ({ question, itemDefs, onChange, labels, readOnly }: QuestionEditorProps) {
  return (
    <div className='mt-3 space-y-2 border-t border-gray-200 pt-3 dark:border-gray-600'>
      <div>
        <label className='mb-0.5 block text-xs font-medium text-gray-700 dark:text-gray-300'>{labels.questionLabel}</label>
        <input
          type='text'
          value={l(question.label) || ''}
          onChange={(e) => onChange((q) => { q.label = { en: e.target.value }; })}
          disabled={readOnly}
          className='w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white'
        />
      </div>
      <div className='grid grid-cols-2 gap-2'>
        <div>
          <label className='mb-0.5 block text-xs font-medium text-gray-700 dark:text-gray-300'>{labels.itemRef}</label>
          <select
            value={question.itemRef}
            onChange={(e) => onChange((q) => { q.itemRef = e.target.value; })}
            disabled={readOnly}
            className='w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white'
          >
            {itemDefs.map((it) => (
              <option key={it.key} value={it.key}>{it.key} — {it.label}</option>
            ))}
          </select>
        </div>
        <div className='flex items-end gap-2'>
          <div className='flex-1'>
            <label className='mb-0.5 block text-xs font-medium text-gray-700 dark:text-gray-300'>{labels.scope}</label>
            <select
              value={question.scope.type}
              onChange={(e) => onChange((q) => {
                const t = e.target.value as 'ever' | 'window' | 'latest';
                if (t === 'ever') q.scope = { type: 'ever' };
                else q.scope = { type: t, withinDays: 7 };
              })}
              disabled={readOnly}
              className='w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white'
            >
              {SCOPE_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          {question.scope.type !== 'ever' && (
            <div className='w-20'>
              <label className='mb-0.5 block text-xs font-medium text-gray-700 dark:text-gray-300'>{labels.withinDays}</label>
              <input
                type='number'
                min={1}
                value={question.scope.withinDays}
                onChange={(e) => onChange((q) => {
                  const n = Math.max(1, Number(e.target.value) || 1);
                  if (q.scope.type === 'window' || q.scope.type === 'latest') q.scope.withinDays = n;
                })}
                disabled={readOnly}
                className='w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white'
              />
            </div>
          )}
        </div>
      </div>
      {isMedicationItem(question.itemRef) && (
        <DrugCodeEditor question={question} onChange={onChange} labels={labels} readOnly={readOnly} />
      )}
      <div>
        <label className='mb-0.5 block text-xs font-medium text-gray-700 dark:text-gray-300'>{labels.subField}</label>
        <select
          value={question.subField ? question.subField.type : ''}
          onChange={(e) => onChange((q) => {
            const v = e.target.value;
            if (v === '') delete q.subField;
            else if (v === 'select-segmented') q.subField = { type: 'select-segmented', options: [] };
            else q.subField = { type: v as 'text' | 'number' };
          })}
          disabled={readOnly}
          className='w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white'
        >
          <option value=''>{labels.noSubField}</option>
          {SUB_FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      {question.subField && (
        <SubFieldDetails question={question} onChange={onChange} labels={labels} readOnly={readOnly} />
      )}
    </div>
  );
}

interface SubEditorProps {
  question: QuestionDef;
  onChange: (mutator: (q: QuestionDef) => void) => void;
  labels: QuestionnaireBuilderLabels;
  readOnly?: boolean;
}

function DrugCodeEditor ({ question, onChange, labels, readOnly }: SubEditorProps) {
  const codes = (question.params?.drug as { codes?: Array<{ system?: string, code?: string }> })?.codes;
  const first = (codes && codes[0]) || { system: 'atc', code: '' };

  function updateCode (next: { system: string, code: string }) {
    onChange((q) => {
      const trimmedCode = (next.code || '').trim();
      if (!trimmedCode) {
        if (q.params?.drug) {
          delete (q.params as Record<string, unknown>).drug;
          if (Object.keys(q.params).length === 0) delete q.params;
        }
        return;
      }
      if (!q.params) q.params = {};
      q.params.drug = { codes: [{ system: next.system || 'atc', code: trimmedCode }] };
    });
  }

  return (
    <div className='rounded border border-amber-200 bg-amber-50 p-2 dark:border-amber-800 dark:bg-amber-900/20'>
      <div className='mb-1 text-xs font-medium text-amber-900 dark:text-amber-200'>{labels.drugFilter}</div>
      <div className='grid grid-cols-[1fr_2fr] gap-2'>
        <div>
          <label className='mb-0.5 block text-xs text-gray-700 dark:text-gray-300'>{labels.drugSystem}</label>
          <input
            type='text'
            value={first.system || 'atc'}
            onChange={(e) => updateCode({ system: e.target.value, code: first.code || '' })}
            disabled={readOnly}
            className='w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white'
          />
        </div>
        <div>
          <label className='mb-0.5 block text-xs text-gray-700 dark:text-gray-300'>{labels.drugCode}</label>
          <input
            type='text'
            value={first.code || ''}
            placeholder='e.g. G03DA04'
            onChange={(e) => updateCode({ system: first.system || 'atc', code: e.target.value })}
            disabled={readOnly}
            className='w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm font-mono dark:border-gray-600 dark:bg-gray-800 dark:text-white'
          />
        </div>
      </div>
      <div className='mt-1 text-[10px] text-amber-800 dark:text-amber-300'>{labels.drugFilterHint}</div>
    </div>
  );
}

function SubFieldDetails ({ question, onChange, labels, readOnly }: SubEditorProps) {
  const sub = question.subField;
  if (!sub) return null;

  const subLabel = (sub.label ? l(sub.label) : '') || '';

  function updateLabel (value: string) {
    onChange((q) => {
      if (!q.subField) return;
      if (value) q.subField.label = { en: value };
      else delete q.subField.label;
    });
  }

  function updateOption (i: number, patch: { value?: string, label?: string }) {
    onChange((q) => {
      if (!q.subField || q.subField.type !== 'select-segmented') return;
      const next = [...(q.subField.options || [])];
      const cur = next[i] || { value: '', label: { en: '' } };
      next[i] = {
        value: patch.value !== undefined ? patch.value : cur.value,
        label: patch.label !== undefined ? { en: patch.label } : cur.label
      };
      q.subField.options = next;
    });
  }

  function addOption () {
    onChange((q) => {
      if (!q.subField || q.subField.type !== 'select-segmented') return;
      q.subField.options = [...(q.subField.options || []), { value: '', label: { en: '' } }];
    });
  }

  function removeOption (i: number) {
    onChange((q) => {
      if (!q.subField || q.subField.type !== 'select-segmented') return;
      const next = [...(q.subField.options || [])];
      next.splice(i, 1);
      q.subField.options = next;
    });
  }

  return (
    <div className='rounded border border-blue-200 bg-blue-50 p-2 dark:border-blue-800 dark:bg-blue-900/20'>
      <div>
        <label className='mb-0.5 block text-xs text-gray-700 dark:text-gray-300'>{labels.subFieldLabel}</label>
        <input
          type='text'
          value={subLabel}
          placeholder='e.g. Trimester'
          onChange={(e) => updateLabel(e.target.value)}
          disabled={readOnly}
          className='w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white'
        />
      </div>
      {sub.type === 'select-segmented' && (
        <div className='mt-2'>
          <div className='mb-1 text-xs font-medium text-gray-700 dark:text-gray-300'>{labels.subFieldOptions}</div>
          <div className='space-y-1'>
            {(sub.options || []).map((opt, i) => (
              <div key={i} className='flex items-center gap-1'>
                <input
                  type='text'
                  value={String(opt.value)}
                  placeholder={labels.optionValue}
                  onChange={(e) => updateOption(i, { value: e.target.value })}
                  disabled={readOnly}
                  className='w-24 rounded border border-gray-300 bg-white px-2 py-1 text-sm font-mono dark:border-gray-600 dark:bg-gray-800 dark:text-white'
                />
                <input
                  type='text'
                  value={(opt.label ? l(opt.label) : '') || ''}
                  placeholder={labels.optionLabel}
                  onChange={(e) => updateOption(i, { label: e.target.value })}
                  disabled={readOnly}
                  className='flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white'
                />
                <button
                  type='button'
                  onClick={() => removeOption(i)}
                  disabled={readOnly}
                  className='rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30'
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type='button'
            onClick={addOption}
            disabled={readOnly}
            className='mt-1 rounded border border-gray-300 px-2 py-0.5 text-xs hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700'
          >
            {labels.addOption}
          </button>
        </div>
      )}
    </div>
  );
}

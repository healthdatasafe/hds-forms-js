import React from 'react';
import { localizeText } from 'hds-lib';
import { RepresentationCell } from 'hds-feminine-cycle-ui';
import { choices, pickedValue, resolve, toggle, type Selection } from '../schema/notationFacets';
import type { NotationModel } from '../schema/methodNotation';

const HINT = { en: 'Incomplete: pick the rest of the record to save it.', fr: 'Incomplet : choisissez la suite de la notation pour l\'enregistrer.' };

const tx = (t: any): string => (t == null ? '' : (localizeText(t) || (typeof t === 'string' ? t : (t.en ?? ''))));

/** The words of a label, without the code it may start with ("6C — Sticky, cloudy" → "Sticky, cloudy"). */
function wordsOf (label: any, codes: string[]): string {
  const s = tx(label);
  const m = /^(\S+) — (.+)$/.exec(s);
  return m && codes.includes(m[1]) ? m[2] : s;
}

export interface NotationPickerProps {
  model: NotationModel;
  selection: Selection;
  onSelectionChange: (selection: Selection) => void;
  disabled?: boolean;
}

/**
 * The rows of a method's notation (plan 134): a sticker row, then the method's rows (bleeding letters, number,
 * letters). A choice that leads to no record is not shown; a tap on a picked choice releases it. Under the rows:
 * the record as written and its words, or a hint while the picks are incomplete.
 *
 * Generic: everything shown comes from `model` (`buildNotation`). Stable hooks for styling:
 * `data-hds-notation-row`, `data-hds-notation-choice`, `data-hds-notation-record`.
 */
export function NotationPicker ({ model, selection, onSelectionChange, disabled }: NotationPickerProps) {
  const resolved = resolve(model.candidates, model.rows, selection);
  const empty = Object.keys(selection).length === 0;

  return (
    <div className='space-y-2' data-hds-notation=''>
      {model.rows.map(row => {
        const rowLabel = tx(row.label) || row.id;
        const shown = row.facets.flatMap(facet => choices(model.candidates, selection, facet, model.order[facet] ?? []).map(value => ({ facet, value })));
        if (shown.length === 0) return null;
        return (
          <div key={row.id} role='group' aria-label={rowLabel} data-hds-notation-row={row.id} className='flex flex-wrap items-center gap-2'>
            <span className='w-full text-xs font-medium text-gray-500 dark:text-gray-400' aria-hidden='true'>{rowLabel}</span>
            {shown.map(({ facet, value }) => {
              const d = model.display[facet]?.[value] ?? {};
              const pressed = pickedValue(row, facet, selection, resolved) === value;
              const word = tx(d.label);
              const text = d.text ?? value;
              const name = d.cell ? `${rowLabel}: ${text}` : (word && word !== text ? `${text} — ${word}` : text);
              return (
                <button
                  key={`${facet}:${value}`}
                  type='button'
                  disabled={disabled}
                  aria-pressed={pressed}
                  aria-label={name}
                  title={d.cell ? text : (word || undefined)}
                  data-hds-notation-choice={value}
                  onClick={() => onSelectionChange(toggle(selection, facet, value))}
                  className={`flex min-h-11 min-w-11 items-center justify-center rounded-md border-2 px-2 text-sm font-semibold transition-colors ${
                    pressed
                      ? 'border-primary-600 bg-primary-50 dark:bg-primary-950'
                      : 'border-[color:var(--hds-input,#848c97)] bg-white hover:border-gray-500 dark:bg-gray-700'
                  } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} text-gray-900 dark:text-white`}
                >
                  {d.cell
                    ? <RepresentationCell representationId={model.methodId} input={d.cell} size={28} />
                    : text}
                </button>
              );
            })}
          </div>
        );
      })}
      <p aria-live='polite' data-hds-notation-record={resolved ? 'valid' : (empty ? 'empty' : 'incomplete')} className='min-h-5 text-sm text-gray-700 dark:text-gray-300'>
        {resolved
          ? <><span className='font-semibold'>{resolved.payload.text}</span>{resolved.payload.labels.length > 0 && <span> — {resolved.payload.labels.map(l => wordsOf(l, resolved.payload.text.split(' '))).join(' · ')}</span>}</>
          : (empty ? null : <span className='text-gray-500 dark:text-gray-400'>{tx(HINT) || HINT.en}</span>)}
      </p>
    </div>
  );
}

import type { ReactNode } from 'react';
import type { ProposedValueView, ValueCorrection } from 'hds-lib';
import { AnchoredDocumentView, type AnchoredDocumentSource } from './AnchoredDocumentView';
import type { PdfJsLike } from './pdfjs';
import { itemLabel, printedText, proposalText, reasonText, tx } from './labels';
import { ValueCorrectionEditor } from './ValueCorrectionEditor';
import type { RowBlock } from './rowBlock';
import { btn, cx, small } from './ui';
import { STATE_TEXT, blockText } from './conversationRun';

export type { ConversationOutcome, ConversationActions } from './conversationRun';

/** A value read from the document: the line as printed, what would be saved, and its state or why it waits */
export function ValueLine ({ pv, block, written, contactName }: { pv: ProposedValueView; block: RowBlock | null; written: boolean; contactName: string }) {
  const c = pv.item.content;
  const proposed = c.proposal != null ? proposalText(c.proposal) : null;
  const item = c.proposal != null ? itemLabel(c.proposal.itemKey) : null;
  const stateKey = written && pv.state !== 'corrected' ? STATE_TEXT.confirmed : STATE_TEXT[pv.state];
  let note: ReactNode = null;
  if (stateKey != null && pv.state !== 'skipped') note = <p className='mt-1 text-xs font-semibold text-primary-700 dark:text-primary-300'>{tx(stateKey)}</p>;
  else if (c.status === 'kept-aside' || c.status === 'unmapped') note = <p className={cx(small, 'mt-1')}>{reasonText(c.reason)}</p>;
  else if (block != null) {
    const text = block === 'status' ? (c.status === 'unit-missing' ? tx('block.unit-missing') : reasonText(c.reason)) : blockText(block, contactName);
    if (text !== '') note = <p className={cx(small, 'mt-1')}>{text}</p>;
  } else if (c.status === 'check') note = <p className='mt-1 text-xs font-medium text-amber-700 dark:text-amber-400'>{tx('checkThis')}</p>;
  return (
    <div>
      <p className='text-sm'><span className='sr-only'>{tx('printedAs')}: </span><span className='font-semibold'>{printedText(c.printed)}</span></p>
      {proposed != null && item != null && <p className={cx(small, 'mt-1')}>{tx('wouldSave', { item, value: proposed })}</p>}
      {note}
      {pv.state === 'skipped' && <p className={cx(small, 'mt-1')}>{tx('state.skipped')}</p>}
    </div>
  );
}

export interface ValueReviewProps {
  pv: ProposedValueView;
  sourceOf: (attachmentId?: string) => AnchoredDocumentSource | null;
  busy: boolean;
  correcting: boolean;
  onConfirm: () => void;
  onCorrect: () => void;
  onSubmitCorrection: (c: ValueCorrection) => void;
  onCancelCorrection: () => void;
  onDuplicate: () => void;
  /** The last button: "Close" in the card, "Later" in a step (which answers `skip`) */
  onClose: () => void;
  closeLabel?: string;
  /** false: the question line is left to the host (a step bubble says it itself) */
  showQuestion?: boolean;
  loadPdfJs?: () => Promise<PdfJsLike>;
  pdfOptions?: Record<string, unknown>;
}

/** "Can you confirm this value is XYZ?": her document on the value's anchor, then Confirm, Correct, or already saved */
export function ValueReview ({ pv, sourceOf, busy, correcting, onConfirm, onCorrect, onSubmitCorrection, onCancelCorrection, onDuplicate, onClose, closeLabel, showQuestion = true, loadPdfJs, pdfOptions }: ValueReviewProps) {
  const c = pv.item.content;
  const value = (c.proposal != null ? proposalText(c.proposal) : null) ?? printedText(c.printed);
  const anchor = c.anchor ?? null;
  return (
    <div className='mt-3 space-y-2'>
      {showQuestion && <p className='text-sm font-semibold'>{tx('confirmQuestion', { value })}</p>}
      <AnchoredDocumentView
        source={sourceOf(anchor?.attachmentId)}
        anchor={anchor != null ? { page: anchor.page, bbox: anchor.bbox } : null}
        label={printedText(c.printed)}
        loadPdfJs={loadPdfJs}
        pdfOptions={pdfOptions}
      >
        {!correcting && (
          <div className='flex flex-wrap gap-2'>
            <button type='button' className={btn.primary} disabled={busy} onClick={onConfirm}>{tx('confirm')}</button>
            <button type='button' className={btn.outline} disabled={busy} onClick={onCorrect}>{tx('correct')}</button>
            <button type='button' className={btn.ghost} disabled={busy} onClick={onDuplicate}>{tx('duplicate')}</button>
            <button type='button' className={btn.ghost} disabled={busy} onClick={onClose}>{closeLabel ?? tx('close')}</button>
          </div>
        )}
      </AnchoredDocumentView>
      {correcting && c.proposal != null && (
        <ValueCorrectionEditor proposal={c.proposal} busy={busy} onSubmit={onSubmitCorrection} onCancel={onCancelCorrection} />
      )}
    </div>
  );
}

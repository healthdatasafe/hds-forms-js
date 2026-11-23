import { useState } from 'react';
import { eventToShortText, getHDSModel, localizeText } from 'hds-lib';
import { tx } from './labels';
import { btn, cx, small } from './ui';
import { AnchoredDocumentView, type AnchoredDocumentSource } from './AnchoredDocumentView';
import { readSourceAnchor } from './sourceAnchor';
import type { PdfJsLike } from './pdfjs';
import type { DocumentValues, ValueEvent } from './documentValues';

function valueName (e: ValueEvent): string {
  try {
    const def = getHDSModel().itemsDefs.forEvent(e as any, false);
    if (def != null) return localizeText(def.data.label) ?? '';
  } catch { /* the model not loaded: the value alone */ }
  return '';
}

function valueText (e: ValueEvent): string {
  try {
    const t = eventToShortText(e as any);
    return typeof t === 'string' ? t : '';
  } catch {
    return '';
  }
}

export interface DocumentValuesListProps {
  values: DocumentValues;
  /** A value opens (the host's entry view); its event comes second, so the host need not look it up */
  onOpenValue?: (eventId: string, event: ValueEvent) => void;
  /**
   * The document's file for an attachment (as `ConversationStepBubble`): with it, a value read from this document that
   * carries `clientData.hdsSourceAnchor` gets "See it on the document", the document zoomed where it is printed
   */
  sourceOf?: (attachmentId?: string) => AnchoredDocumentSource | null;
  /** Its day in the host's words */
  dayText?: (time: number) => string;
  loadPdfJs?: () => Promise<PdfJsLike>;
  pdfOptions?: Record<string, unknown>;
  className?: string;
}

/**
 * The values of a document under it: "Read from this document (n)" and "Also printed here (n)", the second "already in
 * your record, not from this document". A value read from it can be shown where it is printed; a value opens in the
 * host. Nothing when both are empty.
 */
export function DocumentValuesList ({ values, onOpenValue, sourceOf, dayText, loadPdfJs, pdfOptions, className }: DocumentValuesListProps) {
  const [shown, setShown] = useState<string | null>(null);
  if (values.source.length === 0 && values.matched.length === 0) return null;
  const row = (e: ValueEvent, fromHere: boolean) => {
    const name = valueName(e);
    const text = [name, valueText(e)].filter((s) => s !== '').join(': ');
    // only a value read from this document points into it; a matched one was read elsewhere
    const anchor = fromHere && sourceOf != null ? readSourceAnchor(e.clientData) : null;
    const open = anchor != null && shown === e.id;
    return (
      <li key={e.id} className='text-sm' data-value-event={e.id}>
        {onOpenValue != null
          ? <button type='button' className={cx(btn.link, 'text-left')} onClick={() => onOpenValue(e.id, e)}>{text}</button>
          : <span>{text}</span>}
        {dayText != null && <span className={cx(small, 'ml-2')}>{dayText(e.time)}</span>}
        {anchor != null && (
          <button type='button' className={cx(btn.link, 'ml-2')} aria-expanded={open} onClick={() => setShown(open ? null : e.id)}>
            {open ? tx('hideDocument') : tx('seeOnDocument')}
          </button>
        )}
        {open && anchor != null && sourceOf != null && (
          <AnchoredDocumentView
            className='mt-2'
            source={sourceOf(anchor.attachmentId)}
            anchor={{ page: anchor.page, bbox: anchor.bbox }}
            label={text}
            loadPdfJs={loadPdfJs}
            pdfOptions={pdfOptions}
          />
        )}
      </li>
    );
  };
  return (
    <div className={cx('space-y-3', className)} data-document-values=''>
      {values.source.length > 0 && (
        <section>
          <h3 className='text-sm font-semibold'>{tx('values.source', { n: values.source.length })}</h3>
          <ul className='mt-1 space-y-1'>{values.source.map((e) => row(e, true))}</ul>
        </section>
      )}
      {values.matched.length > 0 && (
        <section>
          <h3 className='text-sm font-semibold'>{tx('values.matched', { n: values.matched.length })}</h3>
          <p className={small}>{tx('values.matchedHint')}</p>
          <ul className='mt-1 space-y-1'>{values.matched.map((e) => row(e, false))}</ul>
        </section>
      )}
    </div>
  );
}

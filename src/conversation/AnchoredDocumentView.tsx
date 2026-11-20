import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { localizeText } from 'hds-lib';
import { fitPage, frameBox, isUsableBox, panBy, sameView, zoomAt, type AnchorBox, type Size, type View } from './anchorFrame';
import { CONVERSATION_TEXTS } from './conversationTexts';
import { DEFAULT_PDF_OPTIONS, loadPdfJs as defaultLoadPdfJs, type PdfJsLike } from './pdfjs';
import type { DocumentKind } from './sourceAnchor';

/** The file to show: an address the host can read (hds-webapp: the attachment's URL with its read token) and its kind */
export interface AnchoredDocumentSource {
  url: string;
  kind: DocumentKind;
}

export interface AnchoredDocumentViewProps {
  /** The document's file; null when it cannot be read (deleted, no permission): the view says so */
  source: AnchoredDocumentSource | null;
  /** Where the value is printed: a page (an image is page 1) and, when the reader trusted one, a box. No box: the page, no highlight */
  anchor?: { page: number; bbox?: AnchorBox } | null;
  /** What is shown, for screen readers ("Haemoglobin 138 g/L") */
  label?: string;
  /** The host's controls beside the document (confirm, correct) */
  children?: ReactNode;
  /** A host that already loads pdf.js passes its loader and options (fonts, decoders), so one worker serves all */
  loadPdfJs?: () => Promise<PdfJsLike>;
  pdfOptions?: Record<string, unknown>;
  className?: string;
}

type Status = 'loading' | 'shown' | 'failed' | 'page-missing';

/** The widest a PDF page is drawn, in canvas pixels: sharp when zoomed in, without holding a poster in memory */
const MAX_CANVAS_WIDTH = 3000;
const ZOOM_STEP = 1.5;
const FALLBACK_VIEWPORT: Size = { width: 320, height: 360 };

const tx = (key: keyof typeof CONVERSATION_TEXTS, vars: Record<string, string | number> = {}): string => {
  let text = localizeText(CONVERSATION_TEXTS[key]) ?? CONVERSATION_TEXTS[key].en;
  for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, String(v));
  return text;
};

/**
 * The person's own document, zoomed onto where a value is printed and highlighted, for "can you confirm this value?".
 * She can zoom out to the whole page for its context and come back to the value; pinch, drag and the buttons all work,
 * with large touch targets. A PDF's page is drawn by pdf.js in the page (the file never opens in another app); a
 * picture is shown as it is, after its EXIF orientation, as the anchor's box is measured.
 */
export function AnchoredDocumentView ({ source, anchor, label, children, loadPdfJs = defaultLoadPdfJs, pdfOptions = DEFAULT_PDF_OPTIONS, className }: AnchoredDocumentViewProps) {
  const pageNumber = source?.kind === 'image' ? 1 : Math.max(1, anchor?.page ?? 1);
  // by value: a box the host rebuilds on each render must not send the view back to the value
  const rawBox = anchor?.bbox;
  const boxKey = isUsableBox(rawBox) ? rawBox.join(',') : null;
  const box = useMemo<AnchorBox | null>(() => (boxKey == null ? null : boxKey.split(',').map(Number) as AnchorBox), [boxKey]);

  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasHost = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<Size>(FALLBACK_VIEWPORT);
  const [aspect, setAspect] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>(source == null ? 'failed' : 'loading');
  const [numPages, setNumPages] = useState(1);
  const [view, setView] = useState<View>({ s: 1, x: 0, y: 0 });

  // the page at the viewport's width; its height from the document's own proportions
  const page = useMemo<Size>(() => ({ width: viewport.width, height: viewport.width * (aspect ?? 1.414) }), [viewport.width, aspect]);
  const valueView = useMemo(() => (box != null ? frameBox(viewport, page, box) : null), [viewport, page, box]);
  const pageView = useMemo(() => fitPage(viewport, page), [viewport, page]);

  // a new document, page, box or size: start again on the value (or the whole page when there is no box)
  useEffect(() => { setView(valueView ?? pageView); }, [valueView, pageView]);

  // the viewport's size, followed on rotation and resize
  useEffect(() => {
    const el = viewportRef.current;
    if (el == null) return;
    const measure = (): void => {
      if (el.clientWidth > 0 && el.clientHeight > 0) setViewport({ width: el.clientWidth, height: el.clientHeight });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // by value too: a source, loader or options the host rebuilds on each render must not load the PDF again
  const sourceUrl = source?.url ?? null;
  const sourceKind = source?.kind ?? null;
  const pdfRef = useRef({ loadPdfJs, pdfOptions });
  pdfRef.current = { loadPdfJs, pdfOptions };

  // a PDF: its one anchored page, drawn once at a resolution that stays sharp when zoomed in
  useEffect(() => {
    if (sourceUrl == null) { setStatus('failed'); return; }
    if (sourceKind !== 'pdf') { setStatus('loading'); setAspect(null); return; }
    const { loadPdfJs, pdfOptions } = pdfRef.current;
    const run = { cancelled: false };
    let canvas: HTMLCanvasElement | null = null;
    let destroy: (() => Promise<void>) | null = null;
    setStatus('loading');
    setAspect(null);
    (async () => {
      try {
        const pdfjs = await loadPdfJs();
        const res = await fetch(sourceUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = new Uint8Array(await res.arrayBuffer());
        const task = pdfjs.getDocument({ ...pdfOptions, data });
        destroy = () => task.destroy();
        const doc = await task.promise;
        if (run.cancelled) return;
        setNumPages(doc.numPages);
        if (pageNumber > doc.numPages) { setStatus('page-missing'); return; }
        const pdfPage = await doc.getPage(pageNumber);
        const base = pdfPage.getViewport({ scale: 1 });
        const ratio = Math.min(2, globalThis.devicePixelRatio || 1);
        const wanted = Math.max(FALLBACK_VIEWPORT.width, viewportRef.current?.clientWidth ?? 0) * ratio * 3;
        const drawn = pdfPage.getViewport({ scale: Math.min(MAX_CANVAS_WIDTH, wanted) / base.width });
        canvas = document.createElement('canvas');
        canvas.width = Math.floor(drawn.width);
        canvas.height = Math.floor(drawn.height);
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'block';
        await pdfPage.render({ canvas, viewport: drawn }).promise;
        pdfPage.cleanup();
        if (run.cancelled) return;
        canvasHost.current?.replaceChildren(canvas);
        setAspect(base.height / base.width);
        setStatus('shown');
      } catch (e) {
        console.error('[AnchoredDocumentView] PDF failed:', e);
        if (!run.cancelled) setStatus('failed');
      }
    })();
    return () => {
      run.cancelled = true;
      // a drawn page holds a lot of memory: let it go with the view
      if (canvas != null) { canvas.width = 0; canvas.height = 0; canvas.remove(); }
      destroy?.().catch(() => {});
    };
  }, [sourceUrl, sourceKind, pageNumber]);

  const onImageLoad = (img: HTMLImageElement): void => {
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      setAspect(img.naturalHeight / img.naturalWidth);
      setStatus('shown');
    } else setStatus('failed');
  };

  const zoom = useCallback((factor: number, point?: { x: number; y: number }) => {
    setView((v) => zoomAt(v, factor, point ?? { x: viewport.width / 2, y: viewport.height / 2 }, viewport, page));
  }, [viewport, page]);

  // pinch with two fingers, drag with one (a pointer captured on the viewport)
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const local = (e: PointerEvent<HTMLDivElement>): { x: number; y: number } => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>): void => {
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch (_e) { /* a pointer the browser does not track: follow it without capture */ }
    pointers.current.set(e.pointerId, local(e));
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>): void => {
    const before = pointers.current.get(e.pointerId);
    if (before == null) return;
    const now = local(e);
    if (pointers.current.size === 1) {
      pointers.current.set(e.pointerId, now);
      setView((v) => panBy(v, now.x - before.x, now.y - before.y, viewport, page));
      return;
    }
    const other = [...pointers.current.entries()].find(([id]) => id !== e.pointerId)?.[1];
    pointers.current.set(e.pointerId, now);
    if (other == null) return;
    const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.hypot(a.x - b.x, a.y - b.y);
    const was = dist(before, other);
    if (was < 1) return;
    const mid = { x: (now.x + other.x) / 2, y: (now.y + other.y) / 2 };
    const prevMid = { x: (before.x + other.x) / 2, y: (before.y + other.y) / 2 };
    setView((v) => panBy(zoomAt(v, dist(now, other) / was, mid, viewport, page), mid.x - prevMid.x, mid.y - prevMid.y, viewport, page));
  };
  const onPointerEnd = (e: PointerEvent<HTMLDivElement>): void => { pointers.current.delete(e.pointerId); };

  // a trackpad pinch arrives as a wheel event with ctrlKey; a plain wheel scrolls the conversation as usual
  useEffect(() => {
    const el = viewportRef.current;
    if (el == null) return;
    const onWheel = (e: WheelEvent): void => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoom(Math.exp(-e.deltaY / 100), { x: e.clientX - r.left, y: e.clientY - r.top });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoom]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === '+' || e.key === '=') { e.preventDefault(); zoom(ZOOM_STEP); } else if (e.key === '-') { e.preventDefault(); zoom(1 / ZOOM_STEP); }
  };

  const atValue = valueView != null && sameView(view, valueView);
  const shown = status === 'shown';
  const buttonClass = 'inline-flex h-11 min-w-11 items-center justify-center rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50';

  return (
    <div className={['flex flex-col gap-2', className].filter(Boolean).join(' ')}>
      <div
        ref={viewportRef}
        role='region'
        aria-label={label ? tx('region', { label }) : tx('regionNoLabel')}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        data-view={`${view.s.toFixed(3)},${view.x.toFixed(1)},${view.y.toFixed(1)}`}
        className='relative h-[min(55vh,28rem)] w-full overflow-hidden rounded-md border border-gray-300 bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
        style={{ touchAction: 'none' }}
      >
        <div
          style={{ position: 'absolute', left: 0, top: 0, width: page.width, height: page.height, transformOrigin: '0 0', transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})`, visibility: shown ? 'visible' : 'hidden', background: '#fff' }}
        >
          {source?.kind === 'pdf' && <div ref={canvasHost} style={{ width: '100%', height: '100%' }} />}
          {source?.kind === 'image' && (
            <img
              src={source.url}
              alt=''
              draggable={false}
              onLoad={(e) => onImageLoad(e.currentTarget)}
              onError={() => setStatus('failed')}
              style={{ display: 'block', width: '100%', height: '100%', imageOrientation: 'from-image', userSelect: 'none' }}
            />
          )}
          {box != null && shown && (
            <div
              data-testid='anchor-highlight'
              role='img'
              aria-label={tx('highlight')}
              style={{
                position: 'absolute',
                left: `${box[0]}%`,
                top: `${box[1]}%`,
                width: `${box[2]}%`,
                height: `${box[3]}%`,
                borderRadius: 2,
                background: 'rgba(252, 211, 77, 0.28)',
                boxShadow: `0 0 0 ${3 / view.s}px rgb(217, 119, 6)`,
                pointerEvents: 'none'
              }}
            />
          )}
        </div>
        {status === 'loading' && <p role='status' className='absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-gray-600'>{tx('loading')}</p>}
        {status === 'failed' && <p className='absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-gray-600'>{tx('cannotShow')}</p>}
        {status === 'page-missing' && <p className='absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-gray-600'>{tx('pageMissing')}</p>}
      </div>

      {shown && (
        <div className='flex items-center gap-2'>
          <button type='button' className={buttonClass} aria-label={tx('zoomOut')} title={tx('zoomOut')} disabled={sameView(view, pageView)} onClick={() => zoom(1 / ZOOM_STEP)}>−</button>
          {valueView != null
            ? (
              <button type='button' className={[buttonClass, 'min-w-0 flex-1'].join(' ')} onClick={() => setView(atValue ? pageView : valueView)}>
                {atValue ? tx('wholePage') : tx('backToValue')}
              </button>
              )
            : <span className='flex-1' />}
          <button type='button' className={buttonClass} aria-label={tx('zoomIn')} title={tx('zoomIn')} onClick={() => zoom(ZOOM_STEP)}>+</button>
        </div>
      )}
      {shown && numPages > 1 && <p className='text-xs text-gray-600'>{tx('page', { n: pageNumber, total: numPages })}</p>}
      {shown && box == null && <p className='text-sm text-gray-600'>{tx('noBox')}</p>}

      {children}
    </div>
  );
}

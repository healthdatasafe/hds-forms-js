/**
 * pdf.js, loaded only when a PDF is shown (its code and worker stay out of a host's first load). The legacy build, so
 * it runs in phones' WebViews too. A host that already loads pdf.js (hds-webapp's DocumentViewer) passes its own
 * loader and options to `AnchoredDocumentView`, so one worker serves every document.
 */

/** The part of pdf.js the view uses */
export interface PdfJsLike {
  getDocument: (params: Record<string, unknown>) => { promise: Promise<PdfDocumentLike>; destroy: () => Promise<void> };
}
export interface PdfDocumentLike {
  numPages: number;
  getPage: (n: number) => Promise<PdfPageLike>;
}
export interface PdfPageLike {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (opts: { canvas: HTMLCanvasElement; viewport: { width: number; height: number } }) => { promise: Promise<void> };
  cleanup: () => void;
}

/**
 * How pdf.js opens a file when the host gives no options: no code from the file runs, no XFA forms. A host that serves
 * pdf.js's fonts and decoders passes them too (hds-webapp's `SAFE_PDF_OPTIONS`), or some scans show blank.
 */
export const DEFAULT_PDF_OPTIONS = { isEvalSupported: false, enableXfa: false } as const;

let loading: Promise<PdfJsLike> | null = null;

/** pdf.js with its worker (once, shared) */
export function loadPdfJs (): Promise<PdfJsLike> {
  loading ??= (async () => {
    const [pdfjs, { default: PdfWorker }] = await Promise.all([
      import('pdfjs-dist/legacy/build/pdf.mjs'),
      // @ts-ignore Vite's worker import: the host's bundler serves the worker as a plain script
      import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?worker')
    ]);
    pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker({ name: 'pdfjs' });
    return pdfjs as unknown as PdfJsLike;
  })();
  loading.catch(() => { loading = null; });
  return loading;
}

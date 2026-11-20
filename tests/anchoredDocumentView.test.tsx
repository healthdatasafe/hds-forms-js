// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let lang: 'en' | 'fr' = 'en';
vi.mock('hds-lib', () => ({
  localizeText: (t: any) => (typeof t === 'string' ? t : (t?.[lang] ?? t?.en ?? ''))
}));

const { AnchoredDocumentView } = await import('../src/conversation/AnchoredDocumentView');

const HB: [number, number, number, number] = [8.1, 29.69, 83.81, 2.34];

/** pdf.js as far as the view uses it: an A4 document of `pages` pages; each page draw is recorded */
function fakePdfJs (pages = 1) {
  const drawn: number[] = [];
  const pdfjs = {
    getDocument: vi.fn((_params: Record<string, unknown>) => ({
      promise: Promise.resolve({
        numPages: pages,
        getPage: async (n: number) => ({
          getViewport: ({ scale }: { scale: number }) => ({ width: 595 * scale, height: 842 * scale }),
          render: () => { drawn.push(n); return { promise: Promise.resolve() }; },
          cleanup: () => {}
        })
      }),
      destroy: async () => {}
    }))
  };
  return { pdfjs, drawn, load: () => Promise.resolve(pdfjs) };
}

let root: Root | null = null;
let container: HTMLDivElement;

beforeEach(() => {
  lang = 'en';
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })));
});
afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container?.remove();
  vi.unstubAllGlobals();
});

async function render (ui: React.ReactElement) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(ui); });
  // the PDF's load, fetch and draw
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
}

const viewOf = () => container.querySelector('[role="region"]')!.getAttribute('data-view');
const button = (text: string) => [...container.querySelectorAll('button')].find((b) => b.textContent === text || b.getAttribute('aria-label') === text) ?? null;

describe('AnchoredDocumentView', () => {
  it('[ADV1] a PDF: draws the anchored page, highlights the box, opens on the value', async () => {
    const pdf = fakePdfJs(3);
    await render(<AnchoredDocumentView source={{ url: 'https://x/doc.pdf', kind: 'pdf' }} anchor={{ page: 2, bbox: HB }} label='Haemoglobin 138 g/L' loadPdfJs={pdf.load} />);
    expect(pdf.drawn).toEqual([2]);
    expect(pdf.pdfjs.getDocument.mock.calls[0][0]).toMatchObject({ isEvalSupported: false, enableXfa: false });
    const hl = container.querySelector('[data-testid="anchor-highlight"]') as HTMLElement;
    expect(hl).not.toBeNull();
    expect(hl.style.left).toBe('8.1%');
    expect(hl.style.top).toBe('29.69%');
    expect(hl.style.width).toBe('83.81%');
    expect(container.querySelector('[role="region"]')!.getAttribute('aria-label')).toBe('Your document, Haemoglobin 138 g/L');
    expect(container.textContent).toContain('Page 2 of 3');
    expect(button('See the whole page')).not.toBeNull();
  });

  it('[ADV2] whole page, then back to the value', async () => {
    const pdf = fakePdfJs();
    await render(<AnchoredDocumentView source={{ url: 'https://x/doc.pdf', kind: 'pdf' }} anchor={{ page: 1, bbox: HB }} loadPdfJs={pdf.load} />);
    const onValue = viewOf();
    await act(async () => { button('See the whole page')!.click(); });
    const whole = viewOf();
    expect(whole).not.toBe(onValue);
    expect(Number(whole!.split(',')[0])).toBeLessThan(Number(onValue!.split(',')[0]));
    expect(button('Zoom out')!.hasAttribute('disabled')).toBe(true);
    await act(async () => { button('Back to the value')!.click(); });
    expect(viewOf()).toBe(onValue);
  });

  it('[ADV3] zoom buttons change the view; a box rebuilt on each render does not reset it', async () => {
    const pdf = fakePdfJs();
    const ui = (n: number) => <AnchoredDocumentView key='k' source={{ url: 'https://x/doc.pdf', kind: 'pdf' }} anchor={{ page: 1, bbox: [...HB] as typeof HB }} label={'v' + n} loadPdfJs={pdf.load} />;
    await render(ui(1));
    const onValue = viewOf();
    await act(async () => { button('Zoom in')!.click(); });
    const zoomed = viewOf();
    expect(zoomed).not.toBe(onValue);
    await act(async () => { root!.render(ui(2)); });
    expect(viewOf()).toBe(zoomed);
    expect(button('Back to the value')).not.toBeNull();
  });

  it('[ADV4] no box: the page, no highlight, no value button, a note saying so', async () => {
    const pdf = fakePdfJs();
    await render(<AnchoredDocumentView source={{ url: 'https://x/doc.pdf', kind: 'pdf' }} anchor={{ page: 1 }} loadPdfJs={pdf.load} />);
    expect(container.querySelector('[data-testid="anchor-highlight"]')).toBeNull();
    expect(button('See the whole page')).toBeNull();
    expect(button('Back to the value')).toBeNull();
    expect(container.textContent).toContain('The exact place was not marked');
  });

  it('[ADV5] the host\'s controls sit beside the document', async () => {
    const pdf = fakePdfJs();
    await render(
      <AnchoredDocumentView source={{ url: 'https://x/doc.pdf', kind: 'pdf' }} anchor={{ page: 1, bbox: HB }} loadPdfJs={pdf.load}>
        <button type='button'>Confirm</button>
      </AnchoredDocumentView>
    );
    expect(button('Confirm')).not.toBeNull();
  });

  it('[ADV6] a document that cannot be read, or a page it lacks, says so', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 403 })));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await render(<AnchoredDocumentView source={{ url: 'https://x/doc.pdf', kind: 'pdf' }} anchor={{ page: 1, bbox: HB }} loadPdfJs={fakePdfJs().load} />);
    expect(container.textContent).toContain('This document cannot be shown here.');
    expect(container.querySelector('[data-testid="anchor-highlight"]')).toBeNull();
    act(() => root?.unmount());
    root = null;
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })));
    await render(<AnchoredDocumentView source={{ url: 'https://x/doc.pdf', kind: 'pdf' }} anchor={{ page: 4, bbox: HB }} loadPdfJs={fakePdfJs(2).load} />);
    expect(container.textContent).toContain('This page is not in the document.');
    act(() => root?.unmount());
    root = null;
    await render(<AnchoredDocumentView source={null} anchor={{ page: 1, bbox: HB }} />);
    expect(container.textContent).toContain('This document cannot be shown here.');
  });

  it('[ADV7] a picture: shown once loaded, with its highlight', async () => {
    await render(<AnchoredDocumentView source={{ url: 'https://x/scan.jpg', kind: 'image' }} anchor={{ page: 1, bbox: HB }} />);
    const img = container.querySelector('img')!;
    expect(container.querySelector('[data-testid="anchor-highlight"]')).toBeNull();
    Object.defineProperty(img, 'naturalWidth', { value: 1240 });
    Object.defineProperty(img, 'naturalHeight', { value: 1754 });
    await act(async () => { img.dispatchEvent(new Event('load')); });
    expect(container.querySelector('[data-testid="anchor-highlight"]')).not.toBeNull();
    expect(button('See the whole page')).not.toBeNull();
  });

  it('[ADV8] French', async () => {
    lang = 'fr';
    const pdf = fakePdfJs();
    await render(<AnchoredDocumentView source={{ url: 'https://x/doc.pdf', kind: 'pdf' }} anchor={{ page: 1, bbox: HB }} label='Hémoglobine' loadPdfJs={pdf.load} />);
    expect(button('Voir toute la page')).not.toBeNull();
    expect(button('Agrandir')).not.toBeNull();
    expect(container.querySelector('[role="region"]')!.getAttribute('aria-label')).toBe('Votre document, Hémoglobine');
  });
});

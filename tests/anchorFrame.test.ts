import { describe, it, expect } from 'vitest';
import { boxRect, clampView, fitPage, frameBox, isUsableBox, MAX_SCALE, MIN_LINE_PX, panBy, sameView, zoomAt } from '../src/conversation/anchorFrame';
import { anchoredAttachment, documentKindOf, readSourceAnchor } from '../src/conversation/sourceAnchor';

// a phone: 360 × 400 viewport; an A4 page laid out at the viewport's width
const VP = { width: 360, height: 400 };
const PAGE = { width: 360, height: 360 * 1.414 };
// s-lab-fr-0001 (corpus S v0), the haemoglobin line as the PDF capture anchors it
const HB: [number, number, number, number] = [8.1, 29.69, 83.81, 2.34];

const centreOnScreen = (v: { s: number; x: number; y: number }, box: [number, number, number, number]) => {
  const r = boxRect(box, PAGE);
  return { x: v.x + v.s * (r.x + r.width / 2), y: v.y + v.s * (r.y + r.height / 2) };
};

describe('anchorFrame', () => {
  it('[AF1] the whole page fits the viewport, centred, never above scale 1', () => {
    const v = fitPage(VP, PAGE);
    expect(v.s).toBeCloseTo(400 / PAGE.height, 5);
    expect(v.y).toBeCloseTo(0, 5);
    expect(v.x).toBeCloseTo((360 - v.s * 360) / 2, 5);
    expect(fitPage({ width: 360, height: 2000 }, PAGE).s).toBe(1);
  });

  it('[AF2] on a phone, a whole printed row is readable: its label first, the value on the same line', () => {
    const v = frameBox(VP, PAGE, HB);
    const r = boxRect(HB, PAGE);
    expect(v.s * r.height).toBeGreaterThanOrEqual(MIN_LINE_PX - 0.01);
    expect(v.s).toBeLessThanOrEqual(MAX_SCALE);
    // the row's left edge (the label) on screen, with a margin
    expect(v.x + v.s * r.x).toBeGreaterThan(0);
    expect(v.x + v.s * r.x).toBeLessThan(VP.width * 0.2);
    // the result column of s-lab-fr-0001 (about 45 % of the page's width) still in view
    expect(v.x + v.s * 0.47 * PAGE.width).toBeLessThan(VP.width);
    // the line itself on screen, vertically centred
    expect(centreOnScreen(v, HB).y).toBeCloseTo(VP.height / 2, 0);
  });

  it('[AF2b] on a wide screen the whole row fits: centred, with its margins', () => {
    const wide = { width: 900, height: 500 };
    const page = { width: 900, height: 900 * 1.414 };
    const v = frameBox(wide, page, HB);
    const r = boxRect(HB, page);
    expect(v.x + v.s * r.x).toBeGreaterThanOrEqual(0);
    expect(v.x + v.s * (r.x + r.width)).toBeLessThanOrEqual(wide.width + 0.5);
    expect(v.x + v.s * (r.x + r.width / 2)).toBeCloseTo(wide.width / 2, 0);
  });

  it('[AF3] a small box zooms in, up to the maximum scale', () => {
    const v = frameBox(VP, PAGE, [40, 50, 2, 0.5]);
    expect(v.s).toBe(MAX_SCALE);
    const c = centreOnScreen(v, [40, 50, 2, 0.5]);
    expect(c.x).toBeCloseTo(VP.width / 2, 0);
    expect(c.y).toBeCloseTo(VP.height / 2, 0);
  });

  it('[AF4] a box in a corner keeps the page against the viewport\'s edge, no blank beyond it', () => {
    const v = frameBox(VP, PAGE, [0, 0, 5, 1]);
    expect(v.x).toBe(0);
    expect(v.y).toBe(0);
    const end = frameBox(VP, PAGE, [95, 98, 5, 2]);
    expect(end.x + end.s * PAGE.width).toBeCloseTo(VP.width, 5);
    expect(end.y + end.s * PAGE.height).toBeCloseTo(VP.height, 5);
  });

  it('[AF5] zooming keeps the pinched point still, between the whole page and the maximum', () => {
    const start = frameBox(VP, PAGE, HB);
    const point = { x: 200, y: 150 };
    const zoomed = zoomAt(start, 1.5, point, VP, PAGE);
    const beforeX = (point.x - start.x) / start.s;
    const afterX = (point.x - zoomed.x) / zoomed.s;
    expect(afterX).toBeCloseTo(beforeX, 5);
    expect(zoomAt(start, 100, point, VP, PAGE).s).toBe(MAX_SCALE);
    expect(sameView(zoomAt(start, 0.001, point, VP, PAGE), fitPage(VP, PAGE))).toBe(true);
  });

  it('[AF6] panning stops at the page\'s edges', () => {
    const v = frameBox(VP, PAGE, HB);
    expect(panBy(v, 10_000, 10_000, VP, PAGE)).toMatchObject({ x: 0, y: 0 });
    const far = panBy(v, -10_000, -10_000, VP, PAGE);
    expect(far.x).toBeCloseTo(VP.width - v.s * PAGE.width, 5);
    expect(clampView({ s: 0.5, x: -50, y: 900 }, VP, PAGE).x).toBeCloseTo((360 - 180) / 2, 5);
  });

  it('[AF7] only a box of four numbers in 0..100 with a size is used', () => {
    expect(isUsableBox(HB)).toBe(true);
    expect(isUsableBox([1, 2, 0, 3])).toBe(false);
    expect(isUsableBox([1, 2, 3])).toBe(false);
    expect(isUsableBox([1, 2, 3, 101])).toBe(false);
    expect(isUsableBox(['1', 2, 3, 4])).toBe(false);
    expect(isUsableBox(undefined)).toBe(false);
  });
});

describe('sourceAnchor', () => {
  it('[SA1] reads clientData.hdsSourceAnchor; a bad box is dropped, the page kept', () => {
    expect(readSourceAnchor({ hdsSourceAnchor: { attachmentId: 'f1', page: 1, bbox: HB } })).toEqual({ attachmentId: 'f1', page: 1, bbox: HB });
    expect(readSourceAnchor({ hdsSourceAnchor: { attachmentId: 'f1', page: 2, bbox: [1, 2, 3] } })).toEqual({ attachmentId: 'f1', page: 2 });
    expect(readSourceAnchor({ hdsSourceAnchor: { attachmentId: 'f1', page: 0 } })).toBeNull();
    expect(readSourceAnchor({ hdsSourceAnchor: { page: 1 } })).toBeNull();
    expect(readSourceAnchor({})).toBeNull();
    expect(readSourceAnchor(null)).toBeNull();
  });

  it('[SA2] the anchored attachment and its kind; none when the document lacks it', () => {
    const event = { attachments: [{ id: 'f1', fileName: 'scan.jpg', type: 'image/jpeg' }, { id: 'f2', fileName: 'report.pdf', type: 'application/pdf' }] };
    expect(anchoredAttachment(event, { attachmentId: 'f2', page: 1 })).toEqual({ attachment: event.attachments[1], kind: 'pdf' });
    expect(anchoredAttachment(event, { attachmentId: 'f1', page: 1 })?.kind).toBe('image');
    expect(anchoredAttachment(event, { attachmentId: 'gone', page: 1 })).toBeNull();
    expect(anchoredAttachment({ attachments: [{ id: 'x', fileName: 'notes.docx' }] }, { attachmentId: 'x', page: 1 })).toBeNull();
    expect(documentKindOf({ fileName: 'A.PDF' })).toBe('pdf');
    expect(documentKindOf({ type: 'image/heic' })).toBe('image');
  });
});

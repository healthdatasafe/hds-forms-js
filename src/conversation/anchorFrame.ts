/**
 * Where to look in a page: the transform that frames a value's box, shows the whole page, or follows a pinch.
 *
 * The page is laid out at the viewport's width (its "content" size, `page.width` = `viewport.width` at scale 1) and
 * moved with `translate(x, y) scale(s)`, origin top left. Pure, so the framing is tested without a browser.
 */

/** `[x, y, width, height]` in percent of the page as displayed, origin top left (data-model `hdsSourceAnchor.bbox`) */
export type AnchorBox = [number, number, number, number];

export interface Size { width: number; height: number }
export interface View { s: number; x: number; y: number }

/** The closest the view zooms in, times the page's width at scale 1 */
export const MAX_SCALE = 6;

/** The whole page in the viewport, centred: the furthest the view zooms out */
export function fitPage (viewport: Size, page: Size): View {
  const s = minScale(viewport, page);
  return clampView({ s, x: 0, y: 0 }, viewport, page);
}

export function minScale (viewport: Size, page: Size): number {
  if (page.width <= 0 || page.height <= 0) return 1;
  return Math.min(viewport.width / page.width, viewport.height / page.height, 1);
}

/** A box usable as a highlight: four numbers in 0..100, with a width and a height */
export function isUsableBox (box: unknown): box is AnchorBox {
  return Array.isArray(box) && box.length === 4 &&
    box.every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100) &&
    box[2] > 0 && box[3] > 0;
}

/** The box in content pixels */
export function boxRect (box: AnchorBox, page: Size): { x: number; y: number; width: number; height: number } {
  return {
    x: box[0] / 100 * page.width,
    y: box[1] / 100 * page.height,
    width: box[2] / 100 * page.width,
    height: box[3] / 100 * page.height
  };
}

/** The least height a framed line gets on screen, in CSS pixels: readable on a phone */
export const MIN_LINE_PX = 18;

/**
 * The value's box, as large as it fits with its surroundings (a little of the page left and right, about a line's
 * height above and below), and never smaller than a readable line. A box that is then wider than the screen (a whole
 * printed row on a phone) starts at its left edge, where the label is printed: the value follows on the same line,
 * and the rest is a drag away.
 */
export function frameBox (viewport: Size, page: Size, box: AnchorBox, maxScale = MAX_SCALE): View {
  const r = boxRect(box, page);
  const padX = Math.max(page.width * 0.03, 4);
  const padY = Math.max(r.height * 1.5, page.height * 0.01, 4);
  const fit = Math.min(viewport.width / (r.width + 2 * padX), viewport.height / (r.height + 2 * padY));
  const readable = MIN_LINE_PX / r.height;
  const s = Math.max(minScale(viewport, page), Math.min(Math.max(fit, readable), maxScale));
  const fitsAcross = s * (r.width + 2 * padX) <= viewport.width + 0.5;
  const x = fitsAcross ? viewport.width / 2 - s * (r.x + r.width / 2) : -s * (r.x - padX);
  return clampView({ s, x, y: viewport.height / 2 - s * (r.y + r.height / 2) }, viewport, page);
}

/** Keep the page on screen: centred on an axis where it is smaller than the viewport, else no gap at its edges */
export function clampView (view: View, viewport: Size, page: Size): View {
  const axis = (pos: number, scaled: number, room: number): number =>
    scaled <= room ? (room - scaled) / 2 : Math.min(0, Math.max(room - scaled, pos));
  return {
    s: view.s,
    x: axis(view.x, view.s * page.width, viewport.width),
    y: axis(view.y, view.s * page.height, viewport.height)
  };
}

/** Zoom by `factor` around a point of the viewport (a pinch's middle, or the viewport's centre for a button) */
export function zoomAt (view: View, factor: number, point: { x: number; y: number }, viewport: Size, page: Size, maxScale = MAX_SCALE): View {
  const s = Math.min(maxScale, Math.max(minScale(viewport, page), view.s * factor));
  const k = s / view.s;
  return clampView({ s, x: point.x - (point.x - view.x) * k, y: point.y - (point.y - view.y) * k }, viewport, page);
}

export function panBy (view: View, dx: number, dy: number, viewport: Size, page: Size): View {
  return clampView({ s: view.s, x: view.x + dx, y: view.y + dy }, viewport, page);
}

/** Two views show the same thing (within a pixel and a hundredth of scale) */
export function sameView (a: View, b: View): boolean {
  return Math.abs(a.s - b.s) < 0.01 && Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1;
}

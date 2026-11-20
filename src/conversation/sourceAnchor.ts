import { isUsableBox, type AnchorBox } from './anchorFrame';

/**
 * Where a value read from a document is printed in it: data-model `clientData.hdsSourceAnchor` (PROVENANCE.md). The
 * attachment of the document event, a page within it (an image is page 1) and, when the reader trusted one, a box.
 */
export interface SourceAnchor {
  attachmentId: string;
  page: number;
  bbox?: AnchorBox;
}

/** A document event's attachment, as Pryv lists it */
export interface DocumentAttachment {
  id: string;
  fileName?: string;
  type?: string;
}

export type DocumentKind = 'pdf' | 'image';

/** The anchor of a value, or null when it has none usable (its box is dropped, not the anchor, when only the box is wrong) */
export function readSourceAnchor (clientData: unknown): SourceAnchor | null {
  const a = (clientData as { hdsSourceAnchor?: unknown } | null | undefined)?.hdsSourceAnchor as Partial<SourceAnchor> | undefined;
  if (a == null || typeof a.attachmentId !== 'string' || a.attachmentId === '') return null;
  if (typeof a.page !== 'number' || !Number.isInteger(a.page) || a.page < 1) return null;
  return isUsableBox(a.bbox) ? { attachmentId: a.attachmentId, page: a.page, bbox: a.bbox } : { attachmentId: a.attachmentId, page: a.page };
}

/** A PDF or a picture, from the attachment's type, else its file name; null for anything else */
export function documentKindOf (file: { type?: string; fileName?: string } | null | undefined): DocumentKind | null {
  const type = (file?.type ?? '').toLowerCase();
  if (type === 'application/pdf') return 'pdf';
  if (type.startsWith('image/')) return 'image';
  const name = (file?.fileName ?? '').toLowerCase();
  if (name.endsWith('.pdf')) return 'pdf';
  if (/\.(png|jpe?g|gif|webp|bmp|heic|heif|tiff?)$/.test(name)) return 'image';
  return null;
}

/**
 * The attachment an anchor points into, with its kind; null when the document has no such attachment (deleted, or a
 * different document): the caller then ignores the anchor, as PROVENANCE.md says.
 */
export function anchoredAttachment (event: { attachments?: DocumentAttachment[] } | null | undefined, anchor: SourceAnchor | null | undefined): { attachment: DocumentAttachment; kind: DocumentKind } | null {
  if (event == null || anchor == null) return null;
  const attachment = (event.attachments ?? []).find((a) => a.id === anchor.attachmentId);
  if (attachment == null) return null;
  const kind = documentKindOf(attachment);
  return kind == null ? null : { attachment, kind };
}

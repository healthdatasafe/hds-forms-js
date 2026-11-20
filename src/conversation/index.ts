// hds-forms-js/conversation: the shared components of a conversation with the person (CMC messages, the HDS Reader)
export { AnchoredDocumentView } from './AnchoredDocumentView';
export type { AnchoredDocumentViewProps, AnchoredDocumentSource } from './AnchoredDocumentView';
export { readSourceAnchor, anchoredAttachment, documentKindOf } from './sourceAnchor';
export type { SourceAnchor, DocumentAttachment, DocumentKind } from './sourceAnchor';
export { fitPage, frameBox, clampView, zoomAt, panBy, isUsableBox, MAX_SCALE, MIN_LINE_PX } from './anchorFrame';
export type { AnchorBox, View, Size } from './anchorFrame';
export { loadPdfJs, DEFAULT_PDF_OPTIONS } from './pdfjs';
export type { PdfJsLike, PdfDocumentLike, PdfPageLike } from './pdfjs';
export { CONVERSATION_TEXTS } from './conversationTexts';

/**
 * Texts the conversation components show themselves. Each goes through hds-lib's `localizeText`, so a host that sets
 * the locale (as hds-webapp does) gets them in French with no extra prop.
 */
export const CONVERSATION_TEXTS = {
  region: { en: 'Your document, {label}', fr: 'Votre document, {label}' },
  regionNoLabel: { en: 'Your document', fr: 'Votre document' },
  highlight: { en: 'Where it is printed', fr: 'Là où c’est imprimé' },
  wholePage: { en: 'See the whole page', fr: 'Voir toute la page' },
  backToValue: { en: 'Back to the value', fr: 'Revenir à la valeur' },
  zoomIn: { en: 'Zoom in', fr: 'Agrandir' },
  zoomOut: { en: 'Zoom out', fr: 'Réduire' },
  page: { en: 'Page {n} of {total}', fr: 'Page {n} sur {total}' },
  noBox: { en: 'The exact place was not marked: here is the page it is on.', fr: 'L’endroit exact n’a pas été repéré : voici la page où il se trouve.' },
  loading: { en: 'Opening your document…', fr: 'Ouverture de votre document…' },
  cannotShow: { en: 'This document cannot be shown here.', fr: 'Ce document ne peut pas être affiché ici.' },
  pageMissing: { en: 'This page is not in the document.', fr: 'Cette page n’est pas dans le document.' }
} as const;

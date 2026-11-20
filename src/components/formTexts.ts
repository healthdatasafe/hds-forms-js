/**
 * Texts the section form and its fields show themselves (B-2026-11-20-8). Each one goes through hds-lib's
 * `localizeText`, so a host that sets the locale (as hds-webapp does) gets them in French with no extra prop.
 */
export const FORM_TEXTS = {
  date: { en: 'Date', fr: 'Date' },
  addEntry: { en: 'Add entry', fr: 'Ajouter' },
  submit: { en: 'Submit', fr: 'Envoyer' },
  previousEntries: { en: 'Previous entries', fr: 'Saisies précédentes' },
  actions: { en: 'Actions', fr: 'Actions' },
  edit: { en: 'Edit', fr: 'Modifier' },
  delete: { en: 'Delete', fr: 'Supprimer' },
  loadingConverter: { en: 'Loading converter...', fr: 'Chargement du convertisseur...' },
  converterUnavailable: { en: 'Converter engine not available', fr: 'Convertisseur indisponible' },
  inputMethod: { en: 'Input method', fr: 'Méthode de saisie' },
  selectMethod: { en: '-- Select method --', fr: '-- Choisir une méthode --' },
  recordedAs: { en: 'Recorded as', fr: 'Enregistré comme' },
  source: { en: 'Source', fr: 'Source' }
} as const;

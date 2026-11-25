/**
 * Texts the section form and its fields show themselves (B-2026-11-20-8). Each one goes through hds-lib's
 * `localizeText`, so a host that sets the locale (as hds-webapp does) gets them in French with no extra prop.
 */
export const FORM_TEXTS = {
  date: { en: 'Date', fr: 'Date', es: 'Fecha', it: 'Data', 'pt-BR': 'Data' },
  addEntry: { en: 'Add entry', fr: 'Ajouter', es: 'Añadir registro', it: 'Aggiungi registrazione', 'pt-BR': 'Adicionar registro' },
  submit: { en: 'Submit', fr: 'Envoyer', es: 'Enviar', it: 'Invia', 'pt-BR': 'Enviar' },
  previousEntries: { en: 'Previous entries', fr: 'Saisies précédentes', es: 'Registros anteriores', it: 'Registrazioni precedenti', 'pt-BR': 'Registros anteriores' },
  actions: { en: 'Actions', fr: 'Actions', es: 'Acciones', it: 'Azioni', 'pt-BR': 'Ações' },
  edit: { en: 'Edit', fr: 'Modifier', es: 'Modificar', it: 'Modifica', 'pt-BR': 'Editar' },
  delete: { en: 'Delete', fr: 'Supprimer', es: 'Eliminar', it: 'Elimina', 'pt-BR': 'Excluir' },
  loadingConverter: { en: 'Loading converter...', fr: 'Chargement du convertisseur...', es: 'Cargando el convertidor...', it: 'Caricamento del convertitore...', 'pt-BR': 'Carregando conversor...' },
  converterUnavailable: { en: 'Converter engine not available', fr: 'Convertisseur indisponible', es: 'Convertidor no disponible', it: 'Convertitore non disponibile', 'pt-BR': 'Conversor indisponível' },
  inputMethod: { en: 'Input method', fr: 'Méthode de saisie', es: 'Método de entrada', it: 'Metodo di inserimento', 'pt-BR': 'Método de entrada' },
  selectMethod: { en: '-- Select method --', fr: '-- Choisir une méthode --', es: '-- Elija un método --', it: '-- Scelga un metodo --', 'pt-BR': '-- Escolher método --' },
  recordedAs: { en: 'Recorded as', fr: 'Enregistré comme', es: 'Registrado como', it: 'Registrato come', 'pt-BR': 'Registrado como' },
  source: { en: 'Source', fr: 'Source', es: 'Origen', it: 'Fonte', 'pt-BR': 'Origem' }
} as const;

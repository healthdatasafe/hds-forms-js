/**
 * Texts the form-building components show themselves (form and questionnaire builders, reminder editor, item picker).
 * Each goes through hds-lib's `localizeText`, so a host that sets the locale gets them in its language; a host's own
 * `labels` still win. `{name}` placeholders are filled by `fill`.
 */

/** FormBuilder: one text per `FormBuilderLabels` key, then the texts a host does not override */
export const FORM_BUILDER_TEXTS = {
  searchItems: { en: 'Search items...', fr: 'Rechercher des éléments...' },
  selectSectionToAdd: { en: 'Select a section to add items', fr: 'Sélectionnez une section pour ajouter des éléments' },
  addPermanentSection: { en: 'Permanent section', fr: 'Section permanente' },
  addRecurringSection: { en: 'Recurring section', fr: 'Section récurrente' },
  bundledQuestionnaires: { en: 'Bundled questionnaires', fr: 'Questionnaires joints' },
  addQuestionnaire: { en: 'Add questionnaire', fr: 'Ajouter un questionnaire' },
  removeQuestionnaire: { en: 'Remove', fr: 'Retirer' },
  sectionName: { en: 'Section name', fr: 'Nom de la section' },
  clickToAdd: { en: 'Click items in the browser to add them', fr: 'Cliquez sur les éléments du navigateur pour les ajouter' },
  noItems: { en: 'No items — click to select this section', fr: 'Aucun élément — cliquez pour sélectionner cette section' },
  customize: { en: 'Customize', fr: 'Personnaliser' },
  repeatable: { en: 'Repeatable', fr: 'Répétable' },
  preview: { en: 'Preview', fr: 'Aperçu' },
  addSectionsToPreview: { en: 'Add sections to preview the form', fr: 'Ajoutez des sections pour prévisualiser le formulaire' },
  published: { en: 'Published', fr: 'Publié' },
  coverageOk: { en: 'All question items are covered by the request\'s permissions.', fr: 'Tous les éléments des questions sont couverts par les autorisations de la demande.' },
  // after a count: "2 permission(s) missing…", "1 unknown item(s)"
  coverageMissing: { en: 'permission(s) missing for this questionnaire', fr: 'autorisation(s) manquante(s) pour ce questionnaire' },
  coverageUnknown: { en: 'unknown item(s)', fr: 'élément(s) inconnu(s)' },
  coverageApply: { en: 'Add missing permissions to request', fr: 'Ajouter les autorisations manquantes à la demande' },
  unknownItem: { en: 'Unknown item: not in the data model, remove it', fr: 'Élément inconnu : absent du modèle de données, retirez-le' },

  typePermanent: { en: 'permanent', fr: 'permanente' },
  typeRecurring: { en: 'recurring', fr: 'récurrente' },
  toggleType: { en: 'Click to toggle type', fr: 'Cliquez pour changer le type' },
  moveSectionUp: { en: 'Move section up', fr: 'Monter la section' },
  moveSectionDown: { en: 'Move section down', fr: 'Descendre la section' },
  removeSection: { en: 'Remove section', fr: 'Retirer la section' },
  repeatableDefault: { en: 'default ({value})', fr: 'par défaut ({value})' }
} as const;

/** How often an item is entered, by its `repeatable` value */
export const REPEATABLE_TEXTS = {
  once: { en: 'Once', fr: 'Une fois' },
  any: { en: 'Any time', fr: 'À tout moment' },
  P1D: { en: 'Daily', fr: 'Chaque jour' },
  P1W: { en: 'Weekly', fr: 'Chaque semaine' },
  P1M: { en: 'Monthly', fr: 'Chaque mois' },
  unlimited: { en: 'Unlimited', fr: 'Sans limite' }
} as const;

/** ItemSearchPicker (its placeholder is FormBuilder's `searchItems`) */
export const ITEM_PICKER_TEXTS = {
  searchLabel: { en: 'Search items', fr: 'Rechercher des éléments' },
  noMatch: { en: 'No items match', fr: 'Aucun élément ne correspond' }
} as const;

/** QuestionnaireBuilder: one text per `QuestionnaireBuilderLabels` key, then the texts a host does not override */
export const QUESTIONNAIRE_BUILDER_TEXTS = {
  title: { en: 'Title', fr: 'Titre' },
  description: { en: 'Description', fr: 'Description' },
  addQuestion: { en: 'Add question', fr: 'Ajouter une question' },
  noQuestions: { en: 'No questions yet.', fr: 'Aucune question pour l’instant.' },
  questionKey: { en: 'Key', fr: 'Clé' },
  questionLabel: { en: 'Question text', fr: 'Texte de la question' },
  itemRef: { en: 'Item', fr: 'Élément' },
  scope: { en: 'Time scope', fr: 'Période' },
  withinDays: { en: 'Within days', fr: 'Nombre de jours' },
  subField: { en: 'Sub-field', fr: 'Champ complémentaire' },
  noSubField: { en: '(none)', fr: '(aucun)' },
  subFieldLabel: { en: 'Sub-field label', fr: 'Libellé du champ complémentaire' },
  subFieldOptions: { en: 'Options', fr: 'Options' },
  addOption: { en: '+ option', fr: '+ option' },
  optionValue: { en: 'Value', fr: 'Valeur' },
  optionLabel: { en: 'Label', fr: 'Libellé' },
  drugSystem: { en: 'Code system', fr: 'Système de codes' },
  drugCode: { en: 'Code', fr: 'Code' },
  drugFilter: { en: 'Drug filter', fr: 'Filtre par médicament' },
  drugFilterHint: {
    en: 'Restrict prefill matching to events whose drug.codes[] contains this code.',
    fr: 'Limite le préremplissage aux événements dont drug.codes[] contient ce code.'
  },
  remove: { en: 'Remove', fr: 'Retirer' },
  invalidKey: { en: 'Key must match [a-zA-Z0-9_-]+', fr: 'La clé doit correspondre à [a-zA-Z0-9_-]+' },
  invalidItemRef: { en: 'Pick an item from the list', fr: 'Choisissez un élément dans la liste' },

  noLabel: { en: '(no label)', fr: '(sans libellé)' },
  scopeEver: { en: 'Ever (lifetime)', fr: 'Depuis toujours (toute la vie)' },
  scopeWindow: { en: 'Within window', fr: 'Dans la période' },
  scopeLatest: { en: 'Latest, within', fr: 'La plus récente, dans la période' },
  // the same scopes, short, under a question; {n} is the number of days
  scopeEverShort: { en: 'ever', fr: 'depuis toujours' },
  scopeWindowShort: { en: 'window/{n}d', fr: 'période/{n} j' },
  scopeLatestShort: { en: 'latest/{n}d', fr: 'la plus récente/{n} j' },
  subFieldSelect: { en: 'select-segmented', fr: 'choix dans une liste' },
  subFieldText: { en: 'text', fr: 'texte' },
  subFieldNumber: { en: 'number', fr: 'nombre' },
  drugCodePlaceholder: { en: 'e.g. G03DA04', fr: 'p. ex. G03DA04' },
  subFieldLabelPlaceholder: { en: 'e.g. Trimester', fr: 'p. ex. Trimestre' }
} as const;

/** ReminderEditor */
export const REMINDER_TEXTS = {
  reminder: { en: 'Reminder:', fr: 'Rappel :' },
  noneInModel: { en: 'none in data model', fr: 'aucun dans le modèle de données' },
  type: { en: 'Type:', fr: 'Type :' },
  typeCooldown: { en: 'Cooldown', fr: 'Délai minimal' },
  typeInterval: { en: 'Expected interval', fr: 'Intervalle attendu' },
  typeRelative: { en: 'Relative to item', fr: 'Par rapport à un élément' },
  importance: { en: 'Importance:', fr: 'Importance :' },
  cooldown: { en: 'Cooldown:', fr: 'Délai minimal :' },
  min: { en: 'Min:', fr: 'Min. :' },
  max: { en: 'Max:', fr: 'Max. :' },
  relativeTo: { en: 'Relative to:', fr: 'Par rapport à :' },
  days: { en: 'Days:', fr: 'Jours :' },
  daysHint: { en: 'Comma-separated cycle days (e.g. 2, 3, 4)', fr: 'Jours du cycle séparés par des virgules (p. ex. 2, 3, 4)' },

  // the data model's own reminder, in one line
  describeCooldown: { en: 'cooldown: {value}', fr: 'délai minimal : {value}' },
  describeInterval: { en: 'interval: {min}–{max}', fr: 'intervalle : {min}–{max}' },
  describeRelative: { en: 'relative to {item} days [{days}]', fr: 'par rapport à {item}, jours [{days}]' },
  describeNoTiming: { en: 'configured (no timing)', fr: 'configuré (sans délai)' },

  importanceDefault: { en: 'default ({value})', fr: 'par défaut ({value})' },
  importanceMay: { en: 'may', fr: 'facultatif' },
  importanceShould: { en: 'should', fr: 'recommandé' },
  importanceMust: { en: 'must', fr: 'obligatoire' },
  importanceMayOption: { en: 'May (optional)', fr: 'Facultatif' },
  importanceShouldOption: { en: 'Should (recommended)', fr: 'Recommandé' },
  importanceMustOption: { en: 'Must (required)', fr: 'Obligatoire' },

  'duration.PT8H': { en: '8 hours', fr: '8 heures' },
  'duration.P1D': { en: '1 day', fr: '1 jour' },
  'duration.P2D': { en: '2 days', fr: '2 jours' },
  'duration.P1W': { en: '1 week', fr: '1 semaine' },
  'duration.P2W': { en: '2 weeks', fr: '2 semaines' },
  'duration.P21D': { en: '21 days', fr: '21 jours' },
  'duration.P1M': { en: '1 month', fr: '1 mois' },
  'duration.P35D': { en: '35 days', fr: '35 jours' },
  'duration.P3M': { en: '3 months', fr: '3 mois' },
  'duration.P6M': { en: '6 months', fr: '6 mois' },
  'duration.P1Y': { en: '1 year', fr: '1 an' }
} as const;

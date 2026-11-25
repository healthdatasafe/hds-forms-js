/**
 * Texts the form-building components show themselves (form and questionnaire builders, reminder editor, item picker).
 * Each goes through hds-lib's `localizeText`, so a host that sets the locale gets them in its language; a host's own
 * `labels` still win. `{name}` placeholders are filled by `fill`.
 */

/** FormBuilder: one text per `FormBuilderLabels` key, then the texts a host does not override */
export const FORM_BUILDER_TEXTS = {
  searchItems: { en: 'Search items...', fr: 'Rechercher des éléments...', es: 'Buscar elementos...', it: 'Cerca elementi...', 'pt-BR': 'Buscar itens...' },
  selectSectionToAdd: { en: 'Select a section to add items', fr: 'Sélectionnez une section pour ajouter des éléments', es: 'Seleccione una sección para añadir elementos', it: 'Selezioni una sezione per aggiungere elementi', 'pt-BR': 'Selecione uma seção para adicionar itens' },
  addPermanentSection: { en: 'Permanent section', fr: 'Section permanente', es: 'Sección permanente', it: 'Sezione permanente', 'pt-BR': 'Seção permanente' },
  addRecurringSection: { en: 'Recurring section', fr: 'Section récurrente', es: 'Sección recurrente', it: 'Sezione ricorrente', 'pt-BR': 'Seção recorrente' },
  bundledQuestionnaires: { en: 'Bundled questionnaires', fr: 'Questionnaires joints', es: 'Cuestionarios incluidos', it: 'Questionari inclusi', 'pt-BR': 'Questionários incluídos' },
  addQuestionnaire: { en: 'Add questionnaire', fr: 'Ajouter un questionnaire', es: 'Añadir cuestionario', it: 'Aggiungi questionario', 'pt-BR': 'Adicionar questionário' },
  newQuestionnaire: { en: 'New questionnaire', fr: 'Nouveau questionnaire', es: 'Nuevo cuestionario', it: 'Nuovo questionario', 'pt-BR': 'Novo questionário' },
  newQuestion: { en: 'New question', fr: 'Nouvelle question', es: 'Nueva pregunta', it: 'Nuova domanda', 'pt-BR': 'Nova pergunta' },
  removeQuestionnaire: { en: 'Remove', fr: 'Retirer', es: 'Quitar', it: 'Rimuovi', 'pt-BR': 'Remover' },
  sectionName: { en: 'Section name', fr: 'Nom de la section', es: 'Nombre de la sección', it: 'Nome della sezione', 'pt-BR': 'Nome da seção' },
  clickToAdd: { en: 'Click items in the browser to add them', fr: 'Cliquez sur les éléments du navigateur pour les ajouter', es: 'Haga clic en los elementos de la lista para añadirlos', it: 'Faccia clic sugli elementi dell’elenco per aggiungerli', 'pt-BR': 'Clique nos itens da lista para adicioná-los' },
  noItems: { en: 'No items — click to select this section', fr: 'Aucun élément — cliquez pour sélectionner cette section', es: 'Ningún elemento: haga clic para seleccionar esta sección', it: 'Nessun elemento: faccia clic per selezionare questa sezione', 'pt-BR': 'Nenhum item: clique para selecionar esta seção' },
  customize: { en: 'Customize', fr: 'Personnaliser', es: 'Personalizar', it: 'Personalizza', 'pt-BR': 'Personalizar' },
  repeatable: { en: 'Repeatable', fr: 'Répétable', es: 'Repetible', it: 'Ripetibile', 'pt-BR': 'Repetível' },
  preview: { en: 'Preview', fr: 'Aperçu', es: 'Vista previa', it: 'Anteprima', 'pt-BR': 'Pré-visualização' },
  addSectionsToPreview: { en: 'Add sections to preview the form', fr: 'Ajoutez des sections pour prévisualiser le formulaire', es: 'Añada secciones para ver la vista previa del formulario', it: 'Aggiunga sezioni per vedere l’anteprima del modulo', 'pt-BR': 'Adicione seções para pré-visualizar o formulário' },
  published: { en: 'Published', fr: 'Publié', es: 'Publicado', it: 'Pubblicato', 'pt-BR': 'Publicado' },
  coverageOk: { en: 'All question items are covered by the request\'s permissions.', fr: 'Tous les éléments des questions sont couverts par les autorisations de la demande.', es: 'Todos los elementos de las preguntas están cubiertos por los permisos de la solicitud.', it: 'Tutti gli elementi delle domande sono coperti dalle autorizzazioni della richiesta.', 'pt-BR': 'Todos os itens das perguntas estão cobertos pelas permissões da solicitação.' },
  // after a count: "2 permission(s) missing…", "1 unknown item(s)"
  coverageMissing: { en: 'permission(s) missing for this questionnaire', fr: 'autorisation(s) manquante(s) pour ce questionnaire', es: 'permiso(s) faltante(s) para este cuestionario', it: 'autorizzazione/i mancante/i per questo questionario', 'pt-BR': 'permissão(ões) ausente(s) para este questionário' },
  coverageUnknown: { en: 'unknown item(s)', fr: 'élément(s) inconnu(s)', es: 'elemento(s) desconocido(s)', it: 'elemento/i sconosciuto/i', 'pt-BR': 'item(ns) desconhecido(s)' },
  coverageApply: { en: 'Add missing permissions to request', fr: 'Ajouter les autorisations manquantes à la demande', es: 'Añadir los permisos faltantes a la solicitud', it: 'Aggiungi le autorizzazioni mancanti alla richiesta', 'pt-BR': 'Adicionar as permissões ausentes à solicitação' },
  unknownItem: { en: 'Unknown item: not in the data model, remove it', fr: 'Élément inconnu : absent du modèle de données, retirez-le', es: 'Elemento desconocido: no está en el modelo de datos, quítelo', it: 'Elemento sconosciuto: non è nel modello di dati, lo rimuova', 'pt-BR': 'Item desconhecido: não está no modelo de dados, remova-o' },

  typePermanent: { en: 'permanent', fr: 'permanente', es: 'permanente', it: 'permanente', 'pt-BR': 'permanente' },
  typeRecurring: { en: 'recurring', fr: 'récurrente', es: 'recurrente', it: 'ricorrente', 'pt-BR': 'recorrente' },
  toggleType: { en: 'Click to toggle type', fr: 'Cliquez pour changer le type', es: 'Haga clic para cambiar el tipo', it: 'Faccia clic per cambiare il tipo', 'pt-BR': 'Clique para alterar o tipo' },
  moveSectionUp: { en: 'Move section up', fr: 'Monter la section', es: 'Subir la sección', it: 'Sposta la sezione in su', 'pt-BR': 'Mover seção para cima' },
  moveSectionDown: { en: 'Move section down', fr: 'Descendre la section', es: 'Bajar la sección', it: 'Sposta la sezione in giù', 'pt-BR': 'Mover seção para baixo' },
  removeSection: { en: 'Remove section', fr: 'Retirer la section', es: 'Quitar la sección', it: 'Rimuovi la sezione', 'pt-BR': 'Remover seção' },
  repeatableDefault: { en: 'default ({value})', fr: 'par défaut ({value})', es: 'por defecto ({value})', it: 'predefinito ({value})', 'pt-BR': 'padrão ({value})' }
} as const;

/** How often an item is entered, by its `repeatable` value */
export const REPEATABLE_TEXTS = {
  once: { en: 'Once', fr: 'Une fois', es: 'Una vez', it: 'Una volta', 'pt-BR': 'Uma vez' },
  any: { en: 'Any time', fr: 'À tout moment', es: 'En cualquier momento', it: 'In qualsiasi momento', 'pt-BR': 'A qualquer momento' },
  P1D: { en: 'Daily', fr: 'Chaque jour', es: 'Cada día', it: 'Ogni giorno', 'pt-BR': 'Todos os dias' },
  P1W: { en: 'Weekly', fr: 'Chaque semaine', es: 'Cada semana', it: 'Ogni settimana', 'pt-BR': 'Toda semana' },
  P1M: { en: 'Monthly', fr: 'Chaque mois', es: 'Cada mes', it: 'Ogni mese', 'pt-BR': 'Todo mês' },
  unlimited: { en: 'Unlimited', fr: 'Sans limite', es: 'Sin límite', it: 'Senza limite', 'pt-BR': 'Sem limite' }
} as const;

/** ItemSearchPicker (its placeholder is FormBuilder's `searchItems`) */
export const ITEM_PICKER_TEXTS = {
  searchLabel: { en: 'Search items', fr: 'Rechercher des éléments', es: 'Buscar elementos', it: 'Cerca elementi', 'pt-BR': 'Buscar itens' },
  noMatch: { en: 'No items match', fr: 'Aucun élément ne correspond', es: 'Ningún elemento coincide', it: 'Nessun elemento corrispondente', 'pt-BR': 'Nenhum item correspondente' }
} as const;

/** QuestionnaireBuilder: one text per `QuestionnaireBuilderLabels` key, then the texts a host does not override */
export const QUESTIONNAIRE_BUILDER_TEXTS = {
  title: { en: 'Title', fr: 'Titre', es: 'Título', it: 'Titolo', 'pt-BR': 'Título' },
  description: { en: 'Description', fr: 'Description', es: 'Descripción', it: 'Descrizione', 'pt-BR': 'Descrição' },
  addQuestion: { en: 'Add question', fr: 'Ajouter une question', es: 'Añadir pregunta', it: 'Aggiungi domanda', 'pt-BR': 'Adicionar pergunta' },
  noQuestions: { en: 'No questions yet.', fr: 'Aucune question pour l’instant.', es: 'Aún no hay preguntas.', it: 'Ancora nessuna domanda.', 'pt-BR': 'Nenhuma pergunta ainda.' },
  questionKey: { en: 'Key', fr: 'Clé', es: 'Clave', it: 'Chiave', 'pt-BR': 'Chave' },
  questionLabel: { en: 'Question text', fr: 'Texte de la question', es: 'Texto de la pregunta', it: 'Testo della domanda', 'pt-BR': 'Texto da pergunta' },
  itemRef: { en: 'Item', fr: 'Élément', es: 'Elemento', it: 'Elemento', 'pt-BR': 'Item' },
  scope: { en: 'Time scope', fr: 'Période', es: 'Periodo', it: 'Periodo', 'pt-BR': 'Período' },
  withinDays: { en: 'Within days', fr: 'Nombre de jours', es: 'Número de días', it: 'Numero di giorni', 'pt-BR': 'Número de dias' },
  subField: { en: 'Sub-field', fr: 'Champ complémentaire', es: 'Subcampo', it: 'Sottocampo', 'pt-BR': 'Subcampo' },
  noSubField: { en: '(none)', fr: '(aucun)', es: '(ninguno)', it: '(nessuno)', 'pt-BR': '(nenhum)' },
  subFieldLabel: { en: 'Sub-field label', fr: 'Libellé du champ complémentaire', es: 'Etiqueta del subcampo', it: 'Etichetta del sottocampo', 'pt-BR': 'Rótulo do subcampo' },
  subFieldOptions: { en: 'Options', fr: 'Options', es: 'Opciones', it: 'Opzioni', 'pt-BR': 'Opções' },
  addOption: { en: '+ option', fr: '+ option', es: '+ opción', it: '+ opzione', 'pt-BR': '+ opção' },
  optionValue: { en: 'Value', fr: 'Valeur', es: 'Valor', it: 'Valore', 'pt-BR': 'Valor' },
  optionLabel: { en: 'Label', fr: 'Libellé', es: 'Etiqueta', it: 'Etichetta', 'pt-BR': 'Rótulo' },
  drugSystem: { en: 'Code system', fr: 'Système de codes', es: 'Sistema de códigos', it: 'Sistema di codifica', 'pt-BR': 'Sistema de códigos' },
  drugCode: { en: 'Code', fr: 'Code', es: 'Código', it: 'Codice', 'pt-BR': 'Código' },
  drugFilter: { en: 'Drug filter', fr: 'Filtre par médicament', es: 'Filtro por medicamento', it: 'Filtro per medicinale', 'pt-BR': 'Filtro por medicamento' },
  drugFilterHint: {
    en: 'Restrict prefill matching to events whose drug.codes[] contains this code.',
    fr: 'Limite le préremplissage aux événements dont drug.codes[] contient ce code.',
    es: 'Limita el rellenado previo a los eventos cuyo drug.codes[] contiene este código.',
    it: 'Limita la precompilazione agli eventi il cui drug.codes[] contiene questo codice.',
    'pt-BR': 'Limita o preenchimento prévio aos eventos cujo drug.codes[] contém este código.'
  },
  remove: { en: 'Remove', fr: 'Retirer', es: 'Quitar', it: 'Rimuovi', 'pt-BR': 'Remover' },
  invalidKey: { en: 'Key must match [a-zA-Z0-9_-]+', fr: 'La clé doit correspondre à [a-zA-Z0-9_-]+', es: 'La clave debe corresponder a [a-zA-Z0-9_-]+', it: 'La chiave deve corrispondere a [a-zA-Z0-9_-]+', 'pt-BR': 'A chave deve corresponder a [a-zA-Z0-9_-]+' },
  invalidItemRef: { en: 'Pick an item from the list', fr: 'Choisissez un élément dans la liste', es: 'Elija un elemento de la lista', it: 'Scelga un elemento dall’elenco', 'pt-BR': 'Escolha um item da lista' },

  noLabel: { en: '(no label)', fr: '(sans libellé)', es: '(sin etiqueta)', it: '(senza etichetta)', 'pt-BR': '(sem rótulo)' },
  scopeEver: { en: 'Ever (lifetime)', fr: 'Depuis toujours (toute la vie)', es: 'Alguna vez (toda la vida)', it: 'In tutta la vita', 'pt-BR': 'Alguma vez (toda a vida)' },
  scopeWindow: { en: 'Within window', fr: 'Dans la période', es: 'En el periodo', it: 'Nel periodo', 'pt-BR': 'No período' },
  scopeLatest: { en: 'Latest, within', fr: 'La plus récente, dans la période', es: 'Más reciente, en el periodo', it: 'Più recente, nel periodo', 'pt-BR': 'Mais recente, no período' },
  // the same scopes, short, under a question; {n} is the number of days
  scopeEverShort: { en: 'ever', fr: 'depuis toujours', es: 'alguna vez', it: 'in tutta la vita', 'pt-BR': 'alguma vez' },
  scopeWindowShort: { en: 'window/{n}d', fr: 'période/{n} j', es: 'periodo/{n}d', it: 'periodo/{n} gg', 'pt-BR': 'período/{n}d' },
  scopeLatestShort: { en: 'latest/{n}d', fr: 'la plus récente/{n} j', es: 'más reciente/{n}d', it: 'più recente/{n} gg', 'pt-BR': 'mais recente/{n}d' },
  subFieldSelect: { en: 'select-segmented', fr: 'choix dans une liste', es: 'selección en una lista', it: 'scelta da un elenco', 'pt-BR': 'escolha em uma lista' },
  subFieldText: { en: 'text', fr: 'texte', es: 'texto', it: 'testo', 'pt-BR': 'texto' },
  subFieldNumber: { en: 'number', fr: 'nombre', es: 'número', it: 'numero', 'pt-BR': 'número' },
  drugCodePlaceholder: { en: 'e.g. G03DA04', fr: 'p. ex. G03DA04', es: 'p. ej. G03DA04', it: 'ad es. G03DA04', 'pt-BR': 'p. ex. G03DA04' },
  subFieldLabelPlaceholder: { en: 'e.g. Trimester', fr: 'p. ex. Trimestre', es: 'p. ej. Trimestre', it: 'ad es. Trimestre', 'pt-BR': 'p. ex. Trimestre' }
} as const;

/** ReminderEditor */
export const REMINDER_TEXTS = {
  reminder: { en: 'Reminder:', fr: 'Rappel :', es: 'Recordatorio:', it: 'Promemoria:', 'pt-BR': 'Lembrete:' },
  noneInModel: { en: 'none in data model', fr: 'aucun dans le modèle de données', es: 'ninguno en el modelo de datos', it: 'nessuno nel modello di dati', 'pt-BR': 'nenhum no modelo de dados' },
  type: { en: 'Type:', fr: 'Type :', es: 'Tipo:', it: 'Tipo:', 'pt-BR': 'Tipo:' },
  typeCooldown: { en: 'Cooldown', fr: 'Délai minimal', es: 'Espera mínima', it: 'Attesa minima', 'pt-BR': 'Espera mínima' },
  typeInterval: { en: 'Expected interval', fr: 'Intervalle attendu', es: 'Intervalo esperado', it: 'Intervallo previsto', 'pt-BR': 'Intervalo esperado' },
  typeRelative: { en: 'Relative to item', fr: 'Par rapport à un élément', es: 'Con respecto a un elemento', it: 'Rispetto a un elemento', 'pt-BR': 'Em relação a um item' },
  importance: { en: 'Importance:', fr: 'Importance :', es: 'Importancia:', it: 'Importanza:', 'pt-BR': 'Importância:' },
  cooldown: { en: 'Cooldown:', fr: 'Délai minimal :', es: 'Espera mínima:', it: 'Attesa minima:', 'pt-BR': 'Espera mínima:' },
  min: { en: 'Min:', fr: 'Min. :', es: 'Mín.:', it: 'Min.:', 'pt-BR': 'Mín.:' },
  max: { en: 'Max:', fr: 'Max. :', es: 'Máx.:', it: 'Max.:', 'pt-BR': 'Máx.:' },
  relativeTo: { en: 'Relative to:', fr: 'Par rapport à :', es: 'Con respecto a:', it: 'Rispetto a:', 'pt-BR': 'Em relação a:' },
  days: { en: 'Days:', fr: 'Jours :', es: 'Días:', it: 'Giorni:', 'pt-BR': 'Dias:' },
  daysHint: { en: 'Comma-separated cycle days (e.g. 2, 3, 4)', fr: 'Jours du cycle séparés par des virgules (p. ex. 2, 3, 4)', es: 'Días del ciclo separados por comas (p. ej. 2, 3, 4)', it: 'Giorni del ciclo separati da virgole (ad es. 2, 3, 4)', 'pt-BR': 'Dias do ciclo separados por vírgulas (p. ex. 2, 3, 4)' },

  // the data model's own reminder, in one line
  describeCooldown: { en: 'cooldown: {value}', fr: 'délai minimal : {value}', es: 'espera mínima: {value}', it: 'attesa minima: {value}', 'pt-BR': 'espera mínima: {value}' },
  describeInterval: { en: 'interval: {min}–{max}', fr: 'intervalle : {min}–{max}', es: 'intervalo: {min}–{max}', it: 'intervallo: {min}–{max}', 'pt-BR': 'intervalo: {min}–{max}' },
  describeRelative: { en: 'relative to {item} days [{days}]', fr: 'par rapport à {item}, jours [{days}]', es: 'con respecto a {item}, días [{days}]', it: 'rispetto a {item}, giorni [{days}]', 'pt-BR': 'em relação a {item}, dias [{days}]' },
  describeNoTiming: { en: 'configured (no timing)', fr: 'configuré (sans délai)', es: 'configurado (sin plazo)', it: 'configurato (senza tempistica)', 'pt-BR': 'configurado (sem prazo)' },

  importanceDefault: { en: 'default ({value})', fr: 'par défaut ({value})', es: 'por defecto ({value})', it: 'predefinito ({value})', 'pt-BR': 'padrão ({value})' },
  importanceMay: { en: 'may', fr: 'facultatif', es: 'opcional', it: 'facoltativo', 'pt-BR': 'opcional' },
  importanceShould: { en: 'should', fr: 'recommandé', es: 'recomendado', it: 'consigliato', 'pt-BR': 'recomendado' },
  importanceMust: { en: 'must', fr: 'obligatoire', es: 'obligatorio', it: 'obbligatorio', 'pt-BR': 'obrigatório' },
  importanceMayOption: { en: 'May (optional)', fr: 'Facultatif', es: 'Opcional', it: 'Facoltativo', 'pt-BR': 'Opcional' },
  importanceShouldOption: { en: 'Should (recommended)', fr: 'Recommandé', es: 'Recomendado', it: 'Consigliato', 'pt-BR': 'Recomendado' },
  importanceMustOption: { en: 'Must (required)', fr: 'Obligatoire', es: 'Obligatorio', it: 'Obbligatorio', 'pt-BR': 'Obrigatório' },

  'duration.PT8H': { en: '8 hours', fr: '8 heures', es: '8 horas', it: '8 ore', 'pt-BR': '8 horas' },
  'duration.P1D': { en: '1 day', fr: '1 jour', es: '1 día', it: '1 giorno', 'pt-BR': '1 dia' },
  'duration.P2D': { en: '2 days', fr: '2 jours', es: '2 días', it: '2 giorni', 'pt-BR': '2 dias' },
  'duration.P1W': { en: '1 week', fr: '1 semaine', es: '1 semana', it: '1 settimana', 'pt-BR': '1 semana' },
  'duration.P2W': { en: '2 weeks', fr: '2 semaines', es: '2 semanas', it: '2 settimane', 'pt-BR': '2 semanas' },
  'duration.P21D': { en: '21 days', fr: '21 jours', es: '21 días', it: '21 giorni', 'pt-BR': '21 dias' },
  'duration.P1M': { en: '1 month', fr: '1 mois', es: '1 mes', it: '1 mese', 'pt-BR': '1 mês' },
  'duration.P35D': { en: '35 days', fr: '35 jours', es: '35 días', it: '35 giorni', 'pt-BR': '35 dias' },
  'duration.P3M': { en: '3 months', fr: '3 mois', es: '3 meses', it: '3 mesi', 'pt-BR': '3 meses' },
  'duration.P6M': { en: '6 months', fr: '6 mois', es: '6 meses', it: '6 mesi', 'pt-BR': '6 meses' },
  'duration.P1Y': { en: '1 year', fr: '1 an', es: '1 año', it: '1 anno', 'pt-BR': '1 ano' }
} as const;

import { localizeText } from 'hds-lib';

/** The texts `HDSQuestionnaireForm` shows itself; a consumer passes its own translations through its `labels` prop. */
export interface QuestionnaireFormLabels {
  answered: string;
  no: string;
  unknown: string;
  declined: string;
  /** The label of the optional reason field under a declined question. */
  reason: string;
  /** The placeholder of that field. */
  reasonPlaceholder: string;
}

type Texts = Record<keyof QuestionnaireFormLabels, { en: string; fr: string; es: string; it: string; 'pt-BR': string }>;

/** Every HDSQuestionnaireForm text in each language hds-forms-js ships; the form shows them in the current language. */
export const QUESTIONNAIRE_FORM_TEXTS: Texts = {
  answered: { en: 'Yes', fr: 'Oui', es: 'Sí', it: 'Sì', 'pt-BR': 'Sim' },
  no: { en: 'No', fr: 'Non', es: 'No', it: 'No', 'pt-BR': 'Não' },
  unknown: { en: "I don't know", fr: 'Je ne sais pas', es: 'No lo sé', it: 'Non lo so', 'pt-BR': 'Não sei' },
  declined: { en: "I'd rather not say", fr: 'Je préfère ne pas répondre', es: 'Prefiero no decirlo', it: 'Preferisco non dirlo', 'pt-BR': 'Prefiro não dizer' },
  reason: { en: 'Reason (optional)', fr: 'Raison (facultatif)', es: 'Motivo (opcional)', it: 'Motivo (facoltativo)', 'pt-BR': 'Motivo (opcional)' },
  reasonPlaceholder: { en: 'e.g. privacy', fr: 'p. ex. confidentialité', es: 'p. ej. privacidad', it: 'ad es. riservatezza', 'pt-BR': 'p. ex. privacidade' }
};

/** The HDSQuestionnaireForm texts in the current language (hds-lib's preferred locales). */
export function questionnaireFormLabels (): QuestionnaireFormLabels {
  const out = {} as QuestionnaireFormLabels;
  for (const key of Object.keys(QUESTIONNAIRE_FORM_TEXTS) as Array<keyof QuestionnaireFormLabels>) out[key] = localizeText(QUESTIONNAIRE_FORM_TEXTS[key]);
  return out;
}

/** English defaults; the form itself now defaults to `questionnaireFormLabels()`. */
export const DEFAULT_QUESTIONNAIRE_LABELS: QuestionnaireFormLabels = Object.fromEntries(
  Object.entries(QUESTIONNAIRE_FORM_TEXTS).map(([key, text]) => [key, text.en])
) as unknown as QuestionnaireFormLabels;

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

export const DEFAULT_QUESTIONNAIRE_LABELS: QuestionnaireFormLabels = {
  answered: 'Yes',
  no: 'No',
  unknown: "I don't know",
  declined: "I'd rather not say",
  reason: 'Reason (optional)',
  reasonPlaceholder: 'e.g. privacy'
};

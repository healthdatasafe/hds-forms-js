import { localizeText } from 'hds-lib';
import type { ConsentPanelLabels } from './ConsentPanel';

type Texts = Record<keyof ConsentPanelLabels, { en: string; fr: string; es: string; it: string; 'pt-BR': string }>;

/** Every ConsentPanel label in each language hds-forms-js ships; the panel shows them in the current language. */
export const CONSENT_TEXTS: Texts = {
  required: { en: 'required', fr: 'obligatoire', es: 'obligatorio', it: 'obbligatorio', 'pt-BR': 'obrigatório' },
  eyebrow: { en: 'Permission request', fr: 'Demande d’autorisation', es: 'Solicitud de permiso', it: 'Richiesta di autorizzazione', 'pt-BR': 'Pedido de permissão' },
  requesting: { en: '{app} is requesting permission to:', fr: '{app} demande l’autorisation de :', es: '{app} solicita permiso para:', it: '{app} chiede l’autorizzazione a:', 'pt-BR': '{app} pede permissão para:' },
  noPermissions: { en: 'No specific permissions declared by this app.', fr: 'Cette application ne déclare aucune autorisation particulière.', es: 'Esta aplicación no declara ningún permiso específico.', it: 'Questa applicazione non dichiara alcuna autorizzazione specifica.', 'pt-BR': 'Este aplicativo não declara nenhuma permissão específica.' },
  streamAll: { en: 'All data', fr: 'Toutes les données', es: 'Todos los datos', it: 'Tutti i dati', 'pt-BR': 'Todos os dados' },
  levelRead: { en: 'read', fr: 'lire', es: 'leer', it: 'leggere', 'pt-BR': 'ler' },
  levelContribute: { en: 'contribute', fr: 'contribuer', es: 'contribuir', it: 'contribuire', 'pt-BR': 'contribuir' },
  levelManage: { en: 'manage', fr: 'gérer', es: 'gestionar', it: 'gestire', 'pt-BR': 'gerenciar' },
  footnote: { en: 'You can revoke this access at any time from your account.', fr: 'Vous pouvez retirer cet accès à tout moment depuis votre compte.', es: 'Puede retirar este acceso en cualquier momento desde su cuenta.', it: 'Può revocare questo accesso in qualsiasi momento dal suo account.', 'pt-BR': 'Você pode revogar este acesso a qualquer momento na sua conta.' },
  expiresAfter: { en: 'Expires after: {seconds}s', fr: 'Expire après : {seconds} s', es: 'Caduca después de: {seconds} s', it: 'Scade dopo: {seconds} s', 'pt-BR': 'Expira após: {seconds} s' },
  mismatchWarning: { en: 'This app already has an access with different permissions. Approving will update it.', fr: 'Cette application a déjà un accès avec d’autres autorisations. L’accepter le mettra à jour.', es: 'Esta aplicación ya tiene un acceso con otros permisos. Aceptar lo actualizará.', it: 'Questa applicazione ha già un accesso con altre autorizzazioni. Accettare lo aggiornerà.', 'pt-BR': 'Este aplicativo já tem um acesso com outras permissões. Aceitar vai atualizá-lo.' },
  accept: { en: 'Allow', fr: 'Autoriser', es: 'Permitir', it: 'Consenti', 'pt-BR': 'Permitir' },
  refuse: { en: 'Refuse', fr: 'Refuser', es: 'Rechazar', it: 'Rifiuta', 'pt-BR': 'Recusar' },
  accepting: { en: 'Allowing…', fr: 'Autorisation…', es: 'Permitiendo…', it: 'Autorizzazione…', 'pt-BR': 'Permitindo…' },
  refusing: { en: 'Refusing…', fr: 'Refus…', es: 'Rechazando…', it: 'Rifiuto…', 'pt-BR': 'Recusando…' }
};

/** The ConsentPanel labels in the current language (hds-lib's preferred locales). */
export function consentLabels (): ConsentPanelLabels {
  const out = {} as ConsentPanelLabels;
  for (const key of Object.keys(CONSENT_TEXTS) as Array<keyof ConsentPanelLabels>) out[key] = localizeText(CONSENT_TEXTS[key]);
  return out;
}

/** English defaults for every ConsentPanel label; the panel itself now defaults to `consentLabels()`. */
export const DEFAULT_CONSENT_LABELS: ConsentPanelLabels = Object.fromEntries(
  Object.entries(CONSENT_TEXTS).map(([key, text]) => [key, text.en])
) as unknown as ConsentPanelLabels;

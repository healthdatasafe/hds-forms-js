import type { ConsentPanelLabels } from './ConsentPanel';

/** English defaults for every ConsentPanel label; override any of them through the `labels` prop. */
export const DEFAULT_CONSENT_LABELS: ConsentPanelLabels = {
  eyebrow: 'Permission request',
  requesting: '{app} is requesting permission to:',
  noPermissions: 'No specific permissions declared by this app.',
  streamAll: 'All data',
  levelRead: 'read',
  levelContribute: 'contribute',
  levelManage: 'manage',
  footnote: 'You can revoke this access at any time from your account.',
  expiresAfter: 'Expires after: {seconds}s',
  mismatchWarning: 'This app already has an access with different permissions. Approving will update it.',
  accept: 'Allow',
  refuse: 'Refuse',
  accepting: 'Allowing…',
  refusing: 'Refusing…'
};

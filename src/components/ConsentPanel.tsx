import type { ReactNode } from 'react';
import { DEFAULT_CONSENT_LABELS } from './consentLabels';

/**
 * ConsentPanel — the one "this app wants these permissions, allow?" body that
 * every HDS consent surface renders.
 *
 * Pure presentational: no fetch, no router, no global state. The consumer
 * supplies the frame (a modal overlay, a card in an auth flow, …), wires the
 * accept / refuse side effects, and passes its own translated labels.
 *
 * Inputs follow Pryv's permission shape; a wildcard streamId `'*'` is rendered
 * with the `streamAll` label.
 */

export type ConsentPermissionLevel = 'read' | 'contribute' | 'manage' | string;

export interface ConsentPermission {
  streamId: string;
  level: ConsentPermissionLevel;
  /** Display name when the stream exists on the account. */
  name?: string;
  /** Display name the requester proposes for a stream that does not exist yet. */
  defaultName?: string;
}

export interface ConsentPanelLabels {
  /** Eyebrow above the title, e.g. "Permission request". Empty string hides it. */
  eyebrow: string;
  /** Sentence introducing the permission list; `{app}` is replaced by the app name. */
  requesting: string;
  /** Shown when the requester declares no permissions. */
  noPermissions: string;
  /** Label for the wildcard stream `'*'`. */
  streamAll: string;
  /** Per-level labels. */
  levelRead: string;
  levelContribute: string;
  levelManage: string;
  /** Footnote under the list, e.g. where the access can be revoked. Empty string hides it. */
  footnote: string;
  /** Expiry notice; `{seconds}` is replaced. Rendered only when `expireAfterSeconds` is set. */
  expiresAfter: string;
  /** Warning shown when `mismatchWarning` is true and no custom text is given. */
  mismatchWarning: string;
  accept: string;
  refuse: string;
  /** Button labels while `busy`. */
  accepting: string;
  refusing: string;
}


export interface ConsentPanelProps {
  /** Requesting app: name shown in the title, optional icon node before it. */
  app: { name: string; icon?: ReactNode };
  /** Optional consent text the requester wrote (rendered pre-line, not markdown). */
  consentText?: string | null;
  permissions: ConsentPermission[];
  /** Renders the expiry notice when set. */
  expireAfterSeconds?: number | null;
  /** `true` renders the default warning; a string renders that text. */
  mismatchWarning?: boolean | string;
  /** Disables both buttons and swaps their labels. */
  busy?: boolean | 'accepting' | 'refusing';
  /** Optional error / extra content rendered above the buttons. */
  children?: ReactNode;
  onAccept: () => void;
  onRefuse: () => void;
  /** Override any default English label (for i18n). */
  labels?: Partial<ConsentPanelLabels>;
  className?: string;
}

function fill (template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export function ConsentPanel ({
  app, consentText, permissions, expireAfterSeconds, mismatchWarning, busy,
  children, onAccept, onRefuse, labels, className = ''
}: ConsentPanelProps) {
  const lb: ConsentPanelLabels = { ...DEFAULT_CONSENT_LABELS, ...labels };
  const isBusy = !!busy;
  const levelLabel = (level: ConsentPermissionLevel): string =>
    level === 'manage' ? lb.levelManage : level === 'contribute' ? lb.levelContribute : lb.levelRead;

  return (
    <div className={`text-sm text-gray-900 dark:text-gray-100 ${className}`} data-testid='consent-panel'>
      <header className='mb-4'>
        {lb.eyebrow !== '' && (
          <p className='text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400'>{lb.eyebrow}</p>
        )}
        <h2 className='mt-1 flex items-center gap-3 text-lg font-semibold tracking-tight'>
          {app.icon != null && <span className='shrink-0' aria-hidden>{app.icon}</span>}
          <span>{app.name}</span>
        </h2>
      </header>

      {consentText != null && consentText !== '' && (
        <div className='mb-4 whitespace-pre-line rounded-lg bg-gray-100 p-4 dark:bg-gray-800'>{consentText}</div>
      )}

      <p className='font-medium'>{fill(lb.requesting, { app: app.name })}</p>
      {permissions.length === 0
        ? <p className='mt-2 italic text-gray-500 dark:text-gray-400'>{lb.noPermissions}</p>
        : (
          <ul className='mt-3 space-y-2'>
            {permissions.map((p, i) => (
              <li key={`${p.streamId}-${i}`} className='flex items-start gap-3 rounded-lg border border-gray-200 px-3 py-2.5 dark:border-gray-700'>
                <LevelIcon level={p.level} />
                <div className='flex-1 leading-snug'>
                  <span className='text-gray-500 dark:text-gray-400'>{levelLabel(p.level)}</span>{' '}
                  <span className='break-all font-semibold'>
                    {p.streamId === '*' ? lb.streamAll : (p.name ?? p.defaultName ?? p.streamId)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          )}

      {expireAfterSeconds != null && (
        <p className='mt-4'>{fill(lb.expiresAfter, { seconds: expireAfterSeconds })}</p>
      )}
      {mismatchWarning != null && mismatchWarning !== false && (
        <div role='status' className='mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100'>
          {typeof mismatchWarning === 'string' ? mismatchWarning : lb.mismatchWarning}
        </div>
      )}
      {lb.footnote !== '' && (
        <p className='mt-4 text-xs text-gray-500 dark:text-gray-400'>{lb.footnote}</p>
      )}

      {children != null && <div className='mt-4'>{children}</div>}

      <div className='mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3'>
        <button
          type='button'
          onClick={onRefuse}
          disabled={isBusy}
          className='inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-800'
        >
          {busy === 'refusing' ? lb.refusing : lb.refuse}
        </button>
        <button
          type='button'
          onClick={onAccept}
          disabled={isBusy}
          className='inline-flex min-h-11 items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/40 disabled:cursor-not-allowed disabled:opacity-50'
        >
          {busy === true || busy === 'accepting' ? lb.accepting : lb.accept}
        </button>
      </div>
    </div>
  );
}

function LevelIcon ({ level }: { level: ConsentPermissionLevel }) {
  const common = {
    xmlns: 'http://www.w3.org/2000/svg',
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    className: 'mt-0.5 shrink-0 text-primary-600'
  };
  if (level === 'manage') {
    return (
      <svg {...common}>
        <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z' />
        <path d='m9 12 2 2 4-4' />
      </svg>
    );
  }
  if (level === 'contribute') {
    return (
      <svg {...common}>
        <path d='M12 20h9' />
        <path d='M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z' />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d='M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z' />
      <circle cx='12' cy='12' r='3' />
    </svg>
  );
}

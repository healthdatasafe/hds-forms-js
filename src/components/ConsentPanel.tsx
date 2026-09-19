import { useMemo, useState } from 'react';
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
  /** Suffix marking a permission the user cannot leave out. */
  required: string;
  accept: string;
  refuse: string;
  /** Button labels while `busy`. */
  accepting: string;
  refusing: string;
}

/**
 * Per-permission consent annotations, as `pryv` 3.12.0's `authRequest.consent` sidecar
 * carries them. Ids are a stream permission's `streamId` or a feature permission's `feature`.
 *
 * Absent (the default) keeps the all-or-nothing behaviour every existing caller relies on.
 */
export interface ConsentAnnotations {
  /** false (default): accept the whole set or deny. true: the user may choose. */
  allowUserChoice?: boolean;
  /** Ids the user cannot leave out; rendered checked and locked. */
  mandatory?: string[];
  /** Ids offered NOT pre-selected, so the user has to opt in. */
  optIn?: string[];
}

/** The id an annotation refers to: a stream permission's streamId, or a feature's name. */
export function permissionId (p: ConsentPermission): string {
  return (p as { feature?: string }).feature ?? p.streamId;
}

export interface ConsentPanelProps {
  /** Requesting app: `name` is substituted into `{app}` labels and shown as the title unless `title` is given; optional icon node before it. */
  app: { name: string; icon?: ReactNode };
  /** Title line, e.g. "Mira would like to connect". Defaults to `app.name`. */
  title?: ReactNode;
  /**
   * Optional consent text the requester wrote — the app's own explanation of
   * what it will do with the data, and the only part of this panel not written
   * by HDS.
   *
   * A **string** renders pre-line, as before. A **node** renders as given, so a
   * consumer that already parses the message (markdown, say) can pass elements
   * instead of losing the formatting. Rendering is left to the consumer on
   * purpose: this text is supplied by the requesting app and is therefore
   * untrusted, so the panel must never be handed raw HTML to inject.
   */
  consentText?: ReactNode;
  permissions: ConsentPermission[];
  /** Renders the expiry notice when set. */
  expireAfterSeconds?: number | null;
  /** `true` renders the default warning; a string renders that text. */
  mismatchWarning?: boolean | string;
  /** Disables both buttons and swaps their labels. */
  busy?: boolean | 'accepting' | 'refusing';
  /** Optional error / extra content rendered above the buttons. */
  children?: ReactNode;
  /**
   * Accept. With a selectable list the granted subset is passed; without one it is called with
   * no argument, so existing callers are unaffected.
   */
  onAccept: (granted?: ConsentPermission[]) => void;
  onRefuse: () => void;
  /**
   * Consent-form annotations. When `allowUserChoice` is true the list becomes selectable and
   * `onAccept` receives the granted subset; otherwise the panel behaves exactly as before.
   */
  consent?: ConsentAnnotations | null;
  /** Override any default English label (for i18n). */
  labels?: Partial<ConsentPanelLabels>;
  className?: string;
}

function fill (template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export function ConsentPanel ({
  app, title, consentText, permissions, expireAfterSeconds, mismatchWarning, busy,
  children, onAccept, onRefuse, consent, labels, className = ''
}: ConsentPanelProps) {
  const selectable = consent?.allowUserChoice === true;
  const mandatory = useMemo(() => new Set(consent?.mandatory ?? []), [consent?.mandatory]);
  const optIn = useMemo(() => new Set(consent?.optIn ?? []), [consent?.optIn]);
  // Initial selection: mandatory and plain entries in, opt-in entries out.
  const [granted, setGranted] = useState<Set<string>>(
    () => new Set(permissions.map(permissionId).filter((id) => !optIn.has(id) || mandatory.has(id)))
  );
  const toggle = (id: string): void => {
    if (mandatory.has(id)) return;
    setGranted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const acceptSelection = (): void => {
    onAccept(selectable ? permissions.filter((p) => granted.has(permissionId(p))) : undefined);
  };
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
          <span>{title ?? app.name}</span>
        </h2>
      </header>

      {consentText != null && consentText !== '' && (
        <div
          className={`mb-4 rounded-lg bg-gray-100 p-4 dark:bg-gray-800${
            typeof consentText === 'string' ? ' whitespace-pre-line' : ''
          }`}
        >
          {consentText}
        </div>
      )}

      <p className='font-medium'>{fill(lb.requesting, { app: app.name })}</p>
      {permissions.length === 0
        ? <p className='mt-2 italic text-gray-500 dark:text-gray-400'>{lb.noPermissions}</p>
        : (
          <ul className='mt-3 space-y-2'>
            {permissions.map((p, i) => (
              <li key={`${p.streamId}-${i}`} className='flex items-start gap-3 rounded-lg border border-gray-200 px-3 py-2.5 dark:border-gray-700'>
                {selectable && (
                  <input
                    type='checkbox'
                    className='mt-0.5'
                    checked={granted.has(permissionId(p))}
                    disabled={isBusy || mandatory.has(permissionId(p))}
                    aria-label={p.name ?? p.defaultName ?? p.streamId}
                    onChange={() => toggle(permissionId(p))}
                  />
                )}
                <LevelIcon level={p.level} />
                <div className='flex-1 leading-snug'>
                  <span className='text-gray-500 dark:text-gray-400'>{levelLabel(p.level)}</span>{' '}
                  <span className='break-all font-semibold'>
                    {p.streamId === '*' ? lb.streamAll : (p.name ?? p.defaultName ?? p.streamId)}
                  </span>
                  {selectable && mandatory.has(permissionId(p)) && (
                    <span className='ml-2 text-xs text-gray-500 dark:text-gray-400'>{lb.required}</span>
                  )}
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
          onClick={acceptSelection}
          disabled={isBusy || (selectable && granted.size === 0)}
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
